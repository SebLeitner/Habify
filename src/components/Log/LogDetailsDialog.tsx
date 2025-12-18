import * as Dialog from '@radix-ui/react-dialog';
import { Activity, LogEntry } from '../../contexts/DataContext';
import { formatAttributeValue, formatLogTime, formatLogTimestamp } from '../../utils/logFormatting';
import { isMindfulnessLog } from '../../utils/logs';
import WeeklyActivityOverview from './WeeklyActivityOverview';

type LogDetailsDialogProps = {
  log: LogEntry;
  activity?: Activity;
  logs: LogEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LogDetailsDialog = ({ log, activity, logs, open, onOpenChange }: LogDetailsDialogProps) => {
  const mindfulnessLog = isMindfulnessLog(log);
  const accentColor = `${activity?.color ?? (mindfulnessLog ? '#8b5cf6' : '#475569')}33`;
  const title = mindfulnessLog ? 'Achtsamkeit des Tages' : activity?.name ?? 'Aktivität';
  const icon = mindfulnessLog ? '🧘' : activity?.icon ?? '📌';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl focus:outline-none">
          <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: accentColor }}>
                {icon}
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-400">
                  {formatLogTimestamp(log)}
                </Dialog.Description>
                <p className="text-xs text-slate-300">Uhrzeit: {formatLogTime(log)}</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                ✕
              </button>
            </Dialog.Close>
          </header>

          <div className="space-y-6 px-6 py-5">
            {mindfulnessLog && log.mindfulnessTitle && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Impuls
                </h3>
                <p className="text-base text-slate-100">{log.mindfulnessTitle}</p>
              </section>
            )}

            {activity && (
              <WeeklyActivityOverview
                activityId={activity.id}
                logs={logs}
                className="border border-slate-800 bg-slate-900/60"
              />
            )}
            {log.note && !mindfulnessLog && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Notiz</h3>
                <p className="text-base text-slate-100">{log.note}</p>
              </section>
            )}

            {!!log.attributes?.length && !mindfulnessLog && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Attribute</h3>
                <div className="space-y-2">
                  {log.attributes.map((attributeValue) => {
                    const activityAttribute = activity?.attributes.find((attr) => attr.id === attributeValue.attributeId);
                    const formatted = formatAttributeValue(activityAttribute, attributeValue);
                    if (!formatted) {
                      return null;
                    }
                    return (
                      <div
                        key={`${log.id}-${attributeValue.attributeId}`}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {activityAttribute?.name ?? 'Attribut'}
                        </p>
                        <p className="text-sm text-slate-100">{formatted}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!log.note && !log.attributes?.length && (
              <p className="text-sm text-slate-400">Keine weiteren Details vorhanden.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LogDetailsDialog;
