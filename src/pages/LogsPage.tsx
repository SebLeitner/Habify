import { useMemo, useState } from 'react';
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import LogForm from '../components/Log/LogForm';
import LogList from '../components/Log/LogList';
import Button from '../components/UI/Button';
import Spinner from '../components/UI/Spinner';
import { LogEntry, useData } from '../contexts/DataContext';

const LogsPage = () => {
  const { state, addLog, updateLog, deleteLog, isLoading, error } = useData();
  const [filter, setFilter] = useState<'day' | 'week' | 'month'>('day');
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);
    if (filter === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    }
    if (filter === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }
    return state.logs
      .filter((log) => {
        const date = new Date(log.timestamp);
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.logs, filter]);

  const handleCreate = async (values: { activityId: string; timestamp: string; note?: string }) => {
    await addLog(values);
  };

  const handleUpdate = async (values: { activityId: string; timestamp: string; note?: string }) => {
    if (!editing) return;
    await updateLog(editing.id, values);
    setEditing(null);
  };

  const handleDelete = async (log: LogEntry) => {
    if (window.confirm('Log-Eintrag wirklich löschen?')) {
      await deleteLog(log.id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logbuch</h1>
          <p className="text-sm text-slate-400">Dokumentiere deine Aktivitäten und halte Fortschritte fest.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            Zeitraum
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as 'day' | 'week' | 'month')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="day">Heute</option>
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
            </select>
          </div>
        </div>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Neuen Log-Eintrag speichern</h2>
        <LogForm activities={state.activities} onSubmit={handleCreate} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Logbuch" />
        </div>
      ) : (
        <LogList logs={filteredLogs} activities={state.activities} onEdit={setEditing} onDelete={handleDelete} />
      )}
      {editing && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Log-Eintrag bearbeiten</h2>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Schließen
            </Button>
          </div>
          <LogForm
            activities={state.activities}
            initialLog={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
    </div>
  );
};

export default LogsPage;
