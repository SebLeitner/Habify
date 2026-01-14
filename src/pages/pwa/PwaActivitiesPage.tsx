import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, endOfDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import WeeklyActivityOverview from '../../components/Log/WeeklyActivityOverview';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import TextArea from '../../components/UI/TextArea';
import { Activity, type LogEntry, useData } from '../../contexts/DataContext';
import type { DailyHabitTargets, LogAttributeValue } from '../../types';
import { currentLocalDate, dateToISODate, formatDateForDisplay, parseDisplayDateToISO } from '../../utils/datetime';
import { isFirefox } from '../../utils/browser';
import {
  calculateRemainingTargets,
  defaultDailyHabitTargets,
  formatTimeSlotBadgeValues,
  normalizeDailyHabitTargets,
  sumDailyHabitTargets,
} from '../../utils/dailyHabitTargets';
import { DISMISS_NOTE_PREFIX, isDismissalLog } from '../../utils/logs';
import MindfulnessOfDayCard from '../../components/Mindfulness/MindfulnessOfDayCard';
import { selectMindfulnessOfDay } from '../../utils/mindfulness';

type DailyTargetInfo = {
  target: ReturnType<typeof normalizeDailyHabitTargets>;
  remaining: ReturnType<typeof normalizeDailyHabitTargets>;
  remainingAfterDismissals: ReturnType<typeof normalizeDailyHabitTargets>;
  totalTarget: number;
  totalRemaining: number;
  totalRemainingAfterDismissals: number;
  loggedToday: number;
};

type ActivityLogFormProps = {
  activity: Activity;
  onContinue: (values: { timestamp: string; note?: string }) => void;
  onClose: () => void;
  logs: LogEntry[];
};

const getRecencyBadgeLabel = (lastLog: Date | null): string => {
  if (!lastLog) return 'X';

  const daysSinceLastLog = differenceInCalendarDays(startOfDay(new Date()), startOfDay(lastLog));

  if (daysSinceLastLog === 0) return 'HEUTE';
  if (daysSinceLastLog === 1) return 'GESTERN';
  if (daysSinceLastLog === 2) return '2 TAGE';
  if (daysSinceLastLog === 3) return '3 TAGE';
  return 'X';
};

const ActivityLogForm = ({ activity, onContinue, onClose, logs }: ActivityLogFormProps) => {
  const firefox = isFirefox();
  const initialDate = currentLocalDate();
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (!date) {
        throw new Error('Bitte Datum auswählen.');
      }

      onContinue({
        timestamp: dateToISODate(date),
        note: note.trim() ? note.trim() : undefined,
      });
      const resetDate = currentLocalDate();
      setDate(resetDate);
      if (firefox) {
        setFirefoxDateInput(formatDateForDisplay(resetDate));
      }
      setNote('');
      setError(null);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Speichern nicht möglich – Verbindung zum Backend erforderlich.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Datum"
          type={firefox ? 'text' : 'date'}
          lang="de-DE"
          inputMode="numeric"
          placeholder={firefox ? 'TT.MM.JJJJ' : undefined}
          pattern={firefox ? '\\d{2}\\.\\d{2}\\.\\d{4}' : undefined}
          value={firefox ? firefoxDateInput : date}
          onChange={(event) => {
            const { value } = event.target;
            if (firefox) {
              setFirefoxDateInput(value);
              const parsed = parseDisplayDateToISO(value);
              setDate(parsed);
              return;
            }
            setDate(value);
          }}
          required
        />
      </div>
      <WeeklyActivityOverview activityId={activity.id} logs={logs} />
      <TextArea
        label="Notiz"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional"
        className="min-h-[96px]"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          onClick={onClose}
        >
          Abbrechen
        </button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Weiter …' : 'Weiter'}
        </Button>
      </div>
    </form>
  );
};

const extractDismissalsForToday = (logs: LogEntry[]) => {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const dismissals = new Map<string, DailyHabitTargets>();

  logs.forEach((log) => {
    if (!isDismissalLog(log)) return;

    const timestamp = new Date(log.timestamp);
    if (!isWithinInterval(timestamp, { start: todayStart, end: todayEnd })) return;

    const slot = (log.note ?? '').replace(DISMISS_NOTE_PREFIX, '') as keyof DailyHabitTargets;
    const current = dismissals.get(log.activityId) ?? { ...defaultDailyHabitTargets };
    dismissals.set(log.activityId, {
      ...current,
      [slot]: (current[slot] ?? 0) + 1,
    });
  });

  return dismissals;
};

const PwaActivitiesPage = () => {
  const { state, addLog, isLoading, error } = useData();
  const [searchParams] = useSearchParams();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingLog, setPendingLog] = useState<{
    activity: Activity;
    timestamp: string;
    note?: string;
  } | null>(null);
  const [isTimeSlotSaving, setIsTimeSlotSaving] = useState(false);
  const [isMindfulnessDialogOpen, setIsMindfulnessDialogOpen] = useState(false);
  const [mindfulnessError, setMindfulnessError] = useState<string | null>(null);
  const [isLoggingMindfulness, setIsLoggingMindfulness] = useState(false);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const mindfulnessOfDay = useMemo(
    () => selectMindfulnessOfDay(state.mindfulness, todayStart),
    [state.mindfulness, todayStart],
  );

  const mindfulnessActivityId = useMemo(
    () => (mindfulnessOfDay ? `mindfulness-${mindfulnessOfDay.id}` : null),
    [mindfulnessOfDay],
  );

  const hasLoggedMindfulnessToday = useMemo(() => {
    if (!mindfulnessOfDay) return false;

    return state.logs.some(
      (log) =>
        (log.mindfulnessId === mindfulnessOfDay.id || log.activityId === mindfulnessActivityId) &&
        isWithinInterval(new Date(log.timestamp), { start: todayStart, end: todayEnd }),
    );
  }, [mindfulnessActivityId, mindfulnessOfDay, state.logs, todayEnd, todayStart]);

  useEffect(() => {
    if (!mindfulnessOfDay) {
      console.debug('[Mindfulness Debug] keine Achtsamkeit des Tages gesetzt (PWA)', {
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
      });
      return;
    }

    const matchingLogs = state.logs
      .filter((log) => log.mindfulnessId === mindfulnessOfDay.id || log.activityId === mindfulnessActivityId)
      .map((log) => {
        const parsedTimestamp = new Date(log.timestamp);
        return {
          id: log.id,
          timestamp: log.timestamp,
          parsedTimestamp: parsedTimestamp.toISOString(),
          inTodayRange: isWithinInterval(parsedTimestamp, { start: todayStart, end: todayEnd }),
        };
      });

    console.debug('[Mindfulness Debug] hasLoggedMindfulnessToday Check (PWA)', {
      mindfulnessId: mindfulnessOfDay.id,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      hasLoggedMindfulnessToday,
      matchingLogs,
    });
  }, [hasLoggedMindfulnessToday, mindfulnessActivityId, mindfulnessOfDay, state.logs, todayEnd, todayStart]);

  const dismissalsForToday = useMemo(() => extractDismissalsForToday(state.logs), [state.logs]);

  const activities = useMemo(
    () => state.activities.filter((activity) => activity.active).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [state.activities],
  );

  const dailyTargets = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayLogs = new Map<string, DailyHabitTargets & { unslotted: number }>();
    state.logs.forEach((log) => {
      const timestamp = new Date(log.timestamp);
      if (isWithinInterval(timestamp, { start: todayStart, end: todayEnd }) && !isDismissalLog(log)) {
        const current =
          todayLogs.get(log.activityId) ?? { ...defaultDailyHabitTargets, unslotted: 0 };
        const slot = log.timeSlot;

        if (slot && ['morning', 'day', 'evening'].includes(slot)) {
          current[slot as keyof DailyHabitTargets] += 1;
        } else {
          current.unslotted += 1;
        }

        todayLogs.set(log.activityId, current);
      }
    });

    const targets = new Map<string, DailyTargetInfo>();
    state.activities.forEach((activity) => {
      const target = normalizeDailyHabitTargets(activity.minLogsPerDay);
      const totalTarget = sumDailyHabitTargets(target);
      if (totalTarget <= 0) return;

      const loggedToday = todayLogs.get(activity.id) ?? { ...defaultDailyHabitTargets, unslotted: 0 };
      const remainingAfterSlotted: DailyHabitTargets = {
        morning: Math.max(target.morning - loggedToday.morning, 0),
        day: Math.max(target.day - loggedToday.day, 0),
        evening: Math.max(target.evening - loggedToday.evening, 0),
      };
      const remaining = calculateRemainingTargets(remainingAfterSlotted, loggedToday.unslotted);
      const dismissed = dismissalsForToday.get(activity.id) ?? defaultDailyHabitTargets;
      const remainingAfterDismissals: DailyHabitTargets = {
        morning: Math.max(remaining.morning - dismissed.morning, 0),
        day: Math.max(remaining.day - dismissed.day, 0),
        evening: Math.max(remaining.evening - dismissed.evening, 0),
      };

      targets.set(activity.id, {
        target,
        remaining,
        remainingAfterDismissals,
        totalTarget,
        totalRemaining: sumDailyHabitTargets(remaining),
        totalRemainingAfterDismissals: sumDailyHabitTargets(remainingAfterDismissals),
        loggedToday: loggedToday.morning + loggedToday.day + loggedToday.evening + loggedToday.unslotted,
      });
    });

    return targets;
  }, [dismissalsForToday, state.activities, state.logs]);

  const { dailyHabits, dailyConfiguredHabits, regularActivities } = useMemo(() => {
    const dailyHabitIds = new Set<string>();
    const dailyConfigured = activities.filter((activity) => {
      const target = dailyTargets.get(activity.id);
      const isDaily = (target?.totalTarget ?? 0) > 0;
      if (!isDaily) return false;

      dailyHabitIds.add(activity.id);
      return true;
    });

    const regular = activities.filter((activity) => !dailyHabitIds.has(activity.id));
    const dailyDue = dailyConfigured.filter((activity) => {
      const target = dailyTargets.get(activity.id);
      return (target?.totalRemainingAfterDismissals ?? target?.totalRemaining ?? 0) > 0;
    });

    return { dailyHabits: dailyDue, dailyConfiguredHabits: dailyConfigured, regularActivities: regular };
  }, [activities, dailyTargets]);

  const activityStats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const weekStart = startOfDay(subDays(todayStart, 6));

    const stats = new Map<string, { lastLog: Date | null; todayCount: number; weekCount: number }>();

    state.logs.forEach((log) => {
      if (isDismissalLog(log)) return;

      const timestamp = new Date(log.timestamp);
      const current = stats.get(log.activityId) ?? { lastLog: null, todayCount: 0, weekCount: 0 };

      const lastLog = !current.lastLog || timestamp > current.lastLog ? timestamp : current.lastLog;
      const todayCount =
        current.todayCount + (isWithinInterval(timestamp, { start: todayStart, end: todayEnd }) ? 1 : 0);
      const weekCount =
        current.weekCount + (isWithinInterval(timestamp, { start: weekStart, end: todayEnd }) ? 1 : 0);

      stats.set(log.activityId, { lastLog, todayCount, weekCount });
    });

    return stats;
  }, [state.logs]);

  const isDailyView = searchParams.get('view') === 'daily';
  const dailyActivitiesForView = isDailyView ? dailyConfiguredHabits : dailyHabits;

  const getNextDismissSlot = (activityId: string) => {
    const remaining = dailyTargets.get(activityId)?.remainingAfterDismissals;
    if (!remaining) return null;
    if (remaining.morning > 0) return 'morning';
    if (remaining.day > 0) return 'day';
    if (remaining.evening > 0) return 'evening';
    return null;
  };

  const handleLogMindfulness = async () => {
    if (!mindfulnessOfDay) return;
    setMindfulnessError(null);
    setIsLoggingMindfulness(true);
    try {
      await addLog({
        activityId: `mindfulness-${mindfulnessOfDay.id}`,
        timestamp: new Date().toISOString(),
        mindfulnessId: mindfulnessOfDay.id,
        mindfulnessTitle: mindfulnessOfDay.title,
      });
      setIsMindfulnessDialogOpen(false);
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Achtsamkeit konnte nicht gespeichert werden.';
      setMindfulnessError(message);
    } finally {
      setIsLoggingMindfulness(false);
    }
  };

  const handleDismissHabit = (activityId: string, slot: keyof DailyHabitTargets) => {
    const target = dailyTargets.get(activityId);
    const remainingInSlot = target?.remainingAfterDismissals[slot] ?? 0;
    if (!target || remainingInSlot <= 0) return;

    setActionError(null);
    addLog({
      activityId,
      timestamp: new Date().toISOString(),
      note: `${DISMISS_NOTE_PREFIX}${slot}`,
    }).catch((apiError) => {
      console.error('PWA: Daily Habit konnte nicht verworfen werden', apiError);
      setActionError('Dismiss fehlgeschlagen – bitte Verbindung zum Backend prüfen.');
    });
  };

  const handleAddLog = async (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    timeSlot?: 'morning' | 'day' | 'evening';
    attributes?: LogAttributeValue[];
  }) => {
    setActionError(null);
    try {
      await addLog(values);
    } catch (apiError) {
      console.error('PWA: Log konnte nicht gespeichert werden', apiError);
      setActionError('Speichern nicht möglich – bitte stelle die Verbindung zum Backend sicher.');
      throw apiError;
    }
  };

  const handleLogFormContinue = (values: { timestamp: string; note?: string }) => {
    if (!selectedActivity) return;
    setPendingLog({
      activity: selectedActivity,
      timestamp: values.timestamp,
      note: values.note,
    });
    setSelectedActivity(null);
  };

  const handleLogWithTimeSlot = async (slot: 'morning' | 'day' | 'evening') => {
    if (!pendingLog) return;
    setIsTimeSlotSaving(true);
    try {
      await handleAddLog({
        activityId: pendingLog.activity.id,
        timestamp: pendingLog.timestamp,
        note: pendingLog.note,
        timeSlot: slot,
      });
      setPendingLog(null);
    } catch (apiError) {
      console.error('PWA: Log konnte nicht mit Tageszeit gespeichert werden', apiError);
    } finally {
      setIsTimeSlotSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasLoggedMindfulnessToday && mindfulnessOfDay && (
        <MindfulnessOfDayCard
          entry={mindfulnessOfDay}
          open={isMindfulnessDialogOpen}
          onOpenChange={setIsMindfulnessDialogOpen}
          onLog={handleLogMindfulness}
          isLogging={isLoggingMindfulness}
          error={mindfulnessError}
        />
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-300">Lade Aktivitäten …</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Aktivitäten vorhanden.</p>
      ) : (
        <div className="space-y-6">
          {!!dailyActivitiesForView.length && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {isDailyView ? 'Daily' : 'Daily Habits'}
                </h2>
                <span className="text-xs text-slate-400">
                  {dailyActivitiesForView.length} Aktivität{dailyActivitiesForView.length === 1 ? '' : 'en'}
                  {!isDailyView ? ' offen' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dailyActivitiesForView.map((activity) => {
                  const dailyTarget = dailyTargets.get(activity.id);
                  const timeSlotBadgeValues = dailyTarget
                    ? formatTimeSlotBadgeValues(dailyTarget.target, dailyTarget.remainingAfterDismissals)
                    : null;
                  const dismissSlot = getNextDismissSlot(activity.id);
                  const isDismissDisabled = !dismissSlot;
                  return (
                    <div
                      key={activity.id}
                      className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner"
                    >
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedActivity(activity)}
                          className="flex w-full items-start gap-3 text-left transition hover:text-white"
                        >
                          <span
                            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                            style={{ backgroundColor: `${activity.color}33` }}
                          >
                            {activity.icon}
                          </span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-white">{activity.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                              </span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                7 Tage Streak: {activityStats.get(activity.id)?.weekCount ?? 0}
                              </span>
                            </div>
                            {dailyTarget && timeSlotBadgeValues && (
                              <div className="space-y-1 text-[11px] font-semibold">
                                <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                                  <span
                                    className="rounded-full bg-slate-800 px-2 py-0.5"
                                    aria-label={`Morgens: ${timeSlotBadgeValues[0]}, Mittags/Nachmittags: ${timeSlotBadgeValues[1]}, Abends: ${timeSlotBadgeValues[2]}`}
                                  >
                                    {timeSlotBadgeValues.join(' ')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="flex flex-col items-center gap-1">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                            {getRecencyBadgeLabel(activityStats.get(activity.id)?.lastLog ?? null)}
                          </span>
                          <button
                            type="button"
                            onClick={() => dismissSlot && handleDismissHabit(activity.id, dismissSlot)}
                            className={[
                              'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                              isDismissDisabled
                                ? 'cursor-not-allowed border-slate-900 text-slate-500'
                                : 'border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white',
                            ].join(' ')}
                            disabled={isDismissDisabled}
                          >
                            Pausieren
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!dailyActivitiesForView.length && isDailyView && (
            <p className="text-sm text-slate-400">Keine Daily-Aktivitäten vorhanden.</p>
          )}

          {!isDailyView && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Flex Habits</h2>
                <p className="text-sm text-slate-400">Alle flexiblen Habits auf einen Blick.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {regularActivities.map((activity) => {
                  const dailyTarget = dailyTargets.get(activity.id);
                  const timeSlotBadgeValues = dailyTarget
                    ? formatTimeSlotBadgeValues(dailyTarget.target, dailyTarget.remainingAfterDismissals)
                    : null;
                  return (
                    <div
                      key={activity.id}
                      className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedActivity(activity)}
                        className="flex w-full items-start gap-3 text-left transition hover:text-white"
                      >
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                          style={{ backgroundColor: `${activity.color}33` }}
                        >
                          {activity.icon}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-white">{activity.name}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                            <span className="rounded-full bg-slate-800 px-2 py-0.5">
                              Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                            </span>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5">
                              7 Tage Streak: {activityStats.get(activity.id)?.weekCount ?? 0}
                            </span>
                          </div>
                          {dailyTarget && timeSlotBadgeValues && (
                            <div className="space-y-1 text-[11px] font-semibold">
                              <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                                <span
                                  className="rounded-full bg-slate-800 px-2 py-0.5"
                                  aria-label={`Morgens: ${timeSlotBadgeValues[0]}, Mittags/Nachmittags: ${timeSlotBadgeValues[1]}, Abends: ${timeSlotBadgeValues[2]}`}
                                >
                                  {timeSlotBadgeValues.join(' ')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog.Root open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl focus:outline-none">
            {selectedActivity && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                    style={{ backgroundColor: `${selectedActivity.color}33` }}
                  >
                    {selectedActivity.icon}
                  </span>
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-white">{selectedActivity.name}</Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="ml-auto rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                      ✕
                    </button>
                  </Dialog.Close>
                </div>
                <ActivityLogForm
                  activity={selectedActivity}
                  onContinue={handleLogFormContinue}
                  onClose={() => setSelectedActivity(null)}
                  logs={state.logs}
                />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={!!pendingLog}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLog(null);
            setIsTimeSlotSaving(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl focus:outline-none">
            {pendingLog && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                    style={{ backgroundColor: `${pendingLog.activity.color}33` }}
                  >
                    {pendingLog.activity.icon}
                  </span>
                  <div className="space-y-1">
                    <Dialog.Title className="text-lg font-semibold text-white">{pendingLog.activity.name}</Dialog.Title>
                    <Dialog.Description className="text-sm text-slate-400">
                      Wähle die Tageszeit, um den Eintrag zu speichern.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="ml-auto rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                      ✕
                    </button>
                  </Dialog.Close>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { key: 'morning', label: 'Morgens' },
                    { key: 'day', label: 'Mittags / Nachmittags' },
                    { key: 'evening', label: 'Abends' },
                  ].map((slot) => (
                    <Button
                      key={slot.key}
                      type="button"
                      className="w-full justify-center"
                      disabled={isTimeSlotSaving}
                      onClick={() => handleLogWithTimeSlot(slot.key as 'morning' | 'day' | 'evening')}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
                {isTimeSlotSaving && (
                  <p className="text-center text-sm text-slate-400">Speichere Eintrag …</p>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default PwaActivitiesPage;
