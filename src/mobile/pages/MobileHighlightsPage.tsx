import { useMemo, useState } from 'react';
import Button from '../../components/UI/Button';
import TextArea from '../../components/UI/TextArea';
import { useData } from '../../contexts/DataContext';
import { currentLocalDate } from '../../utils/datetime';

const MobileHighlightsPage = () => {
  const { state, addHighlight, isLoading, error } = useData();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [date, setDate] = useState(currentLocalDate());
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { highlights } = state;

  const groupedHighlights = useMemo(() => {
    const buckets = new Map<string, typeof highlights>();
    highlights.forEach((highlight) => {
      const key = highlight.date ?? currentLocalDate();
      const bucket = buckets.get(key) ?? [];
      bucket.push(highlight);
      buckets.set(key, bucket);
    });

    return Array.from(buckets.entries())
      .map(([dateKey, items]) => ({
        date: dateKey,
        items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [highlights]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    if (!trimmedTitle) {
      setStatus('Bitte gib einen Titel für dein Highlight ein.');
      return;
    }

    if (!trimmedText) {
      setStatus('Bitte beschreibe dein Highlight.');
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      await addHighlight({ title: trimmedTitle, text: trimmedText, date });
      setTitle('');
      setText('');
      setDate(currentLocalDate());
      setStatus('Highlight gespeichert.');
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : 'Highlight konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Highlight festhalten</h1>
            <p className="text-xs text-slate-400">Schnell einen besonderen Moment speichern.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            Neu
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="space-y-1 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">Titel</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Was war dein Highlight?"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">Beschreibung</span>
            <TextArea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Beschreibe dein Highlight."
              className="min-h-[96px]"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-200">
            <span className="text-xs uppercase tracking-wide text-slate-400">Datum</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            />
          </label>

          {status && <p className="text-sm text-slate-200">{status}</p>}

          <Button type="submit" disabled={isSaving} className="w-full py-3 text-base">
            {isSaving ? 'Speichern …' : 'Highlight hinzufügen'}
          </Button>
        </form>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Meine Highlights</h2>
            <p className="text-xs text-slate-400">Nach Datum sortiert, neueste zuerst.</p>
          </div>
          {isLoading && (
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-brand-secondary"
              aria-label="Lädt"
            />
          )}
        </div>

        {groupedHighlights.length === 0 && !isLoading ? (
          <p className="text-sm text-slate-400">Noch keine Highlights gespeichert.</p>
        ) : (
          groupedHighlights.map(({ date: dateKey, items }) => (
            <div key={dateKey} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-semibold text-white">{dateKey}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-200">{items.length}x</span>
              </div>
              <div className="space-y-2">
                {items.map((highlight) => (
                  <article key={highlight.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-100">
                    <h3 className="font-semibold text-white">{highlight.title || 'Highlight'}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-slate-200">{highlight.text}</p>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileHighlightsPage;
