import { ChangeEvent, useEffect, useState } from 'react';
import { Activity, LogEntry } from '../../contexts/DataContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import {
  combineDateAndTimeToISO,
  currentLocalDate,
  currentLocalTime,
  formatDateForDisplay,
  parseDisplayDateToISO,
  parseDisplayTimeToISO,
  toLocalDateInput,
  toLocalTimeInput,
} from '../../utils/datetime';
import AttributeValuesForm from './AttributeValuesForm';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';
import { isFirefox } from '../../utils/browser';

const LogForm = ({
  activities,
  initialLog,
  onSubmit,
  onCancel,
}: {
  activities: Activity[];
  initialLog?: LogEntry;
  onSubmit: (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    attributes?: ReturnType<typeof serializeDrafts>;
  }) => void | Promise<void>;
  onCancel?: () => void;
}) => {
  const firefox = isFirefox();
  const defaultActivityId = activities[0]?.id ?? '';
  const initialDate = initialLog ? toLocalDateInput(initialLog.timestamp) : currentLocalDate();
  const initialTime = initialLog ? toLocalTimeInput(initialLog.timestamp) : currentLocalTime();
  const [activityId, setActivityId] = useState(initialLog?.activityId ?? defaultActivityId);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [firefoxTimeInput, setFirefoxTimeInput] = useState(() => (firefox ? initialTime : ''));
  const [note, setNote] = useState(initialLog?.note ?? '');
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
    const nextTime = initialLog ? toLocalTimeInput(initialLog.timestamp) : currentLocalTime();
    setDate(nextDate);
    setTime(nextTime);
    if (firefox) {
      setFirefoxDateInput(formatDateForDisplay(nextDate));
      setFirefoxTimeInput(nextTime);
    }
  }, [firefox, initialLog]);

  if (!activities.length) {
    return <p className="text-sm text-slate-400">Bitte lege zuerst eine Aktivität an.</p>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityId || !date || !time) return;
    const isoTimestamp = combineDateAndTimeToISO(date, time);
    const attributeValues = serializeDrafts(drafts);
    await onSubmit({
      activityId,
      timestamp: isoTimestamp,
      note: note.trim() ? note : undefined,
      attributes: attributeValues.length ? attributeValues : undefined,
    });
    if (!initialLog) {
      setActivityId(activities[0]?.id ?? '');
      const resetDate = currentLocalDate();
      const resetTime = currentLocalTime();
      setDate(resetDate);
      setTime(resetTime);
      if (firefox) {
        setFirefoxDateInput(formatDateForDisplay(resetDate));
        setFirefoxTimeInput(resetTime);
      }
      setNote('');
      setDrafts(selectedActivity ? emptyDrafts(selectedActivity.attributes) : []);
    }
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

  const handleTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (firefox) {
      setFirefoxTimeInput(value);
      const parsed = parseDisplayTimeToISO(value);
      setTime(parsed);
      return;
    }

    setTime(value);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Input
          label="Uhrzeit"
          type={firefox ? 'text' : 'time'}
          lang="de-DE"
          inputMode="numeric"
          placeholder={firefox ? 'HH:MM' : undefined}
          pattern={firefox ? '([01]\\d|2[0-3]):([0-5]\\d)' : undefined}
          value={firefox ? firefoxTimeInput : time}
          onChange={handleTimeChange}
          required
        />
      </div>
      <AttributeValuesForm attributes={selectedActivity.attributes} drafts={drafts} onChange={setDrafts} />
      <TextArea label="Notiz" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
};

export default LogForm;
