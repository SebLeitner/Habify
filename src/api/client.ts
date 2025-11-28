import type { Activity, ActivityAttribute, DailyHighlight, LogAttributeValue, LogEntry } from '../types';
import { getEnvValue } from '../utils/runtimeEnv';

const DEFAULT_API_BASE = 'https://v2thu7qsrd.execute-api.eu-central-1.amazonaws.com/dev';
export const API_BASE_URL = (getEnvValue('VITE_API_URL') ?? DEFAULT_API_BASE).replace(/\/$/, '');

type RequestOptions = {
  path: string;
  payload?: Record<string, unknown>;
};

type ActivitiesListResponse = { items: Activity[] } | Activity[];
type ActivityResponse = { item: Activity } | Activity;
type LogsListResponse = { items: LogEntry[] } | LogEntry[];
type LogResponse = { item: LogEntry } | LogEntry;
type HighlightsListResponse = { items: DailyHighlight[] } | DailyHighlight[];
type HighlightResponse = { item: DailyHighlight } | DailyHighlight;

type ListLogsParams = { userId?: string };
type ListHighlightsParams = { userId?: string; date?: string };

type UpdateActivityPayload = Partial<Omit<Activity, 'createdAt' | 'updatedAt'>> & { id: string };

type UpdateLogPayload = Partial<LogEntry> & { id: string; userId: string };

type CreateLogPayload = Omit<LogEntry, 'id'> & { id?: string };
type UpdateHighlightPayload = Partial<DailyHighlight> & { id: string; userId: string };
type CreateHighlightPayload = Omit<DailyHighlight, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API-Fehler (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Antwort konnte nicht geparst werden', error);
    throw new Error('Ungültige Antwort vom Server');
  }
};

const request = async <T>({ path, payload }: RequestOptions): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  });

  return (await handleResponse(response)) as T;
};

const normalizeAttributes = (attributes: unknown): ActivityAttribute[] => {
  if (!Array.isArray(attributes)) {
    return [];
  }

  const normalized: ActivityAttribute[] = [];

  attributes.forEach((attribute) => {
    if (!attribute || typeof attribute !== 'object') {
      return;
    }
    const { id, name, type, unit } = attribute as Partial<ActivityAttribute>;
    if (!id || !name || !type) {
      return;
    }
    normalized.push({
      id,
      name: name.toString(),
      type,
      unit: unit ?? null,
    });
  });

  return normalized;
};

const normalizeActivity = (activity: Activity): Activity => ({
  ...activity,
  categories: Array.isArray(activity.categories)
    ? activity.categories.map((category) => category.toString())
    : [],
  attributes: normalizeAttributes((activity as Activity).attributes),
});

const normalizeLogAttributes = (values: unknown): LogAttributeValue[] | undefined => {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return values
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const { attributeId, type } = entry as Partial<LogAttributeValue>;
      if (!attributeId || !type) {
        return null;
      }

      switch (type) {
        case 'number': {
          const rawValue = (entry as { value?: number | string | null }).value;
          const value =
            rawValue === null || rawValue === undefined || rawValue === ''
              ? null
              : Number(rawValue);
          return {
            attributeId,
            type,
            value: Number.isNaN(value as number) ? null : value,
          } as LogAttributeValue;
        }
        case 'text':
          return {
            attributeId,
            type,
            value: ((entry as { value?: string }).value ?? '').toString(),
          } as LogAttributeValue;
        case 'timeRange': {
          const { start = null, end = null } = entry as { start?: string | null; end?: string | null };
          return {
            attributeId,
            type,
            start: start ?? null,
            end: end ?? null,
          } as LogAttributeValue;
        }
        case 'duration': {
          const { hours = null, minutes = null } = entry as {
            hours?: number | null;
            minutes?: number | null;
          };
          return {
            attributeId,
            type,
            hours: hours ?? null,
            minutes: minutes ?? null,
          } as LogAttributeValue;
        }
        default:
          return null;
      }
    })
    .filter((value): value is LogAttributeValue => value !== null);
};

const normalizeLog = (log: LogEntry): LogEntry => ({
  ...log,
  note: log.note ?? undefined,
  attributes: normalizeLogAttributes((log as LogEntry).attributes),
});

const normalizeHighlight = (highlight: DailyHighlight): DailyHighlight => ({
  ...highlight,
  date: highlight.date,
  title: (highlight.title ?? '').toString(),
  text: (highlight.text ?? '').toString(),
  photoUrl:
    highlight.photoUrl === null || highlight.photoUrl === undefined
      ? null
      : highlight.photoUrl.toString(),
});

const extractActivities = (payload: ActivitiesListResponse): Activity[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeActivity);
  }

  if ('items' in payload && Array.isArray(payload.items)) {
    return payload.items.map(normalizeActivity);
  }

  return [];
};

const extractActivity = (payload: ActivityResponse): Activity => {
  if ('item' in payload && payload.item) {
    return normalizeActivity(payload.item);
  }

  return normalizeActivity(payload as Activity);
};

const extractLogs = (payload: LogsListResponse): LogEntry[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeLog);
  }

  if ('items' in payload && Array.isArray(payload.items)) {
    return payload.items.map(normalizeLog);
  }

  return [];
};

const extractLog = (payload: LogResponse): LogEntry => {
  if ('item' in payload && payload.item) {
    return normalizeLog(payload.item);
  }

  return normalizeLog(payload as LogEntry);
};

const extractHighlights = (payload: HighlightsListResponse): DailyHighlight[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeHighlight);
  }

  if ('items' in payload && Array.isArray(payload.items)) {
    return payload.items.map(normalizeHighlight);
  }

  return [];
};

const extractHighlight = (payload: HighlightResponse): DailyHighlight => {
  if ('item' in payload && payload.item) {
    return normalizeHighlight(payload.item);
  }

  return normalizeHighlight(payload as DailyHighlight);
};

export const listActivities = async (): Promise<Activity[]> => {
  const response = await request<ActivitiesListResponse>({ path: '/activities/list' });
  return extractActivities(response);
};

export const createActivity = async (
  input: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Activity> => {
  const response = await request<ActivityResponse>({ path: '/activities/add', payload: input });
  return extractActivity(response);
};

export const updateActivity = async (payload: UpdateActivityPayload): Promise<Activity> => {
  const response = await request<ActivityResponse>({ path: '/activities/update', payload });
  return extractActivity(response);
};

export const deleteActivity = async (id: string): Promise<void> => {
  await request({ path: '/activities/delete', payload: { id } });
};

export const listLogs = async ({ userId }: ListLogsParams = {}): Promise<LogEntry[]> => {
  const response = await request<LogsListResponse>({ path: '/logs/list', payload: { userId } });
  return extractLogs(response);
};

export const createLog = async (payload: CreateLogPayload): Promise<LogEntry> => {
  const response = await request<LogResponse>({ path: '/logs/add', payload });
  return extractLog(response);
};

export const updateLog = async (payload: UpdateLogPayload): Promise<LogEntry> => {
  const response = await request<LogResponse>({ path: '/logs/update', payload });
  return extractLog(response);
};

export const deleteLog = async (id: string, timestamp: string): Promise<void> => {
  await request({ path: '/logs/delete', payload: { id, timestamp } });
};

export const listHighlights = async ({ userId, date }: ListHighlightsParams = {}): Promise<DailyHighlight[]> => {
  const response = await request<HighlightsListResponse>({
    path: '/highlights/list',
    payload: { userId, date },
  });
  return extractHighlights(response);
};

export const createHighlight = async (payload: CreateHighlightPayload): Promise<DailyHighlight> => {
  const response = await request<HighlightResponse>({ path: '/highlights/add', payload });
  return extractHighlight(response);
};

export const updateHighlight = async (payload: UpdateHighlightPayload): Promise<DailyHighlight> => {
  const response = await request<HighlightResponse>({ path: '/highlights/update', payload });
  return extractHighlight(response);
};

export const deleteHighlight = async (id: string): Promise<void> => {
  await request({ path: '/highlights/delete', payload: { id } });
};
