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
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <div className="space-y-3">
        {highlights.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          highlights.map((highlight) => {
            const titleText = highlight.title?.trim() || highlight.text || 'Highlight';
            const description = highlight.text?.trim() ?? '';
            const showDescription = Boolean(description && description !== titleText);
            return (
              <div
                key={highlight.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{titleText}</h3>
                  {showDescription && <p className="mt-1 text-sm text-slate-600">{description}</p>}
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
