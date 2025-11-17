import { format } from 'date-fns';
import { FormEvent, useMemo, useState } from 'react';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Spinner from '../components/UI/Spinner';
import { useData } from '../contexts/DataContext';
import { currentLocalDate, formatDateForDisplay } from '../utils/datetime';

const formatMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 Min.';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} Min.`;
  }

  return `${hours} Std. ${remainingMinutes.toString().padStart(2, '0')} Min.`;
};

const TrainingDiaryPage = () => {
  const { state, addTrainingDuration, isLoading, error } = useData();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [manualDate, setManualDate] = useState(currentLocalDate());
  const [manualMinutes, setManualMinutes] = useState('30');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = currentLocalDate();

  const todayEntry = useMemo(
    () => state.trainingTimes.find((entry) => entry.date === today),
    [state.trainingTimes, today],
  );

  const sortedEntries = useMemo(
    () =>
      [...state.trainingTimes].sort((a, b) =>
        a.date === b.date ? 0 : a.date < b.date ? 1 : -1,
      ),
    [state.trainingTimes],
  );

  const handleStart = () => {
    setSaveError(null);
    setStartTime(new Date());
  };

  const persistDuration = async (date: string, minutes: number) => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await addTrainingDuration({ date, minutes });
    } catch (apiError) {
      setSaveError(apiError instanceof Error ? apiError.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStop = async () => {
    if (!startTime) return;

    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - startTime.getTime()) / 1000 / 60),
    );

    await persistDuration(today, durationMinutes);
    setStartTime(null);
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const minutes = Number(manualMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setSaveError('Bitte eine Dauer in Minuten größer 0 angeben.');
      return;
    }

    await persistDuration(manualDate, minutes);
    setManualMinutes('30');
  };

  const isTrainingRunning = Boolean(startTime);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-secondary">Trainingstagebuch</h1>
        <p className="mt-2 text-sm text-slate-300">
          Messe deine Trainingszeit, addiere sie pro Tag und behalte den Überblick über deine
          Fortschritte.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Spinner className="h-4 w-4" />
          Daten werden geladen ...
        </div>
      )}

      {error && <p className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">{error}</p>}
      {saveError && (
        <p className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">{saveError}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 shadow-inner shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Heutige Gesamtzeit</p>
              <p className="text-3xl font-semibold text-white">
                {formatMinutes(todayEntry?.totalMinutes ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Stand: {format(new Date(), 'HH:mm')} Uhr</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                type="button"
                onClick={isTrainingRunning ? handleStop : handleStart}
                variant={isTrainingRunning ? 'secondary' : 'primary'}
                disabled={isSaving}
              >
                {isTrainingRunning ? 'Training beenden' : 'Training starten'}
              </Button>
              {isTrainingRunning && (
                <p className="text-xs text-brand-secondary">
                  läuft seit {format(startTime ?? new Date(), 'HH:mm')} Uhr
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 shadow-inner shadow-black/20">
          <h2 className="text-lg font-semibold text-white">Training manuell hinzufügen</h2>
          <p className="mt-1 text-sm text-slate-300">
            Lies den aktuellen Stand für den ausgewählten Tag, addiere die Trainingsdauer und speichere
            den neuen Wert in deinem Tagebuch.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleManualSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-200">
                Datum
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(event) => setManualDate(event.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-sm text-slate-200">
                Trainingsdauer (Minuten)
                <Input
                  type="number"
                  min="1"
                  value={manualMinutes}
                  onChange={(event) => setManualMinutes(event.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
            <Button type="submit" disabled={isSaving}>
              Zeitstand aktualisieren
            </Button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Trainings-Tagebuch</h2>
          <p className="text-xs text-slate-400">Zeigt die kumulierte Zeit pro Tag</p>
        </div>
        {sortedEntries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">Bisher wurden keine Trainingszeiten erfasst.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-800 border border-slate-800/80 rounded-lg">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {formatDateForDisplay(entry.date)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Zuletzt aktualisiert: {format(new Date(entry.updatedAt), 'dd.MM.yyyy HH:mm')} Uhr
                  </p>
                </div>
                <p className="text-lg font-semibold text-brand-secondary">
                  {formatMinutes(entry.totalMinutes)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingDiaryPage;
