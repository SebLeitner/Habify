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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-primary/60 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 sm:max-w-xs"
        />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                categoryFilter === null
                  ? 'bg-brand-primary/10 text-brand-primary shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Alle
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter((current) => (current === category ? null : category))}
                className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                  categoryFilter === category
                    ? 'bg-brand-primary/10 text-brand-primary shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Lade Aktivitäten" />
        </div>
      ) : (
        <ActivityQuickLogList activities={activities} onAddLog={addLog} dense />
      )}
    </div>
  );
};

export default ActivitiesPage;
