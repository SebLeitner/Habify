import * as Dialog from '@radix-ui/react-dialog';
import { ChangeEvent, useEffect, useState } from 'react';
import { Activity, LogEntry } from '../../contexts/DataContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import {
  currentLocalDate,
  dateToISODate,
  formatDateForDisplay,
  parseDisplayDateToISO,
  toLocalDateInput,
} from '../../utils/datetime';
import AttributeValuesForm from './AttributeValuesForm';
import WeeklyActivityOverview from './WeeklyActivityOverview';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';
import { isFirefox } from '../../utils/browser';

const LogForm = ({
  activities,
  logs,
  initialLog,
  onSubmit,
  onCancel,
}: {
  activities: Activity[];
  logs: LogEntry[];
  initialLog?: LogEntry;
  onSubmit: (values: {
    activityId: string;
    timestamp: string;
    timeSlot?: 'morning' | 'day' | 'evening';
    note?: string;
    attributes?: ReturnType<typeof serializeDrafts>;
  }) => void | Promise<void>;
  onCancel?: () => void;
}) => {
  const firefox = isFirefox();
  const defaultActivityId = activities[0]?.id ?? '';
  const initialDate = initialLog ? toLocalDateInput(initialLog.timestamp) : currentLocalDate();
  const [activityId, setActivityId] = useState(initialLog?.activityId ?? defaultActivityId);
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [timeSlot, setTimeSlot] = useState<'morning' | 'day' | 'evening'>(initialLog?.timeSlot ?? 'morning');
  const [note, setNote] = useState(initialLog?.note ?? '');
  const [isTimeSlotDialogOpen, setIsTimeSlotDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<AttributeValueDraft[]>(() => {
    const activity = activities.find((item) => item.id === (initialLog?.activityId ?? defaultActivityId));
    return activity ? toDrafts(activity.attributes, initialLog?.attributes) : [];
  });

  const selectedActivity = activities.find((activity) => activity.id === activityId) ?? activities[0];

  useEffect(() => {
    setDrafts((current) => {
      const activity = activities.find((item) => item.id === activityId);
      if (!activity) {
        return current;
      }
      const hasInitialValues = initialLog && initialLog.activityId === activityId ? initialLog.attributes : undefined;
      return toDrafts(activity.attributes, hasInitialValues);
    });
  }, [activityId, activities, initialLog]);

  useEffect(() => {
    const nextDate = initialLog ? toLocalDateInput(initialLog.timestamp) : currentLocalDate();
    setDate(nextDate);
    if (firefox) {
      setFirefoxDateInput(formatDateForDisplay(nextDate));
    }
    setTimeSlot(initialLog?.timeSlot ?? 'morning');
  }, [firefox, initialLog]);

  if (!activities.length) {
    return <p className="text-sm text-slate-400">Bitte lege zuerst eine Aktivität an.</p>;
  }

  const handleSubmit = async (slot: 'morning' | 'day' | 'evening') => {
    if (!activityId || !date) return;
    const isoTimestamp = dateToISODate(date);
    const attributeValues = serializeDrafts(drafts);
    setIsSubmitting(true);
    try {
      await onSubmit({
        activityId,
        timestamp: isoTimestamp,
        timeSlot: slot,
        note: note.trim() ? note : undefined,
        attributes: attributeValues.length ? attributeValues : undefined,
      });
      setIsTimeSlotDialogOpen(false);
      if (!initialLog) {
        setActivityId(activities[0]?.id ?? '');
        const resetDate = currentLocalDate();
        setDate(resetDate);
        if (firefox) {
          setFirefoxDateInput(formatDateForDisplay(resetDate));
        }
        setTimeSlot('morning');
        setNote('');
        setDrafts(selectedActivity ? emptyDrafts(selectedActivity.attributes) : []);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityId || !date) return;
    setIsTimeSlotDialogOpen(true);
  };

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

  return (
    <form className="space-y-4" onSubmit={handleFormSubmit}>
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span className="font-medium text-slate-100">Aktivität</span>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
          value={activityId}
          onChange={(event) => setActivityId(event.target.value)}
          required
        >
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.icon} {activity.name}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Datum"
        type={firefox ? 'text' : 'date'}
        lang="de-DE"
        inputMode="numeric"
        placeholder={firefox ? 'TT.MM.JJJJ' : undefined}
        pattern={firefox ? '\\d{2}\\.\\d{2}\\.\\d{4}' : undefined}
        value={firefox ? firefoxDateInput : date}
        onChange={handleDateChange}
        required
      />
      <AttributeValuesForm attributes={selectedActivity.attributes} drafts={drafts} onChange={setDrafts} />
      {selectedActivity && <WeeklyActivityOverview activityId={selectedActivity.id} logs={logs} />}
      <TextArea label="Notiz" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit">Weiter</Button>
      </div>
      <Dialog.Root open={isTimeSlotDialogOpen} onOpenChange={setIsTimeSlotDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl focus:outline-none">
            <div className="space-y-1 text-center">
              <Dialog.Title className="text-lg font-semibold text-white">Wann soll geloggt werden?</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-400">
                Wähle die Tageszeit aus, um den Eintrag zu speichern.
              </Dialog.Description>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'morning', label: 'Morgens' },
                { key: 'day', label: 'tagsüber' },
                { key: 'evening', label: 'Abends' },
              ].map((slot) => (
                <Button
                  key={slot.key}
                  type="button"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                  onClick={() => {
                    setTimeSlot(slot.key as 'morning' | 'day' | 'evening');
                    void handleSubmit(slot.key as 'morning' | 'day' | 'evening');
                  }}
                >
                  {slot.label}
                </Button>
              ))}
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="w-full justify-center" disabled={isSubmitting}>
                Abbrechen
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </form>
  );
};

export default LogForm;
