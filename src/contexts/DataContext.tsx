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
import {
  createActivity,
  deleteActivity as deleteActivityRequest,
  deleteLog as deleteLogRequest,
  listActivities,
  listLogs,
  updateActivity as updateActivityRequest,
  updateLog as updateLogRequest,
  createLog,
} from '../api/client';
import type { Activity, LogEntry } from '../types';
import { useAuth } from './AuthContext';

export type { Activity, LogEntry } from '../types';

type DataState = {
  activities: Activity[];
  logs: LogEntry[];
};

type Action =
  | { type: 'SET_ACTIVITIES'; payload: Activity[] }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_ACTIVITY'; payload: Activity }
  | { type: 'REMOVE_ACTIVITY'; payload: string }
  | { type: 'SET_LOGS'; payload: LogEntry[] }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'UPDATE_LOG'; payload: LogEntry }
  | { type: 'REMOVE_LOG'; payload: string };

const initialState: DataState = {
  activities: [],
  logs: [],
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
    default:
      return state;
  }
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
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [activityResponse, logResponse] = await Promise.all([
        listActivities(),
        listLogs({ userId: user.id }),
      ]);
      dispatch({ type: 'SET_ACTIVITIES', payload: activityResponse });
      dispatch({ type: 'SET_LOGS', payload: logResponse });
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
        const created = await createLog({ ...input, userId: user.id });
        dispatch({ type: 'ADD_LOG', payload: created });
      } catch (apiError) {
        console.error('Log-Eintrag konnte nicht erstellt werden', apiError);
        throw apiError;
      }
    },
    [user],
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
      refresh,
    }),
    [state, isLoading, error, addActivity, updateActivity, deleteActivity, addLog, updateLog, deleteLog, refresh],
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
