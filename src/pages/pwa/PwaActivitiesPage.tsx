import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { differenceInCalendarDays, endOfDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
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
  normalizeDailyHabitTargets,
  sumDailyHabitTargets,
} from '../../utils/dailyHabitTargets';

type DailyTargetInfo = {
  target: ReturnType<typeof normalizeDailyHabitTargets>;
  remaining: ReturnType<typeof normalizeDailyHabitTargets>;
  remainingAfterDismissals: ReturnType<typeof normalizeDailyHabitTargets>;
  totalTarget: number;
  totalRemaining: number;
  totalRemainingAfterDismissals: number;
};

type ActivityLogFormProps = {
  activity: Activity;
  onAddLog: (values: {
    activityId: string;
    timestamp: string;
    timeSlot?: 'morning' | 'day' | 'evening';
    note?: string;
    attributes?: LogAttributeValue[];
  }) => Promise<void>;
  onClose: () => void;
  logs: LogEntry[];
};

const ActivityLogForm = ({ activity, onAddLog, onClose, logs }: ActivityLogFormProps) => {
  const firefox = isFirefox();
  const initialDate = currentLocalDate();
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [timeSlot, setTimeSlot] = useState<'morning' | 'day' | 'evening'>('morning');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (!date) {
        throw new Error('Bitte Datum und Tageszeit auswählen.');
      }

      await onAddLog({
        activityId: activity.id,
        timestamp: dateToISODate(date),
        timeSlot,
        note: note.trim() ? note.trim() : undefined,
      });
      const resetDate = currentLocalDate();
      setDate(resetDate);
      if (firefox) {
        setFirefoxDateInput(formatDateForDisplay(resetDate));
      }
      setTimeSlot('morning');
      setNote('');
      setError(null);
      onClose();
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
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          <span className="font-medium text-slate-100">Tageszeit</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value as 'morning' | 'day' | 'evening')}
            required
          >
            <option value="morning">Morgens</option>
            <option value="day">Mittags</option>
            <option value="evening">Abends</option>
          </select>
        </label>
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
          {isSaving ? 'Speichern …' : 'Speichern'}
        </Button>
      </div>
    </form>
  );
};

const DISMISS_NOTE_PREFIX = '__DISMISS__:';
const isDismissalLog = (log: LogEntry) =>
  (log.note ?? '').startsWith(DISMISS_NOTE_PREFIX) &&
  ['morning', 'day', 'evening'].some((slot) => log.note === `${DISMISS_NOTE_PREFIX}${slot}`);

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
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      });
    });

    return targets;
  }, [dismissalsForToday, state.activities, state.logs]);

  const { dailyHabits, regularActivities } = useMemo(() => {
    const dailyHabitIds = new Set<string>();
    const daily = activities.filter((activity) => {
      const target = dailyTargets.get(activity.id);
      const isDaily = (target?.totalTarget ?? 0) > 0 && (target?.totalRemaining ?? 0) > 0;
      if (isDaily) {
        dailyHabitIds.add(activity.id);
      }
      return isDaily;
    });

    const regular = activities.filter((activity) => !dailyHabitIds.has(activity.id));

    return { dailyHabits: daily, regularActivities: regular };
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

  const morningHabits = dailyHabits.filter(
    (activity) => (dailyTargets.get(activity.id)?.remainingAfterDismissals.morning ?? 0) > 0,
  );
  const dayHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remainingAfterDismissals.day ?? 0) > 0);
  const eveningHabits = dailyHabits.filter(
    (activity) => (dailyTargets.get(activity.id)?.remainingAfterDismissals.evening ?? 0) > 0,
  );

  const formatLastLogLabel = (lastLog: Date | null) => {
    if (!lastLog) return 'Noch kein Log';

    const daysAgo = differenceInCalendarDays(startOfDay(new Date()), startOfDay(lastLog));

    if (daysAgo === 0) return 'Heute';
    if (daysAgo === 1) return 'Gestern';
    if (daysAgo === 2) return 'Vor 2 Tagen';
    return 'Längere Pause';
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

  const handleAddLog = async (values: { activityId: string; timestamp: string; note?: string; attributes?: LogAttributeValue[] }) => {
    setActionError(null);
    try {
      await addLog(values);
    } catch (apiError) {
      console.error('PWA: Log konnte nicht gespeichert werden', apiError);
      setActionError('Speichern nicht möglich – bitte stelle die Verbindung zum Backend sicher.');
      throw apiError;
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-300">Lade Aktivitäten …</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Aktivitäten vorhanden.</p>
      ) : (
        <div className="space-y-6">
          {!!dailyHabits.length && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Daily Habits</h2>
              {[
                { key: 'morning' as const, title: 'Morgens', activities: morningHabits },
                { key: 'day' as const, title: 'Tag', activities: dayHabits },
                { key: 'evening' as const, title: 'Abend', activities: eveningHabits },
              ]
                .filter((section) => section.activities.length > 0)
                .map((section) => (
                  <div key={section.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-200">{section.title}</h3>
                      <span className="text-xs text-slate-400">
                        {section.activities.length} Habit{section.activities.length === 1 ? '' : 's'} offen
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {section.activities.map((activity) => {
                        const dailyTarget = dailyTargets.get(activity.id);
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
                                    {activity.categories.some((category) => {
                                      const normalized = category.toLowerCase();
                                      return normalized.includes('gesundheit') || normalized.includes('achtsamkeit');
                                    }) && (
                                      <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                                        {formatLastLogLabel(activityStats.get(activity.id)?.lastLog ?? null)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                      Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                                    </span>
                                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                      7 Tage Streak: {activityStats.get(activity.id)?.weekCount ?? 0}
                                    </span>
                                  </div>
                                  {dailyTarget && (
                                    <div className="space-y-1 text-[11px] font-semibold">
                                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                                        {dailyTarget.target.morning > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Morgens: {dailyTarget.remainingAfterDismissals.morning}/{dailyTarget.target.morning}
                                          </span>
                                        )}
                                        {dailyTarget.target.day > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Tag: {dailyTarget.remainingAfterDismissals.day}/{dailyTarget.target.day}
                                          </span>
                                        )}
                                        {dailyTarget.target.evening > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Abend: {dailyTarget.remainingAfterDismissals.evening}/{dailyTarget.target.evening}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {activity.categories?.length ? (
                                    <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                                      {activity.categories.map((category) => (
                                        <span key={category} className="rounded-full bg-slate-800 px-2 py-0.5">
                                          {category}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] uppercase tracking-wide text-slate-500">Keine Kategorien</span>
                                  )}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDismissHabit(activity.id, section.key)}
                                className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                              >
                                Pausieren
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Flex Habits</h2>
              <p className="text-sm text-slate-400">Alle flexiblen Habits auf einen Blick.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {regularActivities.map((activity) => {
                const dailyTarget = dailyTargets.get(activity.id);
                return (
                  <div key={activity.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
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
                          {activity.categories.some((category) => {
                            const normalized = category.toLowerCase();
                            return normalized.includes('gesundheit') || normalized.includes('achtsamkeit');
                          }) && (
                            <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                              {formatLastLogLabel(activityStats.get(activity.id)?.lastLog ?? null)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                            Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                            7 Tage Streak: {activityStats.get(activity.id)?.weekCount ?? 0}
                          </span>
                        </div>
                        {dailyTarget && (
                          <div className="space-y-1 text-[11px] font-semibold">
                            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                              {dailyTarget.target.morning > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Morgens: {dailyTarget.remainingAfterDismissals.morning}/{dailyTarget.target.morning}
                                </span>
                              )}
                              {dailyTarget.target.day > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Tag: {dailyTarget.remainingAfterDismissals.day}/{dailyTarget.target.day}
                                </span>
                              )}
                              {dailyTarget.target.evening > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Abend: {dailyTarget.remainingAfterDismissals.evening}/{dailyTarget.target.evening}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {activity.categories?.length ? (
                          <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            {activity.categories.map((category) => (
                              <span key={category} className="rounded-full bg-slate-800 px-2 py-0.5">
                                {category}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Keine Kategorien</span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
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
                  onAddLog={handleAddLog}
                  onClose={() => setSelectedActivity(null)}
                  logs={state.logs}
                />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default PwaActivitiesPage;
