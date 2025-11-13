import { useMemo, useState } from 'react';
import ActivityForm from '../components/Activity/ActivityForm';
import ActivityList from '../components/Activity/ActivityList';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import { Activity, useData } from '../contexts/DataContext';

const ActivitiesPage = () => {
  const { state, addActivity, updateActivity, deleteActivity } = useData();
  const [sort, setSort] = useState<'createdAt' | 'name'>('createdAt');
  const [editing, setEditing] = useState<Activity | null>(null);

  const activities = useMemo(() => {
    const sorted = [...state.activities];
    if (sort === 'createdAt') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'de')); // alphabetical
    }
    return sorted;
  }, [state.activities, sort]);

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
      <ActivityList activities={activities} onEdit={setEditing} onDelete={handleDelete} />
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
