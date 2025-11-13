import { useMemo, useState } from 'react';
import ActivityForm from '../components/Activity/ActivityForm';
import ActivityList from '../components/Activity/ActivityList';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Spinner from '../components/UI/Spinner';
import { Activity, useData } from '../contexts/DataContext';

const ActivitiesPage = () => {
  const { state, addActivity, updateActivity, deleteActivity, addLog, isLoading, error } = useData();
  const [sort, setSort] = useState<'createdAt' | 'name'>('createdAt');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    state.activities.forEach((activity) => {
      activity.categories?.forEach((category) => set.add(category));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [state.activities]);

  const activities = useMemo(() => {
    const sorted = [...state.activities];
    if (sort === 'createdAt') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'de')); // alphabetical
    }
    if (!categoryFilter) {
      return sorted;
    }
    return sorted.filter((activity) => activity.categories?.includes(categoryFilter));
  }, [state.activities, sort, categoryFilter]);

  const handleCreate = async (values: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addActivity(values);
  };

  const handleUpdate = async (values: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    await updateActivity(editing.id, values);
    setEditing(null);
  };

  const handleDelete = async (activity: Activity) => {
    if (window.confirm(`Aktivität "${activity.name}" löschen?`)) {
      await deleteActivity(activity.id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Aktivitäten</h1>
          <p className="text-sm text-slate-400">
            Verwalte deine Routinen. Aktivitäten können später im Logbuch ausgewählt werden.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Sortieren nach
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as 'createdAt' | 'name')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="createdAt">Erstellungsdatum</option>
              <option value="name">Name</option>
            </select>
          </label>
          <Modal triggerLabel="Neue Aktivität" title="Aktivität hinzufügen">
            {(close) => (
              <ActivityForm
                onSubmit={async (values) => {
                  await handleCreate(values);
                  close();
                }}
              />
            )}
          </Modal>
        </div>
      </header>
      {!!categories.length && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Aktivitäten" />
        </div>
      ) : (
        <ActivityList
          activities={activities}
          onEdit={setEditing}
          onDelete={handleDelete}
          onAddLog={addLog}
        />
      )}
      {editing && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Aktivität bearbeiten</h2>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Schließen
            </Button>
          </div>
          <ActivityForm initialActivity={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
