import { useMemo } from 'react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { ActivityAttribute, ActivityAttributeType } from '../../types';

const attributeTypeLabels: Record<ActivityAttributeType, string> = {
  number: 'Zahl',
  text: 'Freitext',
  timeRange: 'Start- und Endzeit',
  duration: 'Dauer (Stunden/Minuten)',
};

type ActivityAttributesEditorProps = {
  attributes: ActivityAttribute[];
  onChange: (next: ActivityAttribute[]) => void;
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `attr_${Math.random().toString(36).slice(2, 10)}`;

const ActivityAttributesEditor = ({ attributes, onChange }: ActivityAttributesEditorProps) => {
  const sortedAttributes = useMemo(
    () => attributes.map((attribute) => ({ ...attribute, unit: attribute.unit ?? null })),
    [attributes],
  );

  const updateAttribute = (id: string, updates: Partial<ActivityAttribute>) => {
    onChange(
      sortedAttributes.map((attribute) =>
        attribute.id === id
          ? {
              ...attribute,
              ...updates,
            }
          : attribute,
      ),
    );
  };

  const removeAttribute = (id: string) => {
    onChange(sortedAttributes.filter((attribute) => attribute.id !== id));
  };

  const addAttribute = () => {
    onChange([
      ...sortedAttributes,
      {
        id: generateId(),
        name: '',
        type: 'number',
        unit: null,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Attribute</h3>
        <Button type="button" variant="ghost" onClick={addAttribute}>
          Attribut hinzufügen
        </Button>
      </div>
      {!sortedAttributes.length && (
        <p className="text-xs text-slate-500">Noch keine Attribute. Füge individuelle Felder für deine Aktivität hinzu.</p>
      )}
      <div className="space-y-4">
        {sortedAttributes.map((attribute) => (
          <div key={attribute.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <div className="md:flex-1">
                <Input
                  label="Name"
                  value={attribute.name}
                  onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                  required
                />
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600 md:w-56">
                <span className="font-medium text-slate-900">Typ</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-primary/60 focus:outline-none focus:ring-4 focus:ring-brand-primary/10"
                  value={attribute.type}
                  onChange={(event) => {
                    const nextType = event.target.value as ActivityAttributeType;
                    const updates: Partial<ActivityAttribute> = { type: nextType };
                    if (nextType !== 'number') {
                      updates.unit = null;
                    }
                    updateAttribute(attribute.id, updates);
                  }}
                >
                  {Object.entries(attributeTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {attribute.type === 'number' && (
              <Input
                label="Einheit (optional)"
                value={attribute.unit ?? ''}
                onChange={(event) => updateAttribute(attribute.id, { unit: event.target.value || null })}
                placeholder="z. B. km, Schritte, ml"
              />
            )}
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={() => removeAttribute(attribute.id)}>
                Entfernen
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityAttributesEditor;
