import type { ActivityAttribute, LogAttributeValue } from '../types';

export const formatLogTimestamp = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString('de-DE')} ${date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
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
