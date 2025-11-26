import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import LogForm from '../../components/Log/LogForm';
import LogDetailsDialog from '../../components/Log/LogDetailsDialog';
import Button from '../../components/UI/Button';
import { useData } from '../../contexts/DataContext';
import { formatAttributeValue } from '../../utils/logFormatting';
import type { LogEntry } from '../../types';

type UnifiedEntry =
  | {
      id: string;
      type: 'log';
      timestamp: string;
      dateKey: string;
      title: string;
      meta: string;
      note?: string;
      activityId: string;
      attributes?: LogEntry['attributes'];
      icon?: string;
      userId: string;
      logId: string;
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
  const { state, isLoading, error, updateLog, deleteLog } = useData();

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
        activityId: log.activityId,
        attributes: log.attributes,
        icon: activity?.icon,
        userId: log.userId,
        logId: log.id,
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

  const activityById = useMemo(
    () => new Map(state.activities.map((activity) => [activity.id, activity])),
    [state.activities],
  );

  const findLogById = (id: string) => state.logs.find((log) => log.id === id) ?? null;

  const [selectedLog, setSelectedLog] = useState<UnifiedEntry | null>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [logActionError, setLogActionError] = useState<string | null>(null);
  const [isProcessingLog, setIsProcessingLog] = useState(false);

  const handleEditLog = (logId: string) => {
    const log = findLogById(logId);
    if (!log) {
      setLogActionError('Log-Eintrag konnte nicht geladen werden.');
      return;
    }
    setLogActionError(null);
    setEditingLog(log);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Log-Eintrag wirklich löschen?')) return;

    setIsProcessingLog(true);
    setLogActionError(null);
    try {
      await deleteLog(logId);
      if (selectedLog?.logId === logId) {
        setSelectedLog(null);
      }
      if (editingLog?.id === logId) {
        setEditingLog(null);
      }
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Log-Eintrag konnte nicht gelöscht werden.';
      setLogActionError(message);
    } finally {
      setIsProcessingLog(false);
    }
  };

  const handleUpdateLog = async (values: Parameters<typeof updateLog>[1]) => {
    if (!editingLog) return;

    setIsProcessingLog(true);
    setLogActionError(null);
    try {
      await updateLog(editingLog.id, values);
      setEditingLog(null);
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Log-Eintrag konnte nicht aktualisiert werden.';
      setLogActionError(message);
    } finally {
      setIsProcessingLog(false);
    }
  };

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
      {logActionError && <p className="text-sm text-red-400">{logActionError}</p>}
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
                <article
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 transition hover:border-slate-700 hover:bg-slate-900"
                  onClick={() => entry.type === 'log' && setSelectedLog(entry)}
                  role={entry.type === 'log' ? 'button' : undefined}
                  tabIndex={entry.type === 'log' ? 0 : -1}
                  onKeyDown={(event) => {
                    if (entry.type !== 'log') return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedLog(entry);
                    }
                  }}
                >
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
                  {entry.type === 'log' && !!entry.attributes?.length && (
                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      {entry.attributes.map((attributeValue) => {
                        const activityAttribute = activityById
                          .get(entry.activityId)
                          ?.attributes.find((attr) => attr.id === attributeValue.attributeId);
                        const formatted = formatAttributeValue(activityAttribute, attributeValue);
                        if (!formatted) {
                          return null;
                        }
                        return (
                          <div key={`${entry.id}-${attributeValue.attributeId}`}>
                            <span className="font-semibold text-slate-200">
                              {activityAttribute?.name ?? 'Attribut'}:
                            </span>{' '}
                            <span>{formatted}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {entry.type === 'log' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditLog(entry.logId);
                        }}
                        disabled={isProcessingLog}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-200 hover:text-red-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteLog(entry.logId);
                        }}
                        disabled={isProcessingLog}
                      >
                        Löschen
                      </Button>
                    </div>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      )}

      {selectedLog && selectedLog.type === 'log' && (
        <LogDetailsDialog
          log={{
            id: selectedLog.logId,
            activityId: selectedLog.activityId,
            timestamp: selectedLog.timestamp,
            note: selectedLog.note,
            attributes: selectedLog.attributes,
            userId: selectedLog.userId,
          }}
          activity={activityById.get(selectedLog.activityId)}
          open={!!selectedLog}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLog(null);
            }
          }}
        />
      )}

      <Dialog.Root open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl focus:outline-none">
            {editingLog && (
              <div className="flex max-h-[85vh] flex-col">
                <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-white">Log-Eintrag bearbeiten</Dialog.Title>
                    <Dialog.Description className="text-sm text-slate-400">
                      Änderungen werden direkt gespeichert. Verbindung zum Backend erforderlich.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                      ✕
                    </button>
                  </Dialog.Close>
                </header>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <div className="space-y-4 pt-4">
                    <LogForm
                      activities={state.activities}
                      initialLog={editingLog}
                      onSubmit={handleUpdateLog}
                      onCancel={() => setEditingLog(null)}
                    />
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default PwaLogPage;
