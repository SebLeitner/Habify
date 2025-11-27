import { useMemo, useState } from 'react';
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

  const activities = useMemo(() => {
    return state.activities
      .filter((activity) => {
        const matchesCategory = categoryFilter ? activity.categories?.includes(categoryFilter) : true;
        const matchesSearch = activity.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [state.activities, categoryFilter, searchTerm]);

  return (
    <div className="space-y-4">
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
        <ActivityQuickLogList activities={activities} logs={state.logs} onAddLog={addLog} dense />
      )}
    </div>
  );
};

export default ActivitiesPage;
