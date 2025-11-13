import { ActivityAttribute } from '../../types';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import type { AttributeValueDraft } from '../../utils/attributes';

type AttributeValuesFormProps = {
  attributes: ActivityAttribute[];
  drafts: AttributeValueDraft[];
  onChange: (next: AttributeValueDraft[]) => void;
};

const AttributeValuesForm = ({ attributes, drafts, onChange }: AttributeValuesFormProps) => {
  if (!attributes.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {attributes.map((attribute) => {
        const draft = drafts.find((entry) => entry.attributeId === attribute.id);
        if (!draft) {
          return null;
        }

        if (attribute.type === 'number' && draft.type === 'number') {
          return (
            <Input
              key={attribute.id}
              label={attribute.unit ? `${attribute.name} (${attribute.unit})` : attribute.name}
              type="number"
              value={draft.value}
              onChange={(event) =>
                onChange(
                  drafts.map((entry) =>
                    entry.attributeId === attribute.id && entry.type === 'number'
                      ? { ...entry, value: event.target.value }
                      : entry,
                  ),
                )
              }
            />
          );
        }

        if (attribute.type === 'text' && draft.type === 'text') {
          return (
            <TextArea
              key={attribute.id}
              label={attribute.name}
              value={draft.value}
              onChange={(event) =>
                onChange(
                  drafts.map((entry) =>
                    entry.attributeId === attribute.id && entry.type === 'text'
                      ? { ...entry, value: event.target.value }
                      : entry,
                  ),
                )
              }
            />
          );
        }

        if (attribute.type === 'timeRange' && draft.type === 'timeRange') {
          return (
            <div key={attribute.id} className="grid gap-3 md:grid-cols-2">
              <Input
                label={`${attribute.name} (Start)`}
                type="time"
                value={draft.start}
                onChange={(event) =>
                  onChange(
                    drafts.map((entry) =>
                      entry.attributeId === attribute.id && entry.type === 'timeRange'
                        ? { ...entry, start: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
              <Input
                label={`${attribute.name} (Ende)`}
                type="time"
                value={draft.end}
                onChange={(event) =>
                  onChange(
                    drafts.map((entry) =>
                      entry.attributeId === attribute.id && entry.type === 'timeRange'
                        ? { ...entry, end: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </div>
          );
        }

        if (attribute.type === 'duration' && draft.type === 'duration') {
          return (
            <div key={attribute.id} className="grid gap-3 md:grid-cols-2">
              <Input
                label={`${attribute.name} – Stunden`}
                type="number"
                min={0}
                value={draft.hours}
                onChange={(event) =>
                  onChange(
                    drafts.map((entry) =>
                      entry.attributeId === attribute.id && entry.type === 'duration'
                        ? { ...entry, hours: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
              <Input
                label={`${attribute.name} – Minuten`}
                type="number"
                min={0}
                max={59}
                value={draft.minutes}
                onChange={(event) =>
                  onChange(
                    drafts.map((entry) =>
                      entry.attributeId === attribute.id && entry.type === 'duration'
                        ? { ...entry, minutes: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default AttributeValuesForm;
