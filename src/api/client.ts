import type { Activity, LogEntry } from '../types';

const DEFAULT_API_BASE = 'https://v2thu7qsrd.execute-api.eu-central-1.amazonaws.com/dev';
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE).replace(/\/$/, '');

type RequestOptions = {
  path: string;
  payload?: Record<string, unknown>;
};

type ActivitiesListResponse = { items: Activity[] } | Activity[];
type ActivityResponse = { item: Activity } | Activity;
type LogsListResponse = { items: LogEntry[] } | LogEntry[];
type LogResponse = { item: LogEntry } | LogEntry;

type ListLogsParams = { userId?: string };

type UpdateActivityPayload = Partial<Omit<Activity, 'createdAt' | 'updatedAt'>> & { id: string };

type UpdateLogPayload = Partial<LogEntry> & { id: string; userId: string };

type CreateLogPayload = Omit<LogEntry, 'id'> & { id?: string };

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

const normalizeActivity = (activity: Activity): Activity => ({
  ...activity,
  categories: Array.isArray(activity.categories)
    ? activity.categories.map((category) => category.toString())
    : [],
});

const normalizeLog = (log: LogEntry): LogEntry => ({
  ...log,
  note: log.note ?? undefined,
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
