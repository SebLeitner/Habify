import { Activity } from '../../contexts/DataContext';
import Button from '../UI/Button';

const ActivityList = ({
  activities,
  onEdit,
  onDelete,
}: {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}) => {
  if (!activities.length) {
    return <p className="text-sm text-slate-400">Noch keine Aktivitäten angelegt.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {activities.map((activity) => {
        const accentColor = `${activity.color}33`;
        return (
          <div
            key={activity.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: accentColor }}>
                {activity.icon}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{activity.name}</h3>
                <p className="text-xs text-slate-400">
                  {activity.active ? 'Aktiv' : 'Inaktiv'} • Aktualisiert am{' '}
                  {new Date(activity.updatedAt).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onEdit(activity)}>
                Bearbeiten
              </Button>
              <Button type="button" variant="ghost" onClick={() => onDelete(activity)}>
                Löschen
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;
