import { useMemo, useState } from 'react';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import TextArea from '../components/UI/TextArea';
import { useData } from '../contexts/DataContext';

const MindfulnessPage = () => {
  const { state, addMindfulness, updateMindfulness, deleteMindfulness, isLoading, error } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEditingId(null);
    setFormError(null);
  };

  const sortedEntries = useMemo(
    () =>
      state.mindfulness
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime(),
        ),
    [state.mindfulness],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setFormError('Bitte gib deiner Achtsamkeit einen Titel.');
      return;
    }

    if (!trimmedDescription) {
      setFormError('Bitte ergänze eine Beschreibung.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateMindfulness(editingId, {
          title: trimmedTitle,
          description: trimmedDescription,
        });
      } else {
        await addMindfulness({
          title: trimmedTitle,
          description: trimmedDescription,
        });
      }
      resetForm();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Eintrag konnte nicht gespeichert werden.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (id: string) => {
    const entry = state.mindfulness.find((item) => item.id === id);
    if (!entry) return;
    setTitle(entry.title ?? '');
    setDescription(entry.description ?? '');
    setEditingId(entry.id);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    setFormError(null);
    try {
      await deleteMindfulness(id);
      if (editingId === id) {
        resetForm();
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Eintrag konnte nicht gelöscht werden.';
      setFormError(message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Achtsamkeit des Tages</h1>
        <p className="text-sm text-slate-400">
          Achtsamkeitsimpulse für den Tag
        </p>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {formError && <p className="text-sm text-red-400">{formError}</p>}

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">
          {editingId ? 'Achtsamkeit bearbeiten' : 'Neue Achtsamkeit anlegen'}
        </h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Titel"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Atembeobachtung"
            required
          />
          <TextArea
            label="Beschreibung"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Notiere Details, Anweisungen oder eine Affirmation."
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingId ? 'Änderungen speichern' : 'Achtsamkeit speichern'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Meine Achtsamkeitsaktivitäten</h2>
          {isLoading && <span className="text-xs text-slate-400">Lade…</span>}
        </div>
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Achtsamkeiten erfasst.</p>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 shadow-inner shadow-black/20"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-base font-semibold text-white">{entry.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => startEdit(entry.id)}
                      disabled={isSubmitting}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete(entry.id)}
                      disabled={isSubmitting}
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MindfulnessPage;
