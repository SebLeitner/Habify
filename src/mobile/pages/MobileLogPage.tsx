import { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import Spinner from '../../components/UI/Spinner';
import { toLocalDateInput, toLocalTimeInput } from '../../utils/datetime';

const ITEMS_PER_PAGE = 15;

const MobileLogPage = () => {
  const { state, isLoading, error } = useData();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Logbuch</h1>
            <p className="text-xs text-slate-400">Chronologisch sortiert, für schnelles mobiles Lesen.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            Live
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
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
            className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-brand-secondary/50 hover:bg-brand-primary/20"
          >
            Mehr laden
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default MobileLogPage;
