import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import {
  createActivity,
  deleteActivity as deleteActivityRequest,
  deleteLog as deleteLogRequest,
  listActivities,
  listLogs,
  updateActivity as updateActivityRequest,
  updateLog as updateLogRequest,
  createLog,
  listHighlights,
  createHighlight,
  updateHighlight as updateHighlightRequest,
  deleteHighlight as deleteHighlightRequest,
  listMindfulnessEntries,
  createMindfulnessEntry,
  updateMindfulnessEntry,
  deleteMindfulnessEntry,
} from '../api/client';
import type { Activity, DailyHabitTargets, DailyHighlight, LogEntry, MindfulnessActivity } from '../types';
import { useAuth } from './AuthContext';
import { calculateRemainingTargets, normalizeDailyHabitTargets } from '../utils/dailyHabitTargets';
import { isDismissalLog } from '../utils/logs';

export type { Activity, LogEntry, DailyHighlight, MindfulnessActivity } from '../types';

type DataState = {
  activities: Activity[];
  logs: LogEntry[];
  highlights: DailyHighlight[];
  mindfulness: MindfulnessActivity[];
};

type Action =
  | { type: 'SET_ACTIVITIES'; payload: Activity[] }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_ACTIVITY'; payload: Activity }
  | { type: 'REMOVE_ACTIVITY'; payload: string }
  | { type: 'SET_LOGS'; payload: LogEntry[] }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'UPDATE_LOG'; payload: LogEntry }
  | { type: 'REMOVE_LOG'; payload: string }
  | { type: 'SET_HIGHLIGHTS'; payload: DailyHighlight[] }
  | { type: 'ADD_HIGHLIGHT'; payload: DailyHighlight }
  | { type: 'UPDATE_HIGHLIGHT'; payload: DailyHighlight }
  | { type: 'REMOVE_HIGHLIGHT'; payload: string }
  | { type: 'SET_MINDFULNESS'; payload: MindfulnessActivity[] }
  | { type: 'ADD_MINDFULNESS'; payload: MindfulnessActivity }
  | { type: 'UPDATE_MINDFULNESS'; payload: MindfulnessActivity }
  | { type: 'REMOVE_MINDFULNESS'; payload: string };

const initialState: DataState = {
  activities: [],
  logs: [],
  highlights: [],
  mindfulness: [],
};

const DataContext = createContext<{
  state: DataState;
  isLoading: boolean;
  error: string | null;
  addActivity: (input: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  addLog: (input: Omit<LogEntry, 'id' | 'userId'>) => Promise<void>;
  updateLog: (id: string, updates: Partial<LogEntry>) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  addHighlight: (input: Omit<DailyHighlight, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateHighlight: (id: string, updates: Partial<DailyHighlight>) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  addMindfulness: (input: Omit<MindfulnessActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMindfulness: (id: string, updates: Partial<MindfulnessActivity>) => Promise<void>;
  deleteMindfulness: (id: string) => Promise<void>;
  refresh: () => void;
} | null>(null);

const reducer = (state: DataState, action: Action): DataState => {
  switch (action.type) {
    case 'SET_ACTIVITIES':
      return { ...state, activities: action.payload };
    case 'ADD_ACTIVITY':
      return { ...state, activities: [...state.activities, action.payload] };
    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.id ? action.payload : activity,
        ),
      };
    case 'REMOVE_ACTIVITY':
      return { ...state, activities: state.activities.filter((activity) => activity.id !== action.payload) };
    case 'SET_LOGS':
      return { ...state, logs: action.payload };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'UPDATE_LOG':
      return {
        ...state,
        logs: state.logs.map((log) => (log.id === action.payload.id ? action.payload : log)),
      };
    case 'REMOVE_LOG':
      return { ...state, logs: state.logs.filter((log) => log.id !== action.payload) };
    case 'SET_HIGHLIGHTS':
      return { ...state, highlights: action.payload };
    case 'ADD_HIGHLIGHT':
      return { ...state, highlights: [...state.highlights, action.payload] };
    case 'UPDATE_HIGHLIGHT':
      return {
        ...state,
        highlights: state.highlights.map((highlight) =>
          highlight.id === action.payload.id ? action.payload : highlight,
        ),
      };
    case 'REMOVE_HIGHLIGHT':
      return { ...state, highlights: state.highlights.filter((highlight) => highlight.id !== action.payload) };
    case 'SET_MINDFULNESS':
      return { ...state, mindfulness: action.payload };
    case 'ADD_MINDFULNESS':
      return { ...state, mindfulness: [...state.mindfulness, action.payload] };
    case 'UPDATE_MINDFULNESS':
      return {
        ...state,
        mindfulness: state.mindfulness.map((entry) =>
          entry.id === action.payload.id ? action.payload : entry,
        ),
      };
    case 'REMOVE_MINDFULNESS':
      return { ...state, mindfulness: state.mindfulness.filter((entry) => entry.id !== action.payload) };
    default:
      return state;
  }
};

const resolveDailyHabitTimeSlot = (
  activity: Activity | undefined,
  timestamp: string,
  requestedSlot: LogEntry['timeSlot'],
  existingLogs: LogEntry[],
): LogEntry['timeSlot'] => {
  if (!activity || !requestedSlot) {
    return requestedSlot;
  }

  const target = normalizeDailyHabitTargets(activity.minLogsPerDay);
  if (target.morning + target.day + target.evening <= 0) {
    return requestedSlot;
  }

  const start = startOfDay(new Date(timestamp));
  const end = endOfDay(new Date(timestamp));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return requestedSlot;
  }

  const dailyLogs = existingLogs.filter((log) => {
    if (log.activityId !== activity.id || isDismissalLog(log)) {
      return false;
    }

    const logDate = new Date(log.timestamp);
    return isWithinInterval(logDate, { start, end });
  });

  const counts: DailyHabitTargets & { unslotted: number } = {
    morning: 0,
    day: 0,
    evening: 0,
    unslotted: 0,
  };

  dailyLogs.forEach((log) => {
    const slot = log.timeSlot;
    if (slot && ['morning', 'day', 'evening'].includes(slot)) {
      counts[slot as keyof DailyHabitTargets] += 1;
    } else {
      counts.unslotted += 1;
    }
  });

  const remainingAfterSlotted: DailyHabitTargets = {
    morning: Math.max(target.morning - counts.morning, 0),
    day: Math.max(target.day - counts.day, 0),
    evening: Math.max(target.evening - counts.evening, 0),
  };

  const remaining = calculateRemainingTargets(remainingAfterSlotted, counts.unslotted);

  if (remaining[requestedSlot] > 0) {
    return requestedSlot;
  }

  const fallbackSlot = (['morning', 'day', 'evening'] as const).find((slot) => remaining[slot] > 0);

  return fallbackSlot ?? requestedSlot;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_ACTIVITIES', payload: [] });
      dispatch({ type: 'SET_LOGS', payload: [] });
      dispatch({ type: 'SET_HIGHLIGHTS', payload: [] });
      dispatch({ type: 'SET_MINDFULNESS', payload: [] });
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [activityResponse, logResponse, highlightsResponse, mindfulnessResponse] = await Promise.all([
        listActivities(),
        listLogs({ userId: user.id }),
        listHighlights({ userId: user.id }),
        listMindfulnessEntries(),
      ]);
      dispatch({ type: 'SET_ACTIVITIES', payload: activityResponse });
      dispatch({ type: 'SET_LOGS', payload: logResponse });
      dispatch({ type: 'SET_HIGHLIGHTS', payload: highlightsResponse });
      dispatch({ type: 'SET_MINDFULNESS', payload: mindfulnessResponse });
      setError(null);
    } catch (apiError) {
      console.error('Fehler beim Laden der Daten', apiError);
      setError(
        apiError instanceof Error
          ? apiError.message
          : 'Daten konnten nicht geladen werden.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addActivity = useCallback(
    async (input: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createActivity(input);
        dispatch({ type: 'ADD_ACTIVITY', payload: created });
      } catch (apiError) {
        console.error('Aktivität konnte nicht erstellt werden', apiError);
        throw apiError;
      }
    },
    [],
  );

  const updateActivity = useCallback(
    async (id: string, updates: Partial<Activity>) => {
      try {
        const updated = await updateActivityRequest({ id, ...updates });
        dispatch({ type: 'UPDATE_ACTIVITY', payload: updated });
      } catch (apiError) {
        console.error('Aktivität konnte nicht aktualisiert werden', apiError);
        throw apiError;
      }
    },
    [],
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      try {
        await deleteActivityRequest(id);
        dispatch({ type: 'REMOVE_ACTIVITY', payload: id });
        dispatch({
          type: 'SET_LOGS',
          payload: state.logs.filter((log) => log.activityId !== id),
        });
      } catch (apiError) {
        console.error('Aktivität konnte nicht gelöscht werden', apiError);
        throw apiError;
      }
    },
    [state.logs],
  );

  const addLog = useCallback(
    async (input: Omit<LogEntry, 'id' | 'userId'>) => {
      if (!user) throw new Error('Nicht angemeldet');
      try {
        const activity = state.activities.find((item) => item.id === input.activityId);
        const resolvedSlot = resolveDailyHabitTimeSlot(activity, input.timestamp, input.timeSlot, state.logs);
        const created = await createLog({ ...input, userId: user.id, timeSlot: resolvedSlot });
        dispatch({ type: 'ADD_LOG', payload: created });
      } catch (apiError) {
        console.error('Log-Eintrag konnte nicht erstellt werden', apiError);
        throw apiError;
      }
    },
    [state.activities, state.logs, user],
  );

  const updateLog = useCallback(
    async (id: string, updates: Partial<LogEntry>) => {
      if (!user) throw new Error('Nicht angemeldet');
      try {
        const updated = await updateLogRequest({ id, ...updates, userId: user.id });
        dispatch({ type: 'UPDATE_LOG', payload: updated });
      } catch (apiError) {
        console.error('Log-Eintrag konnte nicht aktualisiert werden', apiError);
        throw apiError;
      }
    },
    [user],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      const existing = state.logs.find((log) => log.id === id);
      if (!existing) return;
      try {
        await deleteLogRequest(id, existing.timestamp);
        dispatch({ type: 'REMOVE_LOG', payload: id });
      } catch (apiError) {
        console.error('Log-Eintrag konnte nicht gelöscht werden', apiError);
        throw apiError;
      }
    },
    [state.logs],
  );

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const addHighlight = useCallback(
    async (input: Omit<DailyHighlight, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('Nicht angemeldet');
      try {
        const created = await createHighlight({ ...input, userId: user.id });
        dispatch({ type: 'ADD_HIGHLIGHT', payload: created });
      } catch (apiError) {
        console.error('Highlight konnte nicht erstellt werden', apiError);
        throw apiError;
      }
    },
    [user],
  );

  const updateHighlight = useCallback(
    async (id: string, updates: Partial<DailyHighlight>) => {
      if (!user) throw new Error('Nicht angemeldet');
      try {
        const updated = await updateHighlightRequest({ id, ...updates, userId: user.id });
        dispatch({ type: 'UPDATE_HIGHLIGHT', payload: updated });
      } catch (apiError) {
        console.error('Highlight konnte nicht aktualisiert werden', apiError);
        throw apiError;
      }
    },
    [user],
  );

  const deleteHighlight = useCallback(async (id: string) => {
    try {
      await deleteHighlightRequest(id);
      dispatch({ type: 'REMOVE_HIGHLIGHT', payload: id });
    } catch (apiError) {
      console.error('Highlight konnte nicht gelöscht werden', apiError);
      throw apiError;
    }
  }, []);

  const addMindfulness = useCallback(
    async (input: Omit<MindfulnessActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createMindfulnessEntry(input);
        dispatch({ type: 'ADD_MINDFULNESS', payload: created });
      } catch (apiError) {
        console.error('Achtsamkeitsaktivität konnte nicht erstellt werden', apiError);
        throw apiError;
      }
    },
    [],
  );

  const updateMindfulness = useCallback(
    async (id: string, updates: Partial<MindfulnessActivity>) => {
      try {
        const updated = await updateMindfulnessEntry({ id, ...updates });
        dispatch({ type: 'UPDATE_MINDFULNESS', payload: updated });
      } catch (apiError) {
        console.error('Achtsamkeitsaktivität konnte nicht aktualisiert werden', apiError);
        throw apiError;
      }
    },
    [],
  );

  const deleteMindfulness = useCallback(async (id: string) => {
    try {
      await deleteMindfulnessEntry(id);
      dispatch({ type: 'REMOVE_MINDFULNESS', payload: id });
    } catch (apiError) {
      console.error('Achtsamkeitsaktivität konnte nicht gelöscht werden', apiError);
      throw apiError;
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      isLoading,
      error,
      addActivity,
      updateActivity,
      deleteActivity,
      addLog,
      updateLog,
      deleteLog,
      addHighlight,
      updateHighlight,
      deleteHighlight,
      addMindfulness,
      updateMindfulness,
      deleteMindfulness,
      refresh,
    }),
    [
      state,
      isLoading,
      error,
      addActivity,
      updateActivity,
      deleteActivity,
      addLog,
      updateLog,
      deleteLog,
      addHighlight,
      updateHighlight,
      deleteHighlight,
      addMindfulness,
      updateMindfulness,
      deleteMindfulness,
      refresh,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData muss innerhalb von DataProvider verwendet werden.');
  }
  return context;
};
