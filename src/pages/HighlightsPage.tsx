import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import DailyHighlights from '../components/Log/DailyHighlights';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import TextArea from '../components/UI/TextArea';
import Spinner from '../components/UI/Spinner';
import { DailyHighlight, useData } from '../contexts/DataContext';
import { formatDateForDisplay, parseDisplayDateToISO } from '../utils/datetime';
import { isFirefox } from '../utils/browser';

const todayAsString = () => format(new Date(), 'yyyy-MM-dd');

const HighlightsPage = () => {
  const { state, addHighlight, deleteHighlight, isLoading, error } = useData();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const firefox = isFirefox();
  const initialDate = todayAsString();
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const groupedHighlights = useMemo(() => {
    const buckets = new Map<string, DailyHighlight[]>();
    state.highlights.forEach((highlight) => {
      const existing = buckets.get(highlight.date) ?? [];
      existing.push(highlight);
      buckets.set(highlight.date, existing);
    });

    return Array.from(buckets.entries())
      .map(([bucketDate, items]) => ({
        date: bucketDate,
        items: items
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [state.highlights]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    if (!trimmedTitle) {
      setFormError('Bitte gib einen Titel für das Highlight ein.');
      return;
    }

    if (!trimmedText) {
      setFormError('Bitte beschreibe dein Highlight.');
      return;
    }

    if (!date) {
      setFormError('Bitte wähle ein Datum.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await addHighlight({ title: trimmedTitle, text: trimmedText, date });
      setTitle('');
      setText('');
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Highlight konnte nicht gespeichert werden.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHighlight = async (highlight: DailyHighlight) => {
    setFormError(null);
    try {
      await deleteHighlight(highlight.id);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Highlight konnte nicht gelöscht werden.';
      setFormError(message);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Highlights</h1>
        <p className="text-sm text-slate-400">
          Sammle deine besonderen Momente und weise ihnen einen Tag zu. Du kannst Highlights benennen und bei
          Bedarf wieder entfernen.
        </p>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Neues Highlight festhalten</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Titel"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Wie heißt dein Highlight?"
            required
          />
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
            placeholder="Was macht diesen Tag besonders?"
            rows={4}
            required
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichern…' : 'Highlight hinzufügen'}
            </Button>
          </div>
        </form>
      </section>
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner label="Lade Highlights" />
          </div>
        ) : groupedHighlights.length === 0 ? (
          <p className="text-sm text-slate-400">Du hast noch keine Highlights gespeichert.</p>
        ) : (
          groupedHighlights.map(({ date: highlightDate, items }) => {
            const heading = format(parseISO(highlightDate), 'EEEE, dd. MMMM yyyy', { locale: de });
            return (
              <DailyHighlights
                key={highlightDate}
                highlights={items}
                onDelete={handleDeleteHighlight}
                title={`Highlights – ${heading}`}
              />
            );
          })
        )}
      </section>
    </div>
  );
};

export default HighlightsPage;
