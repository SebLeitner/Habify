import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import Spinner from '../../components/UI/Spinner';
import { toLocalDateInput, toLocalTimeInput } from '../../utils/datetime';

const ITEMS_PER_PAGE = 15;

const MobileLogPage = () => {
  const { state, isLoading, error } = useData();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [highlightVisibleCount, setHighlightVisibleCount] = useState(ITEMS_PER_PAGE);

  const activityLookup = useMemo(() => {
    const map = new Map<string, { name: string; color: string; icon: string }>();
    state.activities.forEach((activity) => {
      map.set(activity.id, { name: activity.name, color: activity.color, icon: activity.icon });
    });
    return map;
  }, [state.activities]);

  const sortedLogs = useMemo(
    () => [...state.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [state.logs],
  );

  const visibleLogs = sortedLogs.slice(0, visibleCount);

  const sortedHighlights = useMemo(() => {
    return [...state.highlights]
      .filter((highlight) => highlight.date || highlight.createdAt)
      .sort((a, b) => {
        const aDate = a.date ? new Date(`${a.date}T23:59:59`) : new Date(a.createdAt);
        const bDate = b.date ? new Date(`${b.date}T23:59:59`) : new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
  }, [state.highlights]);

  const visibleHighlights = sortedHighlights.slice(0, highlightVisibleCount);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Logbuch</h1>
            <p className="text-xs text-slate-400">Aktivitäten und Highlights immer griffbereit.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            Live
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Highlights</h2>
                <p className="text-xs text-slate-400">Neueste Einträge zuerst.</p>
              </div>
              {isLoading && (
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-brand-secondary"
                  aria-label="Lädt"
                />
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner label="Lade Highlights" />
              </div>
            ) : !visibleHighlights.length ? (
              <p className="text-sm text-slate-400">Noch keine Highlights erfasst.</p>
            ) : (
              <div className="space-y-3">
                {visibleHighlights.map((highlight) => {
                  const dateLabel = highlight.date || toLocalDateInput(highlight.createdAt);
                  return (
                    <article
                      key={highlight.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 shadow-inner"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-lg">
                            ✨
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold">{highlight.title || 'Highlight'}</span>
                            <span className="text-xs text-slate-400">{dateLabel}</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-slate-200">{highlight.text}</p>
                    </article>
                  );
                })}
              </div>
            )}

            {highlightVisibleCount < sortedHighlights.length && !isLoading ? (
              <button
                type="button"
                onClick={() => setHighlightVisibleCount((count) => count + ITEMS_PER_PAGE)}
                className="w-full rounded-lg border border-slate-800 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-brand-secondary/50 hover:bg-brand-primary/20"
              >
                Mehr Highlights laden
              </button>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Aktivitäten</h2>
                <p className="text-xs text-slate-400">Chronologisch sortiert.</p>
              </div>
              {isLoading && (
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-brand-secondary"
                  aria-label="Lädt"
                />
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner label="Lade Logbuch" />
              </div>
            ) : !visibleLogs.length ? (
              <p className="text-sm text-slate-400">Noch keine Einträge vorhanden.</p>
            ) : (
              <div className="space-y-3">
                {visibleLogs.map((log) => {
                  const activity = activityLookup.get(log.activityId);
                  const dateLabel = toLocalDateInput(log.timestamp);
                  const timeLabel = toLocalTimeInput(log.timestamp);
                  return (
                    <article
                      key={log.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 shadow-inner"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                            style={{ backgroundColor: `${activity?.color ?? '#475569'}33` }}
                          >
                            {activity?.icon ?? '📝'}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold">{activity?.name ?? 'Aktivität'}</span>
                            <span className="text-xs text-slate-400">
                              {dateLabel} • {timeLabel || 'Jetzt'}
                            </span>
                          </div>
                        </div>
                        {log.note ? <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-200">Notiz</span> : null}
                      </div>
                      {log.note ? <p className="mt-3 whitespace-pre-wrap text-slate-200">{log.note}</p> : null}
                    </article>
                  );
                })}
              </div>
            )}

            {visibleCount < sortedLogs.length && !isLoading ? (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + ITEMS_PER_PAGE)}
                className="w-full rounded-lg border border-slate-800 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-brand-secondary/50 hover:bg-brand-primary/20"
              >
                Mehr Aktivitäten laden
              </button>
            ) : null}
          </section>
        </div>
      </div>

      <Link
        to="/highlights"
        className="flex w-full justify-center rounded-lg bg-brand-primary px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-primary/80 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Highlight hinzufügen
      </Link>
    </div>
  );
};

export default MobileLogPage;
