import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { checkBackendHealth } from '../api/client';

type ConnectivityStatus = 'connected' | 'degraded' | 'offline';

type ConnectivityContextValue = {
  status: ConnectivityStatus;
  isChecking: boolean;
  lastCheckedAt: number | null;
  refresh: () => void;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

const evaluateStatus = (hasNetwork: boolean, backendReachable: boolean): ConnectivityStatus => {
  if (!hasNetwork) {
    return 'offline';
  }

  if (!backendReachable) {
    return 'degraded';
  }

  return 'connected';
};

export const ConnectivityProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectivityStatus>('connected');
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const intervalRef = useRef<number | undefined>();

  const runHealthCheck = useCallback(async () => {
    const hasNetwork = navigator.onLine;

    if (!hasNetwork) {
      setStatus('offline');
      setLastCheckedAt(Date.now());
      return;
    }

    setIsChecking(true);
    try {
      const backendReachable = await checkBackendHealth();
      setStatus(evaluateStatus(hasNetwork, backendReachable));
    } catch (error) {
      console.error('Backend-Health-Check fehlgeschlagen', error);
      setStatus('degraded');
    } finally {
      setIsChecking(false);
      setLastCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    runHealthCheck();

    const handleOnline = () => runHealthCheck();
    const handleOffline = () => setStatus('offline');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runHealthCheck();
      }
    };
    const handleFocus = () => runHealthCheck();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    intervalRef.current = window.setInterval(runHealthCheck, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [runHealthCheck]);

  const value = useMemo(
    () => ({
      status,
      isChecking,
      lastCheckedAt,
      refresh: runHealthCheck,
    }),
    [status, isChecking, lastCheckedAt, runHealthCheck],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
};

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);

  if (!context) {
    throw new Error('useConnectivity muss innerhalb von ConnectivityProvider verwendet werden');
  }

  return context;
};
