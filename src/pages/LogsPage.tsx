import * as Dialog from '@radix-ui/react-dialog';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { de } from 'date-fns/locale';
import LogForm from '../components/Log/LogForm';
import LogList from '../components/Log/LogList';
import Button from '../components/UI/Button';
import Spinner from '../components/UI/Spinner';
import DailyHighlights from '../components/Log/DailyHighlights';
import { type DailyHighlight, LogEntry, useData } from '../contexts/DataContext';
import { formatDateForDisplay, parseDisplayDateToISO } from '../utils/datetime';
import { isFirefox } from '../utils/browser';
import { buildPdfPages, downloadPdf, wrapText } from '../utils/pdf';

const LogsPage = () => {
  const { state, deleteLog, deleteHighlight, isLoading, error, updateLog } = useData();
  const firefox = isFirefox();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [firefoxDatePickerValue, setFirefoxDatePickerValue] = useState(() =>
    firefox ? formatDateForDisplay(format(startOfDay(new Date()), 'yyyy-MM-dd')) : '',
  );
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [logActionError, setLogActionError] = useState<string | null>(null);
  const [, setIsProcessingLog] = useState(false);
  const [exportStart, setExportStart] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  );
  const [exportEnd, setExportEnd] = useState(() =>
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const activityLookup = useMemo(() => {
    return new Map(state.activities.map((activity) => [activity.id, activity]));
  }, [state.activities]);

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
    if (!window.confirm('Log-Eintrag wirklich löschen?')) return;

    setLogActionError(null);
    setIsProcessingLog(true);
    try {
      await deleteLog(log.id);
      if (editingLog?.id === log.id) {
        setEditingLog(null);
      }
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Log-Eintrag konnte nicht gelöscht werden.';
      setLogActionError(message);
    } finally {
      setIsProcessingLog(false);
    }
  };

  const handleEdit = (log: LogEntry) => {
    setLogActionError(null);
    setEditingLog(log);
  };

  const handleUpdateLog = async (values: Parameters<typeof updateLog>[1]) => {
    if (!editingLog) return;

    setIsProcessingLog(true);
    setLogActionError(null);
    try {
      await updateLog(editingLog.id, values);
      setEditingLog(null);
    } catch (apiError) {
      const message =
        apiError instanceof Error ? apiError.message : 'Log-Eintrag konnte nicht aktualisiert werden.';
      setLogActionError(message);
    } finally {
      setIsProcessingLog(false);
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

  const buildDailyLines = (startDate: Date, endDate: Date) => {
    const dayLines: string[] = [];
    const dayList = eachDayOfInterval({ start: startDate, end: endDate });
    const logsInRange = state.logs
      .filter((log) =>
        isWithinInterval(new Date(log.timestamp), {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        }),
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const highlightsInRange = state.highlights.filter((highlight) => {
      const date = new Date(highlight.date);
      return isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) });
    });

    if (!logsInRange.length && !highlightsInRange.length) {
      return ['Keine Einträge im gewählten Zeitraum.'];
    }

    dayList.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayLogs = logsInRange.filter((log) => format(new Date(log.timestamp), 'yyyy-MM-dd') === dateKey);
      const dayHighlights = highlightsInRange.filter((highlight) => highlight.date === dateKey);

      if (!dayLogs.length && !dayHighlights.length) {
        return;
      }

      dayLines.push(`${format(day, 'EEEE, dd.MM.yyyy', { locale: de })}`);

      if (dayHighlights.length) {
        dayLines.push('  Highlights:');
        dayHighlights.forEach((highlight) => {
          dayLines.push(...wrapText(`- ${highlight.title}: ${highlight.text}`, 100));
        });
      }

      if (dayLogs.length) {
        dayLines.push('  Aktivitäten:');
        dayLogs.forEach((log) => {
          const activity = activityLookup.get(log.activityId);
          const timeLabel = format(new Date(log.timestamp), 'HH:mm');
          const baseLine = `${timeLabel} • ${activity?.name ?? 'Aktivität'}${
            log.note ? ` - ${log.note}` : ''
          }`;
          wrapText(baseLine, 100).forEach((line, index) => {
            dayLines.push(index === 0 ? `- ${line}` : `  ${line}`);
          });
        });
      }

      dayLines.push('');
    });

    return dayLines;
  };

  const buildWeeklyStats = (startDate: Date, endDate: Date) => {
    const statsLines: string[] = [];
    const logsInRange = state.logs.filter((log) =>
      isWithinInterval(new Date(log.timestamp), {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      }),
    );

    if (!logsInRange.length) {
      return statsLines;
    }

    const weekBuckets = new Map<string, Map<string, number>>();

    logsInRange.forEach((log) => {
      const weekStart = startOfWeek(new Date(log.timestamp), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(log.timestamp), { weekStartsOn: 1 });
      const weekKey = `${format(weekStart, 'yyyy-MM-dd')}__${format(weekEnd, 'yyyy-MM-dd')}`;
      if (!weekBuckets.has(weekKey)) {
        weekBuckets.set(weekKey, new Map());
      }
      const weekMap = weekBuckets.get(weekKey)!;
      weekMap.set(log.activityId, (weekMap.get(log.activityId) ?? 0) + 1);
    });

    statsLines.push('Wöchentliche Statistiken');
    Array.from(weekBuckets.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .forEach(([key, counts]) => {
        const [startKey, endKey] = key.split('__');
        statsLines.push(
          `${format(new Date(startKey), 'dd.MM.yyyy')} – ${format(new Date(endKey), 'dd.MM.yyyy')}`,
        );
        counts.forEach((count, activityId) => {
          const activity = activityLookup.get(activityId);
          statsLines.push(`- ${activity?.name ?? 'Aktivität'}: ${count}x`);
        });
        statsLines.push('');
      });

    return statsLines;
  };

  const handleExport = () => {
    setExportError(null);
    const parsedStart = startOfDay(new Date(exportStart));
    const parsedEnd = endOfDay(new Date(exportEnd));

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      setExportError('Bitte gib ein gültiges Start- und Enddatum an.');
      return;
    }

    if (parsedStart > parsedEnd) {
      setExportError('Das Startdatum darf nicht nach dem Enddatum liegen.');
      return;
    }

    setIsExporting(true);

    try {
      const lines: string[] = [];
      lines.push('Logbuch Export');
      lines.push(
        `Zeitraum: ${format(parsedStart, 'dd.MM.yyyy')} – ${format(parsedEnd, 'dd.MM.yyyy')}`,
      );
      lines.push('');

      lines.push(...buildDailyLines(parsedStart, parsedEnd));

      const weeklyLines = buildWeeklyStats(parsedStart, parsedEnd);
      if (weeklyLines.length) {
        lines.push('', ...weeklyLines);
      }

      const pages = buildPdfPages(lines);
      downloadPdf(`logbuch-${exportStart}-bis-${exportEnd}.pdf`, pages.length ? pages : [['Keine Daten']]);
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : 'PDF konnte nicht erstellt werden.';
      setExportError(message);
    } finally {
      setIsExporting(false);
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
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Logbuch exportieren</h2>
            <p className="text-sm text-slate-400">
              Wähle einen Zeitraum, um Highlights, Aktivitäten und wöchentliche Statistiken als PDF zu speichern.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-300 md:flex-row md:items-end md:gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Startdatum</span>
              <input
                type="date"
                value={exportStart}
                onChange={(event) => setExportStart(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Enddatum</span>
              <input
                type="date"
                value={exportEnd}
                onChange={(event) => setExportEnd(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
              />
            </label>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'PDF wird erstellt…' : 'PDF erstellen'}
            </Button>
          </div>
        </div>
        {exportError && <p className="pt-3 text-sm text-red-400">{exportError}</p>}
      </section>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <DailyHighlights
        highlights={highlightsForSelectedDate}
        onDelete={handleDeleteHighlight}
        error={highlightError}
      />
      {logActionError && <p className="text-sm text-red-400">{logActionError}</p>}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Logbuch" />
        </div>
      ) : (
        <LogList
          logs={filteredLogs}
          activities={state.activities}
          allLogs={state.logs}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      <Dialog.Root open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl focus:outline-none">
            {editingLog && (
              <div className="flex max-h-[85vh] flex-col">
                <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-white">Log-Eintrag bearbeiten</Dialog.Title>
                    <Dialog.Description className="text-sm text-slate-400">
                      Änderungen werden direkt gespeichert. Verbindung zum Backend erforderlich.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                      ✕
                    </button>
                  </Dialog.Close>
                </header>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <div className="space-y-4 pt-4">
                    <LogForm
                      activities={state.activities}
                      logs={state.logs}
                      initialLog={editingLog}
                      onSubmit={handleUpdateLog}
                      onCancel={() => setEditingLog(null)}
                    />
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default LogsPage;
