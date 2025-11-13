import { Activity, LogEntry } from '../contexts/DataContext';

export type StatsResponse = {
  today: Array<{ activityId: string; count: number }>;
  week: Array<{ activityId: string; count: number }>;
  month: Array<{ activityId: string; counts: Record<string, number> }>;
};

export const fetchActivities = async (): Promise<Activity[]> => {
  throw new Error('API-Aufruf nicht implementiert. In der lokalen Demo werden Mock-Daten verwendet.');
};

export const fetchLogs = async (): Promise<LogEntry[]> => {
  throw new Error('API-Aufruf nicht implementiert. In der lokalen Demo werden Mock-Daten verwendet.');
};

export const fetchStats = async (): Promise<StatsResponse> => {
  throw new Error('API-Aufruf nicht implementiert. In der lokalen Demo werden Mock-Daten verwendet.');
};
