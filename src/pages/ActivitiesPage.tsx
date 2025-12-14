import { useMemo, useState } from 'react';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import ActivityQuickLogList from '../components/Activity/ActivityQuickLogList';
import Spinner from '../components/UI/Spinner';
import { useData } from '../contexts/DataContext';
import {
  calculateRemainingTargets,
  normalizeDailyHabitTargets,
  sumDailyHabitTargets,
} from '../utils/dailyHabitTargets';
import MindfulnessOfDayCard from '../components/Mindfulness/MindfulnessOfDayCard';
import { selectMindfulnessOfDay } from '../utils/mindfulness';

type DailyTargetInfo = {
  target: ReturnType<typeof normalizeDailyHabitTargets>;
  remaining: ReturnType<typeof normalizeDailyHabitTargets>;
  totalTarget: number;
  totalRemaining: number;
  loggedToday: number;
};

const ActivitiesPage = () => {
  const { state, addLog, isLoading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMindfulnessDialogOpen, setIsMindfulnessDialogOpen] = useState(false);
  const [mindfulnessError, setMindfulnessError] = useState<string | null>(null);
  const [isLoggingMindfulness, setIsLoggingMindfulness] = useState(false);

  const dailyTargets = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayLogs = new Map<string, ReturnType<typeof normalizeDailyHabitTargets> & { unslotted: number }>();
    state.logs.forEach((log) => {
      const timestamp = new Date(log.timestamp);
      if (isWithinInterval(timestamp, { start: todayStart, end: todayEnd })) {
        const current = todayLogs.get(log.activityId) ?? { morning: 0, day: 0, evening: 0, unslotted: 0 };
        const slot = log.timeSlot;

        if (slot && ['morning', 'day', 'evening'].includes(slot)) {
          current[slot as keyof ReturnType<typeof normalizeDailyHabitTargets>] += 1;
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
      const loggedToday = todayLogs.get(activity.id) ?? { morning: 0, day: 0, evening: 0, unslotted: 0 };
      const remainingAfterSlots = {
        morning: Math.max(target.morning - loggedToday.morning, 0),
        day: Math.max(target.day - loggedToday.day, 0),
        evening: Math.max(target.evening - loggedToday.evening, 0),
      } as const;
      const remaining = calculateRemainingTargets(remainingAfterSlots, loggedToday.unslotted);
      targets.set(activity.id, {
        target,
        remaining,
        totalTarget,
        totalRemaining: sumDailyHabitTargets(remaining),
        loggedToday: loggedToday.morning + loggedToday.day + loggedToday.evening + loggedToday.unslotted,
      });
    });

    return targets;
  }, [state.activities, state.logs]);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const mindfulnessOfDay = useMemo(() => selectMindfulnessOfDay(state.mindfulness, todayStart), [
    state.mindfulness,
    todayStart,
  ]);

  const hasLoggedMindfulnessToday = useMemo(() => {
    if (!mindfulnessOfDay) return false;

    return state.logs.some(
      (log) =>
        log.mindfulnessId === mindfulnessOfDay.id &&
        isWithinInterval(new Date(log.timestamp), { start: todayStart, end: todayEnd }),
    );
  }, [mindfulnessOfDay, state.logs, todayEnd, todayStart]);

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

  const activities = useMemo(() => {
    return state.activities
      .filter((activity) => {
        const matchesSearch = activity.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [state.activities, searchTerm]);

  const { dailyHabits, regularActivities } = useMemo(() => {
    const dailyHabitIds = new Set<string>();
    const daily = activities.filter((activity) => {
      const target = dailyTargets.get(activity.id);
      const isDaily =
        (target?.totalTarget ?? 0) > 0 &&
        (target?.totalRemaining ?? 0) > 0;
      if (isDaily) {
        dailyHabitIds.add(activity.id);
      }
      return isDaily;
    });

    const regular = activities.filter((activity) => !dailyHabitIds.has(activity.id));

    return { dailyHabits: daily, regularActivities: regular };
  }, [activities, dailyTargets]);

  const showRegularSection = regularActivities.length > 0 || dailyHabits.length === 0;
  const morningHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.morning ?? 0) > 0);
  const dayHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.day ?? 0) > 0);
  const eveningHabits = dailyHabits.filter((activity) => (dailyTargets.get(activity.id)?.remaining.evening ?? 0) > 0);
  const emptyMessage = state.activities.length
    ? 'Keine Aktivitäten passen zu deiner Suche.'
    : 'Noch keine Aktivitäten angelegt.';

  return (
    <div className="space-y-6">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Suchen"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40 sm:max-w-xs"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Lade Aktivitäten" />
        </div>
      ) : (
        <div className="space-y-6">
          {!!dailyHabits.length && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Daily Habits</h2>
              <div className="space-y-5">
              {[ 
                { key: 'morning', title: 'Morgens', activities: morningHabits },
                { key: 'day', title: 'Mittags/Nachmittags', activities: dayHabits },
                { key: 'evening', title: 'Abend', activities: eveningHabits },
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
                      <ActivityQuickLogList
                        activities={section.activities}
                        logs={state.logs}
                        onAddLog={addLog}
                        dense
                        dailyTargets={dailyTargets}
                      />
                    </div>
                  ))}
              </div>
            </section>
          )}
          {showRegularSection && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Aktivitäten</h2>
              </div>
              {regularActivities.length ? (
                <ActivityQuickLogList
                  activities={regularActivities}
                  logs={state.logs}
                  onAddLog={addLog}
                  dense
                  dailyTargets={dailyTargets}
                />
              ) : (
                <p className="text-sm text-slate-400">{emptyMessage}</p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
