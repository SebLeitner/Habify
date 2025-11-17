import { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';

type UnifiedEntry =
  | {
      id: string;
      type: 'log';
      timestamp: string;
      dateKey: string;
      title: string;
      meta: string;
      note?: string;
    }
  | {
      id: string;
      type: 'highlight';
      timestamp: string;
      dateKey: string;
      title: string;
      meta: string;
      note?: string;
    };

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

const formatDateHeading = (dateKey: string) =>
  new Date(dateKey).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const PwaLogPage = () => {
  const { state, isLoading, error } = useData();

  const entries = useMemo<UnifiedEntry[]>(() => {
    const activityLookup = new Map(state.activities.map((activity) => [activity.id, activity]));

    const logEntries: UnifiedEntry[] = state.logs.map((log) => {
      const activity = activityLookup.get(log.activityId);
      const dateKey = log.timestamp.slice(0, 10);
      return {
        id: `log-${log.id}`,
        type: 'log',
        timestamp: log.timestamp,
        dateKey,
        title: activity?.name ?? 'Aktivität',
        meta: `${activity?.icon ?? '📝'} • ${formatTime(log.timestamp)}`,
        note: log.note,
      };
    });

    const highlightEntries: UnifiedEntry[] = state.highlights.map((highlight) => {
      const dateKey = highlight.date;
      const timestamp = `${highlight.date}T23:59:59`;
      return {
        id: `highlight-${highlight.id}`,
        type: 'highlight',
        timestamp,
        dateKey,
        title: highlight.title,
        meta: '✨ Highlight',
        note: highlight.text,
      };
    });

    return [...logEntries, ...highlightEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [state.activities, state.highlights, state.logs]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Log</p>
        <h1 className="text-xl font-semibold text-white">Aktivitäten & Highlights</h1>
        <p className="text-sm text-slate-400">
          Alle Einträge in kompakter Reihenfolge. Die neuesten stehen ganz oben, getrennt nach Tagen.
        </p>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-300">Lade Log …</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Einträge vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const previous = entries[index - 1];
            const showDivider = !previous || previous.dateKey !== entry.dateKey;
            return (
              <div key={entry.id} className="space-y-2">
                {showDivider && (
                  <div className="sticky top-16 z-10 -mx-2 rounded-lg bg-slate-900/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {formatDateHeading(entry.dateKey)}
                  </div>
                )}
                <article className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{entry.title}</p>
                      <p className="text-xs text-slate-400">{entry.meta}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        entry.type === 'log'
                          ? 'bg-brand-primary/15 text-brand-secondary'
                          : 'bg-amber-400/20 text-amber-200'
                      }`}
                    >
                      {entry.type === 'log' ? 'Aktivität' : 'Highlight'}
                    </span>
                  </div>
                  {entry.note && <p className="mt-2 text-sm text-slate-200">{entry.note}</p>}
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PwaLogPage;
