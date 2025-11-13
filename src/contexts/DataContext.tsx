import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { addDays, startOfDay } from 'date-fns';
import { nanoid } from 'nanoid';
import { useAuth } from './AuthContext';

export type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LogEntry = {
  id: string;
  activityId: string;
  timestamp: string;
  note?: string;
  userId: string;
};

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

const mockActivities = [
  {
    id: 'act-1',
    name: 'Trinken',
    icon: '💧',
    color: '#0ea5e9',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'act-2',
    name: 'Dehnen',
    icon: '🤸',
    color: '#f97316',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const createMockLogs = (userId: string): LogEntry[] => {
  const today = startOfDay(new Date());
  return mockActivities.flatMap((activity, index) =>
    Array.from({ length: 5 }).map((_, offset) => ({
      id: `log-${index}-${offset}`,
      activityId: activity.id,
      timestamp: addDays(today, -offset).toISOString(),
      note: offset % 2 === 0 ? 'Fühlt sich gut an!' : undefined,
      userId,
    })),
  );
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_ACTIVITIES', payload: mockActivities });
      dispatch({ type: 'SET_LOGS', payload: createMockLogs(user.id) });
    } else {
      dispatch({ type: 'SET_ACTIVITIES', payload: [] });
      dispatch({ type: 'SET_LOGS', payload: [] });
    }
  }, [user]);

  const addActivity = useCallback(
    async (input: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newActivity: Activity = {
        ...input,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_ACTIVITY', payload: newActivity });
    },
    [],
  );

  const updateActivity = useCallback(
    async (id: string, updates: Partial<Activity>) => {
      const existing = state.activities.find((activity) => activity.id === id);
      if (!existing) return;
      dispatch({
        type: 'UPDATE_ACTIVITY',
        payload: {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [state.activities],
  );

  const deleteActivity = useCallback(async (id: string) => {
    dispatch({ type: 'REMOVE_ACTIVITY', payload: id });
    dispatch({ type: 'SET_LOGS', payload: state.logs.filter((log) => log.activityId !== id) });
  }, [state.logs]);

  const addLog = useCallback(
    async (input: Omit<LogEntry, 'id' | 'userId'>) => {
      if (!user) throw new Error('Nicht angemeldet');
      const newLog: LogEntry = {
        ...input,
        id: nanoid(),
        userId: user.id,
      };
      dispatch({ type: 'ADD_LOG', payload: newLog });
    },
    [user],
  );

  const updateLog = useCallback(
    async (id: string, updates: Partial<LogEntry>) => {
      const log = state.logs.find((item) => item.id === id);
      if (!log) return;
      dispatch({ type: 'UPDATE_LOG', payload: { ...log, ...updates } });
    },
    [state.logs],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      dispatch({ type: 'REMOVE_LOG', payload: id });
    },
    [],
  );

  const refresh = useCallback(() => {
    // Platzhalter für zukünftige API-Aktualisierung
  }, []);

  const value = useMemo(
    () => ({ state, addActivity, updateActivity, deleteActivity, addLog, updateLog, deleteLog, refresh }),
    [state, addActivity, updateActivity, deleteActivity, addLog, updateLog, deleteLog, refresh],
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
