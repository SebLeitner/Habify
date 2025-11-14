import { useMemo } from 'react';
import Button from '../UI/Button';
import { ActivityAttribute, ActivityAttributeType } from '../../types';
import { PREDEFINED_ACTIVITY_ATTRIBUTES } from '../../constants/activityAttributes';

const attributeTypeLabels: Record<ActivityAttributeType, string> = {
  number: 'Zahl',
  text: 'Freitext',
  timeRange: 'Start- und Endzeit',
  duration: 'Dauer (Stunden/Minuten)',
};

const predefinedAttributeIds = new Set(
  PREDEFINED_ACTIVITY_ATTRIBUTES.map((attribute) => attribute.id),
);

const ActivityAttributesEditor = ({
  attributes,
  onChange,
}: {
  attributes: ActivityAttribute[];
  onChange: (next: ActivityAttribute[]) => void;
}) => {
  const { selectedPredefinedIds, legacyAttributes } = useMemo(() => {
    const selected = new Set<string>();
    const legacy: ActivityAttribute[] = [];

    attributes.forEach((attribute) => {
      if (predefinedAttributeIds.has(attribute.id)) {
        selected.add(attribute.id);
        return;
      }
      legacy.push({ ...attribute, unit: attribute.unit ?? null });
    });

    return { selectedPredefinedIds: selected, legacyAttributes: legacy };
  }, [attributes]);

  const toggleAttribute = (attributeId: string) => {
    if (!predefinedAttributeIds.has(attributeId)) {
      return;
    }

    const nextSelected = new Set(selectedPredefinedIds);
    if (nextSelected.has(attributeId)) {
      nextSelected.delete(attributeId);
    } else {
      nextSelected.add(attributeId);
    }

    const nextPredefined = PREDEFINED_ACTIVITY_ATTRIBUTES.filter((attribute) =>
      nextSelected.has(attribute.id),
    ).map<ActivityAttribute>((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      type: attribute.type,
      unit: attribute.unit ?? null,
    }));

    onChange([...legacyAttributes, ...nextPredefined]);
  };

  const removeAttribute = (attributeId: string) => {
    onChange(attributes.filter((attribute) => attribute.id !== attributeId));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-100">Attribute</h3>
        <p className="text-xs text-slate-400">
          W\u00e4hle aus, welche Werte du f\u00fcr diese Aktivit\u00e4t erfassen m\u00f6chtest.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {PREDEFINED_ACTIVITY_ATTRIBUTES.map((attribute) => {
          const isSelected = selectedPredefinedIds.has(attribute.id);
          return (
            <label
              key={attribute.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                isSelected
                  ? 'border-brand-primary/60 bg-brand-primary/10'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"
                checked={isSelected}
                onChange={() => toggleAttribute(attribute.id)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">{attribute.name}</p>
                <p className="text-xs text-slate-400">{attribute.description}</p>
              </div>
            </label>
          );
        })}
      </div>
      {!selectedPredefinedIds.size && !legacyAttributes.length && (
        <p className="text-xs text-slate-400">
          Noch keine Attribute ausgew\u00e4hlt. Aktiviere mindestens ein Attribut, um zus\u00e4tzliche Werte zu speichern.
        </p>
      )}
      {!!legacyAttributes.length && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-100">Benutzerdefinierte Attribute</h4>
            <p className="text-xs text-slate-400">
              Diese Attribute wurden individuell angelegt und k\u00f6nnen weiterhin genutzt oder entfernt werden.
            </p>
          </div>
          <ul className="space-y-2">
            {legacyAttributes.map((attribute) => (
              <li key={attribute.id} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                <span>
                  <span className="font-medium text-slate-100">{attribute.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {attributeTypeLabels[attribute.type]}
                    {attribute.unit ? ` \u2013 ${attribute.unit}` : ''}
                  </span>
                </span>
                <Button type="button" variant="ghost" onClick={() => removeAttribute(attribute.id)}>
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ActivityAttributesEditor;
