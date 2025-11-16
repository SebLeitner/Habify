import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/UI/Button';
import Spinner from '../../components/UI/Spinner';
import TextArea from '../../components/UI/TextArea';
import { useData } from '../../contexts/DataContext';
import { combineDateAndTimeToISO, currentLocalDate, currentLocalTime } from '../../utils/datetime';

const MobileCapturePage = () => {
  const { state, addLog, isLoading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [date, setDate] = useState(currentLocalDate());
  const [time, setTime] = useState(currentLocalTime());
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (state.activities.length && !selectedActivityId) {
      setSelectedActivityId(state.activities[0].id);
    }
  }, [state.activities, selectedActivityId]);

  const activities = useMemo(
    () =>
      state.activities
        .filter((activity) => activity.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [state.activities, searchTerm],
  );

  const resetForm = () => {
    setNote('');
    setUseCurrentTime(true);
    const nowDate = currentLocalDate();
    const nowTime = currentLocalTime();
    setDate(nowDate);
    setTime(nowTime);
  };

  const createTimestamp = () => {
    if (useCurrentTime) {
      return new Date().toISOString();
    }
    return combineDateAndTimeToISO(date, time || currentLocalTime());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedActivityId) {
      setStatus('Bitte eine Aktivität auswählen.');
      return;
    }

    setIsSaving(true);
    try {
      await addLog({
        activityId: selectedActivityId,
        timestamp: createTimestamp(),
        note: note.trim() || undefined,
      });
      resetForm();
      setStatus('Eintrag gespeichert.');
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : 'Eintrag konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickLog = async (activityId: string) => {
    setIsSaving(true);
    setSelectedActivityId(activityId);
    setStatus(null);
    try {
      await addLog({ activityId, timestamp: new Date().toISOString() });
      resetForm();
      setStatus('Soforteintrag gespeichert.');
    } catch (quickError) {
      setStatus(quickError instanceof Error ? quickError.message : 'Eintrag konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Aktivität eingeben</h1>
            <p className="text-xs text-slate-400">Optimiert für schnelle mobile Eingaben.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            iOS
          </span>
        </div>

        <label className="sr-only" htmlFor="activity-search">
          Aktivitäten suchen
        </label>
        <input
          id="activity-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Aktivität suchen"
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />

        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner label="Lade Aktivitäten" />
            </div>
          ) : activities.length ? (
            activities.map((activity) => {
              const isSelected = selectedActivityId === activity.id;
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => setSelectedActivityId(activity.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                    isSelected
                      ? 'border-brand-primary/50 bg-brand-primary/20 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-100 hover:border-brand-secondary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: `${activity.color}33` }}
                    >
                      {activity.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{activity.name}</span>
                      {activity.categories?.length ? (
                        <span className="text-[11px] text-slate-400">{activity.categories.join(' · ')}</span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Keine Kategorie</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSaving}
                    className="px-3 py-2 text-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleQuickLog(activity.id);
                    }}
                  >
                    Jetzt
                  </Button>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">Keine Aktivitäten gefunden.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Details festhalten</h2>
            <p className="text-xs text-slate-400">Datum/Uhrzeit optional, sonst wird jetzt gespeichert.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <input
              id="use-current"
              type="checkbox"
              checked={useCurrentTime}
              onChange={(event) => setUseCurrentTime(event.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"
            />
            <label htmlFor="use-current" className="select-none">
              Zeitpunkt: Jetzt
            </label>
          </div>
        </div>

        {!useCurrentTime && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="log-date" className="text-xs text-slate-300">
                Datum
              </label>
              <input
                id="log-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="log-time" className="text-xs text-slate-300">
                Uhrzeit
              </label>
              <input
                id="log-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="note" className="text-xs text-slate-300">
            Notiz (optional)
          </label>
          <TextArea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Kurze Notiz hinzufügen"
            className="min-h-[96px]"
          />
        </div>

        {status && <p className="text-sm text-slate-200">{status}</p>}

        <Button type="submit" disabled={isSaving || !selectedActivityId} className="w-full py-3 text-base">
          {isSaving ? 'Speichern …' : 'Logbuch speichern'}
        </Button>
      </form>
    </div>
  );
};

export default MobileCapturePage;
