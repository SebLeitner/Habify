import { useMemo, useState } from 'react';
import ActivityForm from '../components/Activity/ActivityForm';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Spinner from '../components/UI/Spinner';
import { Activity, useData } from '../contexts/DataContext';

const ActivityEditorPage = () => {
  const { state, addActivity, updateActivity, deleteActivity, isLoading, error } = useData();
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
          <h1 className="text-2xl font-bold text-slate-900">Editor</h1>
          <p className="text-sm text-slate-500">
            Verwalte deine Aktivitäten. Klicke auf eine Karte, um Details zu bearbeiten oder die Aktivität zu löschen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sortieren nach
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as 'createdAt' | 'name')}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-primary/60 focus:outline-none focus:ring-4 focus:ring-brand-primary/10"
            >
              <option value="createdAt">Erstellungsdatum</option>
              <option value="name">Name</option>
            </select>
          </label>
          <Modal triggerLabel="Neue Aktivität" title="Aktivität hinzufügen">
            {(close) => (
              <ActivityForm
                existingCategories={categories}
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
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
      {error && <p className="text-sm text-red-500">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Aktivitäten" />
        </div>
      ) : activities.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => {
            const accentColor = `${activity.color}33`;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => setEditing(activity)}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-5 text-left shadow-sm shadow-slate-200 transition hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner" style={{ backgroundColor: accentColor }}>
                    {activity.icon}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">{activity.name}</h3>
                    <p className="text-xs text-slate-500">
                      {activity.active ? 'Aktiv' : 'Inaktiv'} • Aktualisiert am {new Date(activity.updatedAt).toLocaleDateString('de-DE')}
                    </p>
                    {activity.categories?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activity.categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Keine Kategorien</span>
                    )}
                    {!!activity.attributes.length && (
                      <div className="text-xs text-slate-500">
                        {activity.attributes.length} Attribute definiert
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Noch keine Aktivitäten angelegt.</p>
      )}
      {editing && (
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Aktivität bearbeiten</h2>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Schließen
            </Button>
          </div>
          <ActivityForm
            initialActivity={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            existingCategories={categories}
          />
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (editing) {
                  await handleDelete(editing);
                  setEditing(null);
                }
              }}
            >
              Aktivität löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityEditorPage;
