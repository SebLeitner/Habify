import { Activity, LogEntry } from '../../contexts/DataContext';
import type { ActivityAttribute, LogAttributeValue } from '../../types';
import Button from '../UI/Button';

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString('de-DE')} ${date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const formatAttribute = (
  attribute: ActivityAttribute | undefined,
  value: LogAttributeValue,
): string => {
  if (!attribute) {
    switch (value.type) {
      case 'number':
        return value.value !== null ? String(value.value) : '';
      case 'text':
        return value.value;
      case 'timeRange':
        return [value.start, value.end].filter(Boolean).join(' – ');
      case 'duration': {
        const parts = [] as string[];
        if (value.hours !== null && value.hours !== undefined) {
          parts.push(`${value.hours}h`);
        }
        if (value.minutes !== null && value.minutes !== undefined) {
          parts.push(`${value.minutes}m`);
        }
        return parts.join(' ');
      }
      default:
        return '';
    }
  }

  switch (value.type) {
    case 'number':
      return value.value !== null
        ? `${value.value}${attribute.unit ? ` ${attribute.unit}` : ''}`
        : '';
    case 'text':
      return value.value;
    case 'timeRange': {
      const parts = [value.start, value.end].filter(Boolean);
      return parts.join(' – ');
    }
    case 'duration': {
      const parts = [] as string[];
      if (value.hours !== null && value.hours !== undefined) {
        parts.push(`${value.hours}h`);
      }
      if (value.minutes !== null && value.minutes !== undefined) {
        parts.push(`${value.minutes}m`);
      }
      return parts.join(' ');
    }
    default:
      return '';
  }
};

const LogList = ({
  logs,
  activities,
  onEdit,
  onDelete,
}: {
  logs: LogEntry[];
  activities: Activity[];
  onEdit?: (log: LogEntry) => void;
  onDelete?: (log: LogEntry) => void;
}) => {
  if (!logs.length) {
    return <p className="text-sm text-slate-400">Noch keine Einträge an diesem Tag.</p>;
  }

  const activityById = new Map(activities.map((activity) => [activity.id, activity]));

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const activity = activityById.get(log.activityId);
        const accentColor = `${activity?.color ?? '#475569'}33`;
        return (
          <div
            key={log.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: accentColor }}>
                {activity?.icon ?? '📌'}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{activity?.name ?? 'Unbekannte Aktivität'}</h3>
                <p className="text-xs text-slate-400">{formatTimestamp(log.timestamp)}</p>
                {log.note && <p className="mt-2 text-sm text-slate-300">{log.note}</p>}
                {!!log.attributes?.length && (
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    {log.attributes.map((attributeValue) => {
                      const activityAttribute = activity?.attributes.find(
                        (attr) => attr.id === attributeValue.attributeId,
                      );
                      const formatted = formatAttribute(activityAttribute, attributeValue);
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
                {onEdit && (
                  <Button type="button" variant="ghost" onClick={() => onEdit(log)}>
                    Bearbeiten
                  </Button>
                )}
                {onDelete && (
                  <Button type="button" variant="ghost" onClick={() => onDelete(log)}>
                    Löschen
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LogList;
