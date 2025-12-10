import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { differenceInCalendarDays, endOfDay, isWithinInterval, startOfDay, subDays } from 'date-fns';
import AttributeValuesForm from '../../components/Log/AttributeValuesForm';
import WeeklyActivityOverview from '../../components/Log/WeeklyActivityOverview';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import TextArea from '../../components/UI/TextArea';
import { Activity, type LogEntry, useData } from '../../contexts/DataContext';
import type { LogAttributeValue } from '../../types';
import {
  combineDateAndTimeToISO,
  currentLocalDate,
  currentLocalTime,
  formatDateForDisplay,
  parseDisplayDateToISO,
  parseDisplayTimeToISO,
} from '../../utils/datetime';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';
import { isFirefox } from '../../utils/browser';
import { calculateRemainingTargets, normalizeDailyHabitTargets, sumDailyHabitTargets } from '../../utils/dailyHabitTargets';

type DailyTargetInfo = {
  target: ReturnType<typeof normalizeDailyHabitTargets>;
  remaining: ReturnType<typeof normalizeDailyHabitTargets>;
  totalTarget: number;
  totalRemaining: number;
};

type ActivityLogFormProps = {
  activity: Activity;
  onAddLog: (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    attributes?: LogAttributeValue[];
  }) => Promise<void>;
  onClose: () => void;
  logs: LogEntry[];
};

const ActivityLogForm = ({ activity, onAddLog, onClose, logs }: ActivityLogFormProps) => {
  const firefox = isFirefox();
  const initialDate = currentLocalDate();
  const initialTime = currentLocalTime();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [firefoxTimeInput, setFirefoxTimeInput] = useState(() => (firefox ? initialTime : ''));
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AttributeValueDraft[]>(() => emptyDrafts(activity.attributes));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const attributeValues = serializeDrafts(drafts);
      if (!date || !time) {
        throw new Error('Bitte Datum und Uhrzeit auswählen.');
      }

      await onAddLog({
        activityId: activity.id,
        timestamp: combineDateAndTimeToISO(date, time),
        note: note.trim() ? note.trim() : undefined,
        attributes: attributeValues.length ? attributeValues : undefined,
      });
      const resetDate = currentLocalDate();
      const resetTime = currentLocalTime();
      setDate(resetDate);
      setTime(resetTime);
      if (firefox) {
        setFirefoxDateInput(formatDateForDisplay(resetDate));
        setFirefoxTimeInput(resetTime);
      }
      setDrafts(toDrafts(activity.attributes));
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
        <Input
          label="Uhrzeit"
          type={firefox ? 'text' : 'time'}
          lang="de-DE"
          inputMode="numeric"
          placeholder={firefox ? 'HH:MM' : undefined}
          pattern={firefox ? '([01]\\d|2[0-3]):([0-5]\\d)' : undefined}
          value={firefox ? firefoxTimeInput : time}
          onChange={(event) => {
            const { value } = event.target;
            if (firefox) {
              setFirefoxTimeInput(value);
              const parsed = parseDisplayTimeToISO(value);
              setTime(parsed);
              return;
            }
            setTime(value);
          }}
          required
        />
      </div>
      <WeeklyActivityOverview activityId={activity.id} logs={logs} />
      <AttributeValuesForm attributes={activity.attributes} drafts={drafts} onChange={setDrafts} />
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

const PwaActivitiesPage = () => {
  const { state, addLog, isLoading, error } = useData();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activities = useMemo(
    () => state.activities.filter((activity) => activity.active).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [state.activities],
  );

  const dailyTargets = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayLogs = new Map<string, number>();
    state.logs.forEach((log) => {
      const timestamp = new Date(log.timestamp);
      if (isWithinInterval(timestamp, { start: todayStart, end: todayEnd })) {
        todayLogs.set(log.activityId, (todayLogs.get(log.activityId) ?? 0) + 1);
      }
    });

    const targets = new Map<string, DailyTargetInfo>();
    state.activities.forEach((activity) => {
      const target = normalizeDailyHabitTargets(activity.minLogsPerDay);
      const totalTarget = sumDailyHabitTargets(target);
      if (totalTarget <= 0) return;
      const loggedToday = todayLogs.get(activity.id) ?? 0;
      const remaining = calculateRemainingTargets(target, loggedToday);
      targets.set(activity.id, {
        target,
        remaining,
        totalTarget,
        totalRemaining: sumDailyHabitTargets(remaining),
      });
    });

    return targets;
  }, [state.activities, state.logs]);

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

  const morningHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.morning ?? 0) > 0);
  const dayHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.day ?? 0) > 0);
  const eveningHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.evening ?? 0) > 0);

  const formatLastLogLabel = (lastLog: Date | null) => {
    if (!lastLog) return 'Noch kein Log';

    const daysAgo = differenceInCalendarDays(startOfDay(new Date()), startOfDay(lastLog));

    if (daysAgo === 0) return 'Heute';
    if (daysAgo === 1) return 'Gestern';
    if (daysAgo === 2) return 'Vor 2 Tagen';
    return 'Längere Pause';
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

  const handleDismissDailyHabit = async (activity: Activity, timeframeLabel: string) => {
    setActionError(null);
    try {
      await addLog({
        activityId: activity.id,
        timestamp: combineDateAndTimeToISO(currentLocalDate(), currentLocalTime()),
        note: `Nicht erfüllt (${timeframeLabel})`,
      });
    } catch (apiError) {
      console.error('PWA: Daily Habit konnte nicht verworfen werden', apiError);
      setActionError('Speichern nicht möglich – bitte stelle die Verbindung zum Backend sicher.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
          <h1 className="text-xl font-semibold text-white">Aktivitäten</h1>
          <p className="text-sm text-slate-400">Tippe eine Aktivität an, um schnell einen Eintrag zu erstellen.</p>
        </div>
      </div>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Daily Habits</h2>
                <p className="text-sm text-slate-400">Morgens, tagsüber und abends abhaken.</p>
              </div>
              {[{ key: 'morning', title: 'Morgens', activities: morningHabits }, { key: 'day', title: 'Tag', activities: dayHabits }, { key: 'evening', title: 'Abend', activities: eveningHabits }]
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
                                  <p className="text-xs text-slate-400">Tippen zum Eintragen</p>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                      Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                                    </span>
                                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                      Letzte 7 Tage: {activityStats.get(activity.id)?.weekCount ?? 0}
                                    </span>
                                  </div>
                                  {dailyTarget && (
                                    <div className="space-y-1 text-[11px] font-semibold">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-200">Daily Habit</span>
                                        <span
                                          className={`rounded-full px-2 py-1 ${
                                            dailyTarget.totalRemaining > 0
                                              ? 'bg-slate-800 text-slate-100'
                                              : 'bg-emerald-600/20 text-emerald-200'
                                          }`}
                                        >
                                          {dailyTarget.totalRemaining > 0
                                            ? `Heute noch ${dailyTarget.totalRemaining} von ${dailyTarget.totalTarget}`
                                            : 'Tagesziel erreicht'}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                                        {dailyTarget.target.morning > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Morgens: {dailyTarget.remaining.morning}/{dailyTarget.target.morning}
                                          </span>
                                        )}
                                        {dailyTarget.target.day > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Tag: {dailyTarget.remaining.day}/{dailyTarget.target.day}
                                          </span>
                                        )}
                                        {dailyTarget.target.evening > 0 && (
                                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                            Abend: {dailyTarget.remaining.evening}/{dailyTarget.target.evening}
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
                                onClick={() => handleDismissDailyHabit(activity, section.title)}
                                className="self-start rounded-lg border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
                              >
                                Dismiss
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
              <h2 className="text-lg font-semibold text-white">Aktivitäten</h2>
              <p className="text-sm text-slate-400">Alle aktiven Aktivitäten auf einen Blick.</p>
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
                        <p className="text-xs text-slate-400">Tippen zum Eintragen</p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                            Heute: {activityStats.get(activity.id)?.todayCount ?? 0}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5">
                            Letzte 7 Tage: {activityStats.get(activity.id)?.weekCount ?? 0}
                          </span>
                        </div>
                        {dailyTarget && (
                          <div className="space-y-1 text-[11px] font-semibold">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-200">Daily Habit</span>
                              <span
                                className={`rounded-full px-2 py-1 ${
                                  dailyTarget.totalRemaining > 0
                                    ? 'bg-slate-800 text-slate-100'
                                    : 'bg-emerald-600/20 text-emerald-200'
                                }`}
                              >
                                {dailyTarget.totalRemaining > 0
                                  ? `Heute noch ${dailyTarget.totalRemaining} von ${dailyTarget.totalTarget}`
                                  : 'Tagesziel erreicht'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                              {dailyTarget.target.morning > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Morgens: {dailyTarget.remaining.morning}/{dailyTarget.target.morning}
                                </span>
                              )}
                              {dailyTarget.target.day > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Tag: {dailyTarget.remaining.day}/{dailyTarget.target.day}
                                </span>
                              )}
                              {dailyTarget.target.evening > 0 && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                  Abend: {dailyTarget.remaining.evening}/{dailyTarget.target.evening}
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
                    <Dialog.Description className="text-sm text-slate-400">
                      Schneller Eintrag – direkte Verbindung zum Backend erforderlich.
                    </Dialog.Description>
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
