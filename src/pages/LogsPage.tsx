import { ChangeEvent, useMemo, useState } from 'react';
import { addDays, endOfDay, format, isAfter, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import LogForm from '../components/Log/LogForm';
import LogList from '../components/Log/LogList';
import Button from '../components/UI/Button';
import Spinner from '../components/UI/Spinner';
import { LogEntry, useData } from '../contexts/DataContext';

const LogsPage = () => {
  const { state, addLog, updateLog, deleteLog, isLoading, error } = useData();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return state.logs
      .filter((log) => {
        const date = new Date(log.timestamp);
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [state.logs, selectedDate]);

  const goToPreviousDay = () => {
    setSelectedDate((current) => startOfDay(addDays(current, -1)));
  };

  const goToNextDay = () => {
    setSelectedDate((current) => startOfDay(addDays(current, 1)));
  };

  const handleDatePickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (!value) return;
    const nextDate = startOfDay(new Date(value));
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
    }
  };

  const formattedDateLabel = format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de });
  const datePickerValue = format(selectedDate, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const disableNextDay = isSameDay(selectedDate, today) || isAfter(selectedDate, today);

  const handleCreate = async (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    attributes?: LogEntry['attributes'];
  }) => {
    await addLog(values);
    const newDate = startOfDay(new Date(values.timestamp));
    if (!Number.isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const handleUpdate = async (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    attributes?: LogEntry['attributes'];
  }) => {
    if (!editing) return;
    await updateLog(editing.id, values);
    const updatedDate = startOfDay(new Date(values.timestamp));
    if (!Number.isNaN(updatedDate.getTime())) {
      setSelectedDate(updatedDate);
    }
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
          <p className="text-sm text-slate-400">
            Wechsle den Tag mit den Pfeilen oder wähle ein Datum aus, um alle Aktivitäten chronologisch zu sehen.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-300 md:flex-row md:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <Button
              type="button"
              variant="ghost"
              onClick={goToPreviousDay}
              className="px-3 py-2"
              aria-label="Vorheriger Tag"
            >
              ←
            </Button>
            <span className="min-w-[200px] text-center text-base font-semibold text-white">{formattedDateLabel}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={goToNextDay}
              className="px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disableNextDay}
              aria-label="Nächster Tag"
            >
              →
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            Datum wählen
            <input
              type="date"
              value={datePickerValue}
              onChange={handleDatePickerChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
            />
          </label>
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
