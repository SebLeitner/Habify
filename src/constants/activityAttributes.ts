import type { ActivityAttributeType } from '../types';

export type PredefinedActivityAttribute = {
  id: string;
  name: string;
  type: ActivityAttributeType;
  unit?: string | null;
  description: string;
};

export const PREDEFINED_ACTIVITY_ATTRIBUTES: ReadonlyArray<PredefinedActivityAttribute> = [
  {
    id: 'count',
    name: 'Anzahl',
    type: 'number',
    unit: null,
    description: 'Einfache Zählerangabe, z.\u00a0B. Wiederholungen oder Sets.',
  },
  {
    id: 'kilometers',
    name: 'Kilometer',
    type: 'number',
    unit: 'km',
    description: 'Distanz in Kilometern.',
  },
  {
    id: 'steps',
    name: 'Schritte',
    type: 'number',
    unit: null,
    description: 'Anzahl der gelaufenen Schritte.',
  },
  {
    id: 'duration',
    name: 'Dauer',
    type: 'duration',
    unit: null,
    description: 'Zeitangabe im Format Stunden und Minuten.',
  },
  {
    id: 'milliliters',
    name: 'Milliliter',
    type: 'number',
    unit: 'ml',
    description: 'Getrunkene Flüssigkeit in Millilitern.',
  },
];
