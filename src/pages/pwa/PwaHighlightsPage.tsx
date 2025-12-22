import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import TextArea from '../../components/UI/TextArea';
import { DailyHighlight, useData } from '../../contexts/DataContext';
import {
  currentLocalDate,
  formatDateForDisplay,
  parseDisplayDateToISO,
  toLocalDateInput,
} from '../../utils/datetime';
import { isFirefox } from '../../utils/browser';
import { buildMixedPdfPages, createCoverPage, downloadPdf, PdfImage, PdfLayoutBlock, wrapText } from '../../utils/pdf';
import { compressImageFile } from '../../utils/image';

const PwaHighlightsPage = () => {
  const { state, addHighlight, updateHighlight, deleteHighlight, isLoading, error } = useData();
  const firefox = isFirefox();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const initialDate = currentLocalDate();
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() => (firefox ? formatDateForDisplay(initialDate) : ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<{ dataUrl: string; name: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_PHOTO_SIZE_BYTES = 360 * 1024; // DynamoDB Item limit is 400 KB – stay below to be safe

  const PDF_MAX_IMAGE_WIDTH = (15 / 2.54) * 72; // 15 cm in PDF points
  const PDF_MAX_IMAGE_HEIGHT = (8 / 2.54) * 72; // 8 cm in PDF points

  const highlights = useMemo(
    () =>
      state.highlights
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.highlights],
  );

  const highlightsByDayAscending = useMemo(() => {
    const ascending = state.highlights
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const buckets = new Map<string, typeof ascending>();

    ascending.forEach((item) => {
      const list = buckets.get(item.date) ?? [];
      list.push(item);
      buckets.set(item.date, list);
    });

    return Array.from(buckets.entries()).map(([isoDate, entries]) => ({ isoDate, entries }));
  }, [state.highlights]);

  const recentDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(base);
      day.setDate(base.getDate() - (6 - index));
      const isoDate = toLocalDateInput(day.toISOString());
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

  const resetForm = () => {
    setTitle('');
    setText('');
    setModalDate(initialDate);
    setFormError(null);
    setHighlightError(null);
    setEditingHighlightId(null);
    setPhotoPreviews([]);
    setPhotoNames([]);
    setPendingPhoto(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();
    const photos = photoPreviews.slice(0, 3);

    if (!trimmedTitle || !trimmedText || !date) {
      setFormError('Alle Felder ausfüllen – Speichern nur mit aktiver Backend-Verbindung.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingHighlightId) {
        await updateHighlight(editingHighlightId, {
          title: trimmedTitle,
          text: trimmedText,
          date,
          photos,
          photoUrl: photos[0] ?? null,
        });
        setEditingHighlightId(null);
      } else {
        await addHighlight({ title: trimmedTitle, text: trimmedText, date, photos, photoUrl: photos[0] ?? null });
      }
      setTitle('');
      setText('');
      setPhotoPreviews([]);
      setPhotoNames([]);
      setIsModalOpen(false);
      setSelectedDate(date);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const handleHighlightClick = (highlightId: string) => {
    const highlight = highlights.find((item) => item.id === highlightId);
    if (!highlight) return;

    setEditingHighlightId(highlight.id);
    setTitle(highlight.title ?? '');
    setText(highlight.text ?? '');
    setModalDate(highlight.date);
    const photos = resolveHighlightPhotos(highlight);
    setPhotoPreviews(photos);
    setPhotoNames(photos.map(() => 'Gespeichertes Foto'));
    setPendingPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsModalOpen(true);
  };

  const handleDeleteCurrentHighlight = async () => {
    if (!editingHighlightId) return;

    const confirmed = window.confirm('Willst du dieses Highlight wirklich löschen?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteHighlight(editingHighlightId);
      setHighlightError(null);
      setIsModalOpen(false);
      setEditingHighlightId(null);
      resetForm();
    } catch (deleteError) {
      console.error('PWA: Highlight konnte nicht gelöscht werden', deleteError);
      setHighlightError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Highlight konnte nicht gelöscht werden – bitte versuche es erneut.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsModalOpen(open);
  };

  useEffect(() => {
    if (isModalOpen && editingHighlightId && textAreaRef.current) {
      textAreaRef.current.focus({ preventScroll: true });
      textAreaRef.current.selectionStart = textAreaRef.current.value.length;
    }
  }, [isModalOpen, editingHighlightId]);

  const resolveHighlightPhotos = (highlight: DailyHighlight): string[] =>
    highlight.photos?.length ? highlight.photos : highlight.photoUrl ? [highlight.photoUrl] : [];

  const prepareImageForPdf = async (source: string): Promise<PdfImage | null> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = async () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error('Ungültige Bildabmessungen.'));
          return;
        }
        const scale = Math.min(PDF_MAX_IMAGE_WIDTH / image.naturalWidth, PDF_MAX_IMAGE_HEIGHT / image.naturalHeight, 1);
        const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Bild konnte nicht gerendert werden.'));
          return;
        }
        context.drawImage(image, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Bild konnte nicht verarbeitet werden.'));
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve({ data: new Uint8Array(buffer), width: targetWidth, height: targetHeight });
        }, 'image/jpeg', 0.9);
      };
      image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      image.src = source;
    });
  };

  const buildPdfBlocks = async (): Promise<PdfLayoutBlock[]> => {
    if (!highlightsByDayAscending.length) {
      return [{ type: 'text', text: 'Keine Highlights vorhanden.', marginBottom: 10 }];
    }

    const blocks: PdfLayoutBlock[] = [];

    for (const { isoDate, entries } of highlightsByDayAscending) {
      const heading = new Date(isoDate).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      blocks.push({ type: 'text', text: heading, fontSize: 14, marginBottom: 8 });

      for (const entry of entries) {
        const content = [entry.title, entry.text].filter(Boolean).join(': ').trim() || 'Highlight ohne Inhalt';
        const wrapped = wrapText(content, 90);
        wrapped.forEach((line, index) => {
          blocks.push({ type: 'text', text: `${index === 0 ? '- ' : '  '}${line}`, marginBottom: 2 });
        });

        const photos = resolveHighlightPhotos(entry).slice(0, 3);
        for (const photo of photos) {
          try {
            const image = await prepareImageForPdf(photo);
            if (image) {
              blocks.push({ type: 'image', image, marginBottom: 10 });
            }
          } catch (pdfImageError) {
            console.error('Foto konnte nicht für den Export vorbereitet werden', pdfImageError);
          }
        }

        blocks.push({ type: 'text', text: '', marginBottom: 8 });
      }
    }

    return blocks;
  };

  const buildCoverPage = () => {
    if (!highlightsByDayAscending.length) {
      return null;
    }

    const firstDay = new Date(highlightsByDayAscending[0].isoDate);
    const lastDay = new Date(highlightsByDayAscending[highlightsByDayAscending.length - 1].isoDate);

    const formatDay = (date: Date) =>
      date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return createCoverPage({
      title: 'Highlights',
      note: 'Nur für des Autors Augen gedacht',
      period: `Zeitraum: ${formatDay(firstDay)} – ${formatDay(lastDay)}`,
      summary: `Gesamt: ${state.highlights.length} Highlight${state.highlights.length === 1 ? '' : 's'}`,
    });
  };

  const exportHighlights = async () => {
    try {
      setExportError(null);
      setIsExporting(true);
      const blocks = await buildPdfBlocks();
      const pages = buildMixedPdfPages(blocks.length ? blocks : [{ type: 'text', text: 'Keine Highlights vorhanden.' }]);
      const coverPage = buildCoverPage();
      const pdfPages = coverPage ? [coverPage, ...pages] : pages;
      const filename = `highlights-${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPdf(filename, pdfPages.length ? pdfPages : [['Keine Highlights vorhanden.']]);
    } catch (exportErr) {
      const message =
        exportErr instanceof Error
          ? exportErr.message
          : 'PDF konnte nicht erstellt werden – bitte versuche es erneut.';
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const startAddHighlight = () => {
    resetForm();
    setIsModalOpen(true);
    setModalDate(selectedDate);
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = event.target.files?.[0];

    if (!file) {
      setPendingPhoto(null);
      return;
    }

    if (photoPreviews.length >= 3) {
      setPhotoError('Es können maximal 3 Fotos hinzugefügt werden.');
      event.target.value = '';
      setPendingPhoto(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Bitte wähle eine gültige Bilddatei aus.');
      event.target.value = '';
      setPendingPhoto(null);
      return;
    }

    try {
      const compressed = await compressImageFile(file, { maxSizeBytes: MAX_PHOTO_SIZE_BYTES });
      setPendingPhoto(compressed);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (processingError) {
      console.error('PWA: Foto konnte nicht verarbeitet werden', processingError);
      setPhotoError('Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.');
      setPendingPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadSelectedPhoto = () => {
    if (photoPreviews.length >= 3) {
      setPhotoError('Es können maximal 3 Fotos hinzugefügt werden.');
      return;
    }

    if (!pendingPhoto) {
      setPhotoError('Bitte wähle ein Foto aus, das hochgeladen werden soll.');
      return;
    }

    setPhotoPreviews((prev) => [...prev, pendingPhoto.dataUrl]);
    setPhotoNames((prev) => [...prev, pendingPhoto.name]);
    setPendingPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotoPreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPhotoNames((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPendingPhoto(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Momente</p>
          <h1 className="text-xl font-semibold text-white">Highlights</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="whitespace-nowrap" onClick={exportHighlights} disabled={isExporting}>
            {isExporting ? 'Exportiere …' : 'PDF exportieren'}
          </Button>
          <Dialog.Root open={isModalOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
              <Button
                variant="secondary"
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={startAddHighlight}
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
                    <Dialog.Title className="text-lg font-semibold text-white">
                      {editingHighlightId ? 'Highlight bearbeiten' : 'Highlight hinzufügen'}
                    </Dialog.Title>
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
                        ref={textAreaRef}
                        required
                      />
                      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                        <label className="block text-sm font-medium text-slate-200">
                          Foto (optional)
                          <p className="text-xs text-slate-400">
                            Füge Fotos nacheinander hinzu. Wähle eine Datei aus und lade sie dann über den Button
                            hoch. Maximal 3 Dateien.
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="mt-1 block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-brand-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-brand-secondary/90"
                          />
                        </label>
                        <div className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-slate-300">
                            {pendingPhoto ? (
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-20 overflow-hidden rounded-md bg-slate-900">
                                  <img
                                    src={pendingPhoto.dataUrl}
                                    alt="Ausgewähltes Foto"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-200">{pendingPhoto.name}</p>
                                  <p className="text-slate-400">Ausgewählt – zum Hinzufügen auf „Foto hochladen“ tippen.</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-400">Noch kein neues Foto ausgewählt.</p>
                            )}
                          </div>
                          <Button type="button" variant="secondary" onClick={handleUploadSelectedPhoto}>
                            Foto hochladen
                          </Button>
                        </div>
                        {photoNames.length > 0 && (
                          <ul className="text-xs text-slate-300">
                            {photoNames.map((name, index) => (
                              <li key={`${name}-${index}`}>{name}</li>
                            ))}
                          </ul>
                        )}
                        {photoPreviews.length > 0 && (
                          <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 sm:grid-cols-2">
                            {photoPreviews.map((photo, index) => (
                              <div key={`${photo}-${index}`} className="space-y-2">
                                <div className="overflow-hidden rounded-md bg-slate-950">
                                  <img
                                    src={photo}
                                    alt={title ? `Foto zum Highlight ${title}` : 'Foto zum Highlight'}
                                    className="max-h-56 w-full object-contain"
                                  />
                                </div>
                                <Button type="button" variant="ghost" onClick={() => removePhoto(index)}>
                                  Foto entfernen
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {photoError && <p className="text-xs text-red-400">{photoError}</p>}
                        </div>
                      </div>
                      {formError && <p className="text-sm text-red-400">{formError}</p>}
                      <div className="flex flex-wrap justify-between gap-2">
                        {editingHighlightId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-300 hover:text-red-200"
                            onClick={handleDeleteCurrentHighlight}
                            disabled={isSubmitting || isDeleting}
                          >
                            {isDeleting ? 'Löschen …' : 'Highlight löschen'}
                          </Button>
                        ) : (
                          <span />
                        )}
                        <div className="flex gap-2">
                          <Dialog.Close asChild>
                            <Button variant="ghost" type="button">
                              Abbrechen
                            </Button>
                          </Dialog.Close>
                          <Button type="submit" disabled={isSubmitting || isDeleting}>
                            {isSubmitting
                              ? 'Speichern …'
                              : editingHighlightId
                                ? 'Änderungen sichern'
                                : 'Highlight sichern'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {formError && <p className="text-sm text-red-400">{formError}</p>}
      {highlightError && <p className="text-sm text-red-400">{highlightError}</p>}
      {exportError && <p className="text-sm text-red-400">{exportError}</p>}

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">7 Tage Streak</h2>
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
              startAddHighlight();
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
            {highlightsForSelectedDay.map((highlight) => {
              const photos = resolveHighlightPhotos(highlight);
              return (
                <li key={highlight.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3 text-left transition hover:-translate-y-[1px] hover:border-slate-700 hover:bg-slate-900"
                    onClick={() => handleHighlightClick(highlight.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleHighlightClick(highlight.id);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {new Date(highlight.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-sm font-semibold text-white">{highlight.title}</p>
                      <p className="text-sm text-slate-300">{highlight.text}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-1 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleHighlightClick(highlight.id);
                          }}
                        >
                          Text bearbeiten
                        </Button>
                      </div>
                      {photos.length > 0 && (
                        <div className="mt-3 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2 sm:grid-cols-2">
                          {photos.slice(0, 3).map((photo, index) => (
                            <div key={`${highlight.id}-preview-${index}`} className="overflow-hidden rounded-md">
                              <img
                                src={photo}
                                alt={highlight.title ? `Foto zu ${highlight.title}` : 'Highlight-Foto'}
                                className="max-h-56 w-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PwaHighlightsPage;
