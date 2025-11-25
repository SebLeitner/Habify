import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
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

  const highlights = useMemo(
    () =>
      state.highlights
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.highlights],
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
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Momente</p>
        <h1 className="text-xl font-semibold text-white">Highlights</h1>
        <p className="text-sm text-slate-400">Halte deine besten Momente fest. Speichern funktioniert nur online.</p>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {formError && <p className="text-sm text-red-400">{formError}</p>}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input label="Titel" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <label className="block text-sm font-medium text-slate-200">
            Datum
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
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichern …' : 'Highlight sichern'}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Letzte Highlights</h2>
        {isLoading ? (
          <p className="text-sm text-slate-300">Lade Highlights …</p>
        ) : highlights.length === 0 ? (
          <p className="text-sm text-slate-500">Noch nichts gespeichert.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((highlight) => (
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
