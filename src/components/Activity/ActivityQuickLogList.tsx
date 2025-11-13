import { useEffect, useState } from 'react';
import { Activity } from '../../contexts/DataContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import { currentDateTimeLocal } from '../../utils/datetime';
import AttributeValuesForm from '../Log/AttributeValuesForm';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';
import type { LogAttributeValue } from '../../types';

type ActivityQuickLogListProps = {
  activities: Activity[];
  onAddLog: (values: {
    activityId: string;
    timestamp: string;
    note?: string;
    attributes?: LogAttributeValue[];
  }) => Promise<void>;
  dense?: boolean;
};

const ActivityCard = ({
  activity,
  onAddLog,
  dense,
}: {
  activity: Activity;
  onAddLog: (values: { activityId: string; timestamp: string; note?: string; attributes?: LogAttributeValue[] }) => Promise<void>;
  dense?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timestamp, setTimestamp] = useState(currentDateTimeLocal());
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AttributeValueDraft[]>(() => emptyDrafts(activity.attributes));

  const attributeSignature = activity.attributes
    .map((attribute) => `${attribute.id}-${attribute.name}-${attribute.type}-${attribute.unit ?? ''}`)
    .join('|');

  useEffect(() => {
    setDrafts(emptyDrafts(activity.attributes));
  }, [activity.id, activity.attributes, attributeSignature]);

  const accentColor = `${activity.color}33`;

  const toggle = () => {
    setIsExpanded((previous) => {
      const next = !previous;
      if (next) {
        setTimestamp(currentDateTimeLocal());
        setDrafts(toDrafts(activity.attributes));
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const attributeValues = serializeDrafts(drafts);
      await onAddLog({
        activityId: activity.id,
        timestamp: new Date(timestamp).toISOString(),
        note: note.trim() ? note.trim() : undefined,
        attributes: attributeValues.length ? attributeValues : undefined,
      });
      setNote('');
      setTimestamp(currentDateTimeLocal());
      setDrafts(emptyDrafts(activity.attributes));
      setIsExpanded(false);
      setError(null);
    } catch (submitError) {
      console.error('Log konnte nicht gespeichert werden', submitError);
      setError(
        submitError instanceof Error ? submitError.message : 'Log konnte nicht gespeichert werden.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 ${dense ? 'p-3' : 'p-4'} shadow-inner`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggle();
            }
          }}
          className="flex flex-1 cursor-pointer items-center gap-4"
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: accentColor }}
          >
            {activity.icon}
          </span>
          <div className="space-y-1">
            <h3 className={`font-semibold text-white ${dense ? 'text-sm' : 'text-base'}`}>{activity.name}</h3>
            <p className="text-xs text-slate-400">
              {activity.active ? 'Aktiv' : 'Inaktiv'} • Aktualisiert am{' '}
              {new Date(activity.updatedAt).toLocaleDateString('de-DE')}
            </p>
            {activity.categories?.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activity.categories.map((category) => (
                  <span
                    key={category}
                    className={`rounded-full bg-slate-800 ${dense ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-medium text-slate-100`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500">Keine Kategorien</span>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4" onClick={(event) => event.stopPropagation()}>
          <h4 className="text-sm font-semibold text-white">Eintrag hinzufügen</h4>
          {!dense && (
            <p className="mb-4 text-xs text-slate-400">
              Speichere einen Log-Eintrag für diese Aktivität. Die Werte werden nach dem Speichern automatisch zurückgesetzt.
            </p>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Zeitpunkt"
              type="datetime-local"
              value={timestamp}
              onChange={(event) => setTimestamp(event.target.value)}
              required
            />
            <AttributeValuesForm attributes={activity.attributes} drafts={drafts} onChange={setDrafts} />
            <TextArea
              label="Notiz"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
              className="min-h-[80px]"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Speichern …' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const ActivityQuickLogList = ({ activities, onAddLog, dense = false }: ActivityQuickLogListProps) => {
  if (!activities.length) {
    return <p className="text-sm text-slate-400">Noch keine Aktivitäten angelegt.</p>;
  }

  return (
    <div className={dense ? 'space-y-3' : 'grid gap-4 md:grid-cols-2'}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} onAddLog={onAddLog} dense={dense} />
      ))}
    </div>
  );
};

export default ActivityQuickLogList;
