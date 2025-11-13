import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, LogEntry } from '../../contexts/DataContext';
import { endOfDay, endOfMonth, endOfWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

const groupByActivity = (logs: LogEntry[], activities: Activity[]) => {
  const counts = new Map<string, number>();
  logs.forEach((log) => {
    counts.set(log.activityId, (counts.get(log.activityId) ?? 0) + 1);
  });

  return activities
    .map((activity) => ({
      name: activity.name,
      count: counts.get(activity.id) ?? 0,
      color: activity.color,
    }))
    .filter((entry) => entry.count > 0);
};

const StatsOverview = ({ logs, activities }: { logs: LogEntry[]; activities: Activity[] }) => {
  const todayRange = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const todayLogs = logs.filter((log) => isWithinInterval(new Date(log.timestamp), { start, end }));
    return groupByActivity(todayLogs, activities);
  }, [logs, activities]);

  const weekRange = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekLogs = logs.filter((log) => isWithinInterval(new Date(log.timestamp), { start, end }));
    return groupByActivity(weekLogs, activities);
  }, [logs, activities]);

  const monthRange = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthLogs = logs.filter((log) => isWithinInterval(new Date(log.timestamp), { start, end }));
    const grouped = new Map<string, Map<string, number>>();

    monthLogs.forEach((log) => {
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      if (!grouped.has(day)) {
        grouped.set(day, new Map());
      }
      const dayMap = grouped.get(day)!;
      dayMap.set(log.activityId, (dayMap.get(log.activityId) ?? 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([day, counts]) => {
        const dataPoint: Record<string, string | number> = { day };
        activities.forEach((activity) => {
          dataPoint[activity.name] = counts.get(activity.id) ?? 0;
        });
        return dataPoint;
      });
  }, [logs, activities]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-white">Heutige Verteilung</h2>
        <div className="mt-4 h-64 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="count" data={todayRange} nameKey="name" label>
                {todayRange.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white">Aktuelle Woche</h2>
        <div className="mt-4 h-72 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekRange}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {weekRange.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {!!weekRange.length && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
              {weekRange.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white">Monatsverlauf</h2>
        <div className="mt-4 h-80 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthRange}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Legend />
              {activities.map((activity) => (
                <Line
                  key={activity.id}
                  type="monotone"
                  dataKey={activity.name}
                  stroke={activity.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default StatsOverview;
