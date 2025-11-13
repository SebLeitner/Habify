import { useEffect, useState } from 'react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ColorPicker from '../UI/ColorPicker';
import EmojiPicker from '../UI/EmojiPicker';
import { Activity } from '../../contexts/DataContext';

const defaultColor = '#4f46e5';

const ActivityForm = ({
  initialActivity,
  onSubmit,
  onCancel,
}: {
  initialActivity?: Activity;
  onSubmit: (values: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  onCancel?: () => void;
}) => {
  const [name, setName] = useState(initialActivity?.name ?? '');
  const [icon, setIcon] = useState(initialActivity?.icon ?? '💧');
  const [color, setColor] = useState(initialActivity?.color ?? defaultColor);
  const [active, setActive] = useState(initialActivity?.active ?? true);

  useEffect(() => {
    if (initialActivity) {
      setName(initialActivity.name);
      setIcon(initialActivity.icon);
      setColor(initialActivity.color);
      setActive(initialActivity.active);
    }
  }, [initialActivity]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name, icon, color, active });
    if (!initialActivity) {
      setName('');
      setIcon('💧');
      setColor(defaultColor);
      setActive(true);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <EmojiPicker value={icon} onChange={setIcon} />
      <ColorPicker label="Farbe" value={color} onChange={(event) => setColor(event.target.value)} />
      <label className="flex items-center gap-3 text-sm text-slate-200">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-slate-600 bg-slate-900"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Aktiv
      </label>
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

export default ActivityForm;
