import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Activity, type LogEntry } from '../../contexts/DataContext';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import { currentLocalDate, dateToISODate, formatDateForDisplay, parseDisplayDateToISO } from '../../utils/datetime';
import AttributeValuesForm from '../Log/AttributeValuesForm';
import { emptyDrafts, serializeDrafts, toDrafts, type AttributeValueDraft } from '../../utils/attributes';
import type { LogAttributeValue } from '../../types';
import { isFirefox } from '../../utils/browser';
import WeeklyActivityOverview from '../Log/WeeklyActivityOverview';
import type { DailyHabitTargets } from '../../types';

type ActivityQuickLogListProps = {
  activities: Activity[];
  onAddLog: (values: {
    activityId: string;
    timestamp: string;
    timeSlot?: 'morning' | 'day' | 'evening';
    note?: string;
    attributes?: LogAttributeValue[];
  }) => Promise<void>;
  logs: LogEntry[];
  dense?: boolean;
  dailyTargets?: Map<string, DailyTargetInfo>;
};

type DailyTargetInfo = {
  target: DailyHabitTargets;
  remaining: DailyHabitTargets;
  totalTarget: number;
  totalRemaining: number;
};

const getCompletedCount = (target: number, remaining: number): number => Math.max(target - remaining, 0);

const ActivityCard = ({
  activity,
  onAddLog,
  logs,
  dense,
  dailyTarget,
}: {
  activity: Activity;
  onAddLog: (values: {
    activityId: string;
    timestamp: string;
    timeSlot?: 'morning' | 'day' | 'evening';
    note?: string;
    attributes?: LogAttributeValue[];
  }) => Promise<void>;
  logs: LogEntry[];
  dense?: boolean;
  dailyTarget?: DailyTargetInfo;
}) => {
  const firefox = isFirefox();
  const initialDate = currentLocalDate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [firefoxDateInput, setFirefoxDateInput] = useState(() =>
    firefox ? formatDateForDisplay(initialDate) : '',
  );
  const [timeSlot, setTimeSlot] = useState<'morning' | 'day' | 'evening'>('morning');
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
        const resetDate = currentLocalDate();
        setDate(resetDate);
        if (firefox) {
          setFirefoxDateInput(formatDateForDisplay(resetDate));
        }
        setTimeSlot('morning');
        setDrafts(toDrafts(activity.attributes));
      }
      return next;
    });
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const attributeValues = serializeDrafts(drafts);
      if (!date) {
        throw new Error('Bitte Datum und Tageszeit auswählen.');
      }
      await onAddLog({
        activityId: activity.id,
        timestamp: dateToISODate(date),
        timeSlot,
        note: note.trim() ? note.trim() : undefined,
        attributes: attributeValues.length ? attributeValues : undefined,
      });
      setNote('');
      const resetDate = currentLocalDate();
      setDate(resetDate);
      if (firefox) {
        setFirefoxDateInput(formatDateForDisplay(resetDate));
      }
      setTimeSlot('morning');
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
            {dailyTarget && (
              <div className="space-y-1 text-[11px] font-semibold">
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
                  {dailyTarget.target.morning > 0 && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      Morgens: {getCompletedCount(dailyTarget.target.morning, dailyTarget.remaining.morning)}/
                      {dailyTarget.target.morning}
                    </span>
                  )}
                  {dailyTarget.target.day > 0 && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      Mittags/Nachmittags: {getCompletedCount(dailyTarget.target.day, dailyTarget.remaining.day)}/
                      {dailyTarget.target.day}
                    </span>
                  )}
                  {dailyTarget.target.evening > 0 && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      Abend: {getCompletedCount(dailyTarget.target.evening, dailyTarget.remaining.evening)}/
                      {dailyTarget.target.evening}
                    </span>
                  )}
                </div>
              </div>
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
          <WeeklyActivityOverview activityId={activity.id} logs={logs} />
          <form className="space-y-4" onSubmit={handleSubmit}>
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
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="font-medium text-slate-100">Tageszeit</span>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
                  value={timeSlot}
                  onChange={(event) => setTimeSlot(event.target.value as 'morning' | 'day' | 'evening')}
                  required
                >
                  <option value="morning">Morgens</option>
                  <option value="day">Mittags/Nachmittags</option>
                  <option value="evening">Abends</option>
                </select>
              </label>
            </div>
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

const ActivityQuickLogList = ({ activities, onAddLog, logs, dense = false, dailyTargets }: ActivityQuickLogListProps) => {
  const activitiesLogs = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    activities.forEach((activity) => {
      map.set(
        activity.id,
        logs.filter((log) => log.activityId === activity.id),
      );
    });
    return map;
  }, [activities, logs]);

  if (!activities.length) {
    return <p className="text-sm text-slate-400">Noch keine Aktivitäten angelegt.</p>;
  }

  return (
    <div className={dense ? 'space-y-3' : 'grid gap-4 md:grid-cols-2'}>
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          logs={activitiesLogs.get(activity.id) ?? []}
          onAddLog={onAddLog}
          dense={dense}
          dailyTarget={dailyTargets?.get(activity.id)}
        />
      ))}
    </div>
  );
};

export default ActivityQuickLogList;
