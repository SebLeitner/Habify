import { useMemo, useState } from 'react';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import ActivityQuickLogList from '../components/Activity/ActivityQuickLogList';
import Spinner from '../components/UI/Spinner';
import { useData } from '../contexts/DataContext';

const ActivitiesPage = () => {
  const { state, addLog, isLoading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    state.activities.forEach((activity) => {
      activity.categories?.forEach((category) => set.add(category));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [state.activities]);

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

    const targets = new Map<string, { target: number; remaining: number }>();
    state.activities.forEach((activity) => {
      const target = activity.minLogsPerDay ?? 0;
      if (target <= 0) return;
      const loggedToday = todayLogs.get(activity.id) ?? 0;
      targets.set(activity.id, { target, remaining: Math.max(target - loggedToday, 0) });
    });

    return targets;
  }, [state.activities, state.logs]);

  const activities = useMemo(() => {
    return state.activities
      .filter((activity) => {
        const matchesCategory = categoryFilter ? activity.categories?.includes(categoryFilter) : true;
        const matchesSearch = activity.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [state.activities, categoryFilter, searchTerm]);

  const { dailyHabits, regularActivities } = useMemo(() => {
    const dailyHabitIds = new Set<string>();
    const daily = activities.filter((activity) => {
      const target = activity.minLogsPerDay ?? 0;
      const remaining = dailyTargets.get(activity.id)?.remaining ?? target;
      const isDaily = target > 0 && remaining > 0;
      if (isDaily) {
        dailyHabitIds.add(activity.id);
      }
      return isDaily;
    });

    const regular = activities.filter((activity) => !dailyHabitIds.has(activity.id));

    return { dailyHabits: daily, regularActivities: regular };
  }, [activities, dailyTargets]);

  const showRegularSection = regularActivities.length > 0 || dailyHabits.length === 0;
  const emptyMessage = state.activities.length
    ? 'Keine Aktivitäten passen zu deiner Suche.'
    : 'Noch keine Aktivitäten angelegt.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Suchen"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40 sm:max-w-xs"
        />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                categoryFilter === null
                  ? 'bg-brand-primary/20 text-brand-secondary'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              Alle
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter((current) => (current === category ? null : category))}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoryFilter === category
                    ? 'bg-brand-primary/20 text-brand-secondary'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Lade Aktivitäten" />
        </div>
      ) : (
        <div className="space-y-6">
          {!!dailyHabits.length && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Daily Habits</h2>
                <p className="text-sm text-slate-400">Tägliche Ziele, die du heute noch erfüllen möchtest.</p>
              </div>
              <ActivityQuickLogList
                activities={dailyHabits}
                logs={state.logs}
                onAddLog={addLog}
                dense
                dailyTargets={dailyTargets}
              />
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
