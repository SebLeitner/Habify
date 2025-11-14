import { FormEvent, useState } from 'react';
import type { DailyHighlight } from '../../contexts/DataContext';
import Button from '../UI/Button';
import TextArea from '../UI/TextArea';

const DailyHighlights = ({
  highlights,
  onAdd,
  onDelete,
  error,
}: {
  highlights: DailyHighlight[];
  onAdd: (text: string) => Promise<void> | void;
  onDelete: (highlight: DailyHighlight) => Promise<void> | void;
  error?: string | null;
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdd(value);
      setText('');
    } catch (submitError) {
      console.error('Highlight konnte nicht gespeichert werden', submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (highlight: DailyHighlight) => {
    setPendingDeleteId(highlight.id);
    try {
      await onDelete(highlight);
    } catch (deleteError) {
      console.error('Highlight konnte nicht gelöscht werden', deleteError);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Highlights des Tages</h2>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <TextArea
          label="Neues Highlight"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Was war heute besonders?"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !text.trim()}>
            {isSubmitting ? 'Speichern…' : 'Highlight hinzufügen'}
          </Button>
        </div>
      </form>
      <div className="mt-6 space-y-2">
        {highlights.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Highlights für diesen Tag.</p>
        ) : (
          highlights.map((highlight) => (
            <div
              key={highlight.id}
              className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3"
            >
              <p className="text-sm text-slate-200">{highlight.text}</p>
              <Button
                type="button"
                variant="ghost"
                className="ml-4 shrink-0"
                onClick={() => handleDelete(highlight)}
                disabled={pendingDeleteId === highlight.id}
              >
                {pendingDeleteId === highlight.id ? 'Entfernen…' : 'Entfernen'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DailyHighlights;
