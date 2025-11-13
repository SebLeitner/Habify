import type { ActivityAttribute, LogAttributeValue } from '../types';

export type AttributeValueDraft =
  | { attributeId: string; type: 'number'; value: string }
  | { attributeId: string; type: 'text'; value: string }
  | { attributeId: string; type: 'timeRange'; start: string; end: string }
  | { attributeId: string; type: 'duration'; hours: string; minutes: string };

const ensureTwoDigits = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value)
    ? ''
    : value.toString().padStart(2, '0');

export const toDrafts = (
  attributes: ActivityAttribute[],
  initialValues?: LogAttributeValue[],
): AttributeValueDraft[] => {
  const valueMap = new Map(initialValues?.map((value) => [value.attributeId, value]));
  return attributes.map((attribute) => {
    const existing = valueMap.get(attribute.id);
    switch (attribute.type) {
      case 'number':
        return {
          attributeId: attribute.id,
          type: 'number' as const,
          value:
            existing && existing.type === 'number' && existing.value !== null
              ? String(existing.value)
              : '',
        };
      case 'text':
        return {
          attributeId: attribute.id,
          type: 'text' as const,
          value: existing && existing.type === 'text' ? existing.value : '',
        };
      case 'timeRange':
        return {
          attributeId: attribute.id,
          type: 'timeRange' as const,
          start:
            existing && existing.type === 'timeRange' && existing.start
              ? existing.start
              : '',
          end:
            existing && existing.type === 'timeRange' && existing.end ? existing.end : '',
        };
      case 'duration':
        return {
          attributeId: attribute.id,
          type: 'duration' as const,
          hours:
            existing && existing.type === 'duration' && existing.hours !== null
              ? ensureTwoDigits(existing.hours ?? null)
              : '',
          minutes:
            existing && existing.type === 'duration' && existing.minutes !== null
              ? ensureTwoDigits(existing.minutes ?? null)
              : '',
        };
      default:
        throw new Error(`Unsupported attribute type ${attribute.type}`);
    }
  });
};

const parseNumber = (value: string): number | null => {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDurationUnit = (value: string): number | null => {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const serializeDrafts = (drafts: AttributeValueDraft[]): LogAttributeValue[] => {
  const values: LogAttributeValue[] = [];

  drafts.forEach((draft) => {
    switch (draft.type) {
      case 'number': {
        const value = parseNumber(draft.value);
        if (value === null) {
          break;
        }
        values.push({ attributeId: draft.attributeId, type: 'number', value });
        break;
      }
      case 'text': {
        const value = draft.value.trim();
        if (!value) {
          break;
        }
        values.push({ attributeId: draft.attributeId, type: 'text', value });
        break;
      }
      case 'timeRange': {
        const start = draft.start.trim();
        const end = draft.end.trim();
        if (!start && !end) {
          break;
        }
        values.push({ attributeId: draft.attributeId, type: 'timeRange', start: start || null, end: end || null });
        break;
      }
      case 'duration': {
        const hours = parseDurationUnit(draft.hours);
        const minutes = parseDurationUnit(draft.minutes);
        if (hours === null && minutes === null) {
          break;
        }
        values.push({
          attributeId: draft.attributeId,
          type: 'duration',
          hours: hours ?? 0,
          minutes: minutes ?? 0,
        });
        break;
      }
      default:
        break;
    }
  });

  return values;
};

export const emptyDrafts = (attributes: ActivityAttribute[]): AttributeValueDraft[] =>
  attributes.map((attribute) => {
    switch (attribute.type) {
      case 'number':
        return { attributeId: attribute.id, type: 'number' as const, value: '' };
      case 'text':
        return { attributeId: attribute.id, type: 'text' as const, value: '' };
      case 'timeRange':
        return { attributeId: attribute.id, type: 'timeRange' as const, start: '', end: '' };
      case 'duration':
        return { attributeId: attribute.id, type: 'duration' as const, hours: '', minutes: '' };
      default:
        throw new Error(`Unsupported attribute type ${attribute.type}`);
    }
  });
