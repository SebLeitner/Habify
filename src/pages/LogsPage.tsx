import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { addDays, endOfDay, format, isAfter, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import LogList from '../components/Log/LogList';
import Button from '../components/UI/Button';
import Spinner from '../components/UI/Spinner';
import DailyHighlights from '../components/Log/DailyHighlights';
import { type DailyHighlight, LogEntry, useData } from '../contexts/DataContext';
import { formatDateForDisplay, parseDisplayDateToISO } from '../utils/datetime';
import { isFirefox } from '../utils/browser';

const LogsPage = () => {
  const { state, deleteLog, deleteHighlight, isLoading, error } = useData();
  const firefox = isFirefox();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [firefoxDatePickerValue, setFirefoxDatePickerValue] = useState(() =>
    firefox ? formatDateForDisplay(format(startOfDay(new Date()), 'yyyy-MM-dd')) : '',
  );
  const [highlightError, setHighlightError] = useState<string | null>(null);

  useEffect(() => {
    if (!firefox) {
      return;
    }

    const isoDate = format(selectedDate, 'yyyy-MM-dd');
    setFirefoxDatePickerValue(formatDateForDisplay(isoDate));
  }, [firefox, selectedDate]);

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
    if (!value) {
      if (firefox) {
        setFirefoxDatePickerValue('');
      }
      return;
    }

    if (firefox) {
      setFirefoxDatePickerValue(value);
      const parsed = parseDisplayDateToISO(value);
      if (!parsed) {
        return;
      }
      const nextDate = startOfDay(new Date(parsed));
      if (!Number.isNaN(nextDate.getTime())) {
        setSelectedDate(nextDate);
      }
      return;
    }

    const nextDate = startOfDay(new Date(value));
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
    }
  };

  const formattedDateLabel = format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de });
  const datePickerValue = format(selectedDate, 'yyyy-MM-dd');
  const highlightDateKey = format(selectedDate, 'yyyy-MM-dd');
  const highlightsForSelectedDate = useMemo(() => {
    return state.highlights
      .filter((highlight) => highlight.date === highlightDateKey)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [state.highlights, highlightDateKey]);
  const today = startOfDay(new Date());
  const disableNextDay = isSameDay(selectedDate, today) || isAfter(selectedDate, today);

  const handleDelete = async (log: LogEntry) => {
    if (window.confirm('Log-Eintrag wirklich löschen?')) {
      await deleteLog(log.id);
    }
  };

  const handleDeleteHighlight = async (highlight: DailyHighlight) => {
    setHighlightError(null);
    try {
      await deleteHighlight(highlight.id);
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Highlight konnte nicht gelöscht werden.';
      setHighlightError(message);
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
              type={firefox ? 'text' : 'date'}
              lang="de-DE"
              inputMode="numeric"
              placeholder={firefox ? 'TT.MM.JJJJ' : undefined}
              pattern={firefox ? '\\d{2}\\.\\d{2}\\.\\d{4}' : undefined}
              value={firefox ? firefoxDatePickerValue : datePickerValue}
              onChange={handleDatePickerChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
            />
          </label>
        </div>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <DailyHighlights
        highlights={highlightsForSelectedDate}
        onDelete={handleDeleteHighlight}
        error={highlightError}
      />
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Logbuch" />
        </div>
      ) : (
        <LogList logs={filteredLogs} activities={state.activities} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default LogsPage;
