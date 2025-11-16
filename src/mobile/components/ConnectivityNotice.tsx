import Button from '../../components/UI/Button';
import { useConnectivity } from '../../contexts/ConnectivityContext';

const statusCopy: Record<'offline' | 'degraded', string> = {
  offline: 'Keine Internetverbindung erkannt.',
  degraded: 'Backend ist aktuell nicht erreichbar.',
};

const ConnectivityNotice = () => {
  const { status, isChecking, refresh, lastCheckedAt } = useConnectivity();

  if (status === 'connected') {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-2 rounded-lg border border-amber-500/40 bg-amber-900/50 p-4 text-amber-50 shadow-lg shadow-amber-900/30">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Keine Serververbindung</p>
          <p className="text-sm text-amber-100/90">{statusCopy[status] ?? 'Keine Verbindung verfügbar.'}</p>
          <p className="text-xs text-amber-100/70">
            Habify Mobile benötigt eine aktive Verbindung zum Backend. Aktionen sind blockiert, bis die
            Verbindung wiederhergestellt ist.
          </p>
          {lastCheckedAt ? (
            <p className="text-[11px] text-amber-100/60">Letzte Prüfung: {new Date(lastCheckedAt).toLocaleTimeString()}</p>
          ) : null}
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={refresh}
            disabled={isChecking}
            className="px-3 py-2 text-xs"
          >
            {isChecking ? 'Prüfe…' : 'Erneut prüfen'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConnectivityNotice;
