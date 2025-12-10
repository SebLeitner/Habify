import { format, isSameDay, startOfDay, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { type LogEntry } from '../../contexts/DataContext';

type WeeklyActivityOverviewProps = {
  activityId: string;
  logs: LogEntry[];
  className?: string;
};

const WeeklyActivityOverview = ({ activityId, logs, className }: WeeklyActivityOverviewProps) => {
  const today = startOfDay(new Date());
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => subDays(today, index));

  const activityLogs = logs.filter((log) => log.activityId === activityId);

  const countsByDay = lastSevenDays.map((day) => {
    const countForDay = activityLogs.reduce((count, log) => {
      const timestamp = new Date(log.timestamp);
      return isSameDay(timestamp, day) ? count + 1 : count;
    }, 0);

    return {
      day,
      count: countForDay,
    };
  });

  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 ${
        className ? className : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">7 Tage Streak</p>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-100">
        {countsByDay.map(({ day, count }) => (
          <div key={day.toISOString()} className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {format(day, 'EEE', { locale: de })}
            </p>
            <p className="text-lg text-white">{count > 0 ? count : '×'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyActivityOverview;
