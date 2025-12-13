import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import ActivityForm from '../components/Activity/ActivityForm';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Spinner from '../components/UI/Spinner';
import { Activity, useData } from '../contexts/DataContext';

const ActivityEditorPage = () => {
  const { state, addActivity, updateActivity, deleteActivity, isLoading, error } = useData();
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
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editor</h1>
          <p className="text-sm text-slate-400">
            Verwalte deine Aktivitäten. Klicke auf eine Karte, um Details zu bearbeiten oder die Aktivität zu löschen.
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
      {error && <p className="text-sm text-red-400">{error}</p>}
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
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-brand-primary/40 hover:shadow-md hover:shadow-brand-primary/10 focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: accentColor }}>
                    {activity.icon}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white">{activity.name}</h3>
                    <p className="text-xs text-slate-400">
                      {activity.active ? 'Aktiv' : 'Inaktiv'} • Aktualisiert am {new Date(activity.updatedAt).toLocaleDateString('de-DE')}
                    </p>
                    {!!activity.attributes.length && (
                      <div className="text-xs text-slate-400">
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
        <p className="text-sm text-slate-400">Noch keine Aktivitäten angelegt.</p>
      )}
      <Dialog.Root open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {editing && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-white">Aktivität bearbeiten</Dialog.Title>
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                      Schließen
                    </Button>
                  </Dialog.Close>
                </div>
                <ActivityForm
                  initialActivity={editing}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      if (editing) {
                        const deleted = await handleDelete(editing);
                        if (deleted) {
                          setEditing(null);
                        }
                      }
                    }}
                  >
                    Aktivität löschen
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default ActivityEditorPage;
