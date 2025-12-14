import type { ActivityAttribute, LogAttributeValue, LogEntry } from '../types';

const resolveTimeSlotLabel = (log: Pick<LogEntry, 'timestamp' | 'timeSlot'>) => {
  const map: Record<NonNullable<LogEntry['timeSlot']>, string> = {
    morning: 'Morgens',
    day: 'Mittags/Nachmittags',
    evening: 'Abends',
  };

  if (log.timeSlot && map[log.timeSlot]) {
    return map[log.timeSlot];
  }

  const hour = new Date(log.timestamp).getHours();
  if (hour < 12) return map.morning;
  if (hour < 18) return map.day;
  return map.evening;
};

export const formatLogTimestamp = (log: Pick<LogEntry, 'timestamp' | 'timeSlot'>) => {
  const date = new Date(log.timestamp);
  return `${date.toLocaleDateString('de-DE')} • ${resolveTimeSlotLabel(log)}`;
};

export const formatAttributeValue = (
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
