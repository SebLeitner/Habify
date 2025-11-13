import { useEffect, useState } from 'react';
import { Activity, LogEntry } from '../../contexts/DataContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import { currentDateTimeLocal, toLocalDateTimeInput } from '../../utils/datetime';
import AttributeValuesForm from './AttributeValuesForm';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';

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
  const defaultActivityId = activities[0]?.id ?? '';
  const [activityId, setActivityId] = useState(initialLog?.activityId ?? defaultActivityId);
  const [timestamp, setTimestamp] = useState(
    initialLog ? toLocalDateTimeInput(initialLog.timestamp) : currentDateTimeLocal(),
  );
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

  if (!activities.length) {
    return <p className="text-sm text-slate-400">Bitte lege zuerst eine Aktivität an.</p>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityId) return;
    const isoTimestamp = new Date(timestamp).toISOString();
    const attributeValues = serializeDrafts(drafts);
    await onSubmit({
      activityId,
      timestamp: isoTimestamp,
      note: note.trim() ? note : undefined,
      attributes: attributeValues.length ? attributeValues : undefined,
    });
    if (!initialLog) {
      setActivityId(activities[0]?.id ?? '');
      setTimestamp(currentDateTimeLocal());
      setNote('');
      setDrafts(selectedActivity ? emptyDrafts(selectedActivity.attributes) : []);
    }
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
      <Input
        label="Zeitpunkt"
        type="datetime-local"
        value={timestamp}
        onChange={(event) => setTimestamp(event.target.value)}
        required
      />
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
