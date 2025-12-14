import { useMemo, useState } from 'react';
import { Activity, LogEntry } from '../../contexts/DataContext';
import { formatAttributeValue, formatLogTimestamp } from '../../utils/logFormatting';
import { isMindfulnessLog } from '../../utils/logs';
import LogDetailsDialog from './LogDetailsDialog';
import Button from '../UI/Button';

const LogList = ({
  logs,
  activities,
  onEdit,
  onDelete,
  allLogs,
}: {
  logs: LogEntry[];
  activities: Activity[];
  onEdit?: (log: LogEntry) => void;
  onDelete?: (log: LogEntry) => void;
  allLogs?: LogEntry[];
}) => {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const activityById = useMemo(() => new Map(activities.map((activity) => [activity.id, activity])), [activities]);

  const logsForDetails = allLogs ?? logs;

  if (!logs.length) {
    return <p className="text-sm text-slate-400">Noch keine Einträge an diesem Tag.</p>;
  }

  const closeDialog = () => setSelectedLog(null);

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const activity = activityById.get(log.activityId);
        const mindfulnessLog = isMindfulnessLog(log);
        const accentColor = `${activity?.color ?? (mindfulnessLog ? '#8b5cf6' : '#475569')}33`;
        const title = mindfulnessLog ? 'Achtsamkeit des Tages' : activity?.name ?? 'Unbekannte Aktivität';
        const description = mindfulnessLog ? log.mindfulnessTitle : undefined;
        const icon = mindfulnessLog ? '🧘' : activity?.icon ?? '📌';
        return (
          <div
            key={log.id}
            className="flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 hover:bg-slate-900 md:flex-row md:items-center md:justify-between"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedLog(log)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedLog(log);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: accentColor }}>
                {icon}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-slate-400">{formatLogTimestamp(log)}</p>
                {description && (
                  <p className="mt-2 text-sm text-purple-100">{description}</p>
                )}
                {log.note && !mindfulnessLog && (
                  <p className="mt-2 text-sm text-slate-300">{log.note}</p>
                )}
                {!!log.attributes?.length && !mindfulnessLog && (
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    {log.attributes.map((attributeValue) => {
                      const activityAttribute = activity?.attributes.find(
                        (attr) => attr.id === attributeValue.attributeId,
                      );
                      const formatted = formatAttributeValue(activityAttribute, attributeValue);
                      if (!formatted) {
                        return null;
                      }
                      return (
                        <div key={`${log.id}-${attributeValue.attributeId}`}>
                          <span className="font-semibold text-slate-200">
                            {activityAttribute?.name ?? 'Attribut'}:
                          </span>{' '}
                          <span>{formatted}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {(onEdit || onDelete) && (
              <div className="flex gap-2">
                {onEdit && !mindfulnessLog && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(log);
                    }}
                  >
                    Bearbeiten
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(log);
                    }}
                  >
                    Löschen
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {selectedLog && (
        <LogDetailsDialog
          log={selectedLog}
          activity={activityById.get(selectedLog.activityId)}
          logs={logsForDetails}
          open={!!selectedLog}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
        />
      )}
    </div>
  );
};

export default LogList;
