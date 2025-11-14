import { useState } from 'react';
import type { DailyHighlight } from '../../contexts/DataContext';
import Button from '../UI/Button';

const DailyHighlights = ({
  highlights,
  onDelete,
  title = 'Highlights des Tages',
  emptyLabel = 'Noch keine Highlights für diesen Tag.',
  error,
}: {
  highlights: DailyHighlight[];
  onDelete: (highlight: DailyHighlight) => Promise<void> | void;
  title?: string;
  emptyLabel?: string;
  error?: string | null;
}) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <div className="space-y-3">
        {highlights.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        ) : (
          highlights.map((highlight) => {
            const titleText = highlight.title?.trim() || highlight.text || 'Highlight';
            const description = highlight.text?.trim() ?? '';
            const showDescription = Boolean(description && description !== titleText);
            return (
              <div
                key={highlight.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{titleText}</h3>
                  {showDescription && <p className="mt-1 text-sm text-slate-300">{description}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => handleDelete(highlight)}
                  disabled={pendingDeleteId === highlight.id}
                >
                  {pendingDeleteId === highlight.id ? 'Entfernen…' : 'Entfernen'}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DailyHighlights;
