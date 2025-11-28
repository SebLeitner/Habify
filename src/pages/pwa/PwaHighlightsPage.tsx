import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import TextArea from '../../components/UI/TextArea';
import { useData } from '../../contexts/DataContext';
import { formatDateForDisplay, parseDisplayDateToISO } from '../../utils/datetime';
import { isFirefox } from '../../utils/browser';

const today = () => new Date().toISOString().slice(0, 10);

const PwaHighlightsPage = () => {
  const { state, addHighlight, isLoading, error } = useData();
  const firefox = isFirefox();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const initialDate = today();
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() => (firefox ? formatDateForDisplay(initialDate) : ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const highlights = useMemo(
    () =>
      state.highlights
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.highlights],
  );

  const recentDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(base);
      day.setDate(base.getDate() - (6 - index));
      const isoDate = day.toISOString().slice(0, 10);
      const count = highlights.filter((highlight) => highlight.date === isoDate).length;

      return {
        isoDate,
        label: day.toLocaleDateString('de-DE', { weekday: 'short' }),
        dayNumber: day.toLocaleDateString('de-DE', { day: '2-digit' }),
        count,
      };
    });
  }, [highlights]);

  const highlightsForSelectedDay = useMemo(
    () => highlights.filter((highlight) => highlight.date === selectedDate),
    [highlights, selectedDate],
  );

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (firefox) {
      setFirefoxDateInput(value);
      const parsed = parseDisplayDateToISO(value);
      setDate(parsed);
      return;
    }
    setDate(value);
  };

  const setModalDate = (value: string) => {
    setDate(value);
    if (firefox) {
      setFirefoxDateInput(formatDateForDisplay(value));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    if (!trimmedTitle || !trimmedText || !date) {
      setFormError('Alle Felder ausfüllen – Speichern nur mit aktiver Backend-Verbindung.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await addHighlight({ title: trimmedTitle, text: trimmedText, date });
      setTitle('');
      setText('');
      setIsModalOpen(false);
      setSelectedDate(date);
    } catch (submitError) {
      console.error('PWA: Highlight konnte nicht gespeichert werden', submitError);
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Speichern nicht möglich – bitte stelle die Verbindung zum Backend sicher.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Momente</p>
          <h1 className="text-xl font-semibold text-white">Highlights</h1>
          <p className="text-sm text-slate-400">
            Halte deine besten Momente fest. Speichern funktioniert nur online.
          </p>
        </div>
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="secondary"
              className="flex items-center gap-2 whitespace-nowrap"
              onClick={() => setModalDate(selectedDate)}
            >
              <span className="text-lg">＋</span>
              Neues Highlight
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl focus:outline-none">
              <div className="flex max-h-[85vh] flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-white">Highlight hinzufügen</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                      ✕
                    </button>
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <form className="space-y-3 pt-4" onSubmit={handleSubmit}>
                    <Input label="Titel" value={title} onChange={(event) => setTitle(event.target.value)} required />
                    <label className="block text-sm font-medium text-slate-200">
                      Datum
                      <p className="text-xs text-slate-400">Voreingestellt ist der aktuell gewählte Tag.</p>
                      <input
                        type={firefox ? 'text' : 'date'}
                        lang="de-DE"
                        inputMode="numeric"
                        placeholder={firefox ? 'TT.MM.JJJJ' : undefined}
                        pattern={firefox ? '\\d{2}\\.\\d{2}\\.\\d{4}' : undefined}
                        value={firefox ? firefoxDateInput : date}
                        onChange={handleDateChange}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900"
                        required
                      />
                    </label>
                    <TextArea
                      label="Beschreibung"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Was hat den Tag besonders gemacht?"
                      rows={3}
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <Dialog.Close asChild>
                        <Button variant="ghost" type="button">
                          Abbrechen
                        </Button>
                      </Dialog.Close>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Speichern …' : 'Highlight sichern'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {formError && <p className="text-sm text-red-400">{formError}</p>}

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Letzte 7 Tage</h2>
          <p className="text-xs text-slate-400">Tippe auf einen Tag, um die Highlights zu sehen.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
          {recentDays.map((day) => {
            const colorClasses =
              day.count >= 3
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                : day.count >= 1
                  ? 'border-amber-400/60 bg-amber-500/10 text-amber-100'
                  : 'border-slate-700 bg-slate-800 text-slate-200';

            return (
              <button
                key={day.isoDate}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition hover:-translate-y-[1px] hover:border-slate-600 hover:bg-slate-800/80 ${
                  selectedDate === day.isoDate ? 'ring-2 ring-brand-secondary/80 ring-offset-1 ring-offset-slate-900' : ''
                } ${colorClasses}`}
                onClick={() => setSelectedDate(day.isoDate)}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-300">{day.label}</p>
                  <p className="text-lg font-semibold leading-tight text-white">{day.dayNumber}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-base font-semibold text-white">
                  {day.count === 0 ? '😔' : day.count}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Highlights am {formatDateForDisplay(selectedDate)}
            </h2>
            <p className="text-xs text-slate-500">
              {highlightsForSelectedDay.length} {highlightsForSelectedDay.length === 1 ? 'Eintrag' : 'Einträge'}
            </p>
          </div>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-brand-secondary"
            onClick={() => {
              setModalDate(selectedDate);
              setIsModalOpen(true);
            }}
          >
            <span className="text-lg">＋</span>
            Hinzufügen
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-300">Lade Highlights …</p>
        ) : highlightsForSelectedDay.length === 0 ? (
          <p className="text-sm text-slate-500">Für diesen Tag wurden noch keine Highlights erfasst.</p>
        ) : (
          <ul className="space-y-2">
            {highlightsForSelectedDay.map((highlight) => (
              <li
                key={highlight.id}
                className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3"
              >
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {new Date(highlight.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-semibold text-white">{highlight.title}</p>
                  <p className="text-sm text-slate-300">{highlight.text}</p>
                </div>
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Löschen in der PWA deaktiviert</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PwaHighlightsPage;
