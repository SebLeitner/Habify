import { format } from 'date-fns';
import type { MindfulnessActivity } from '../types';

const hashString = (value: string): number =>
  value.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);

export const selectMindfulnessOfDay = (
  entries: MindfulnessActivity[],
  date: Date,
): MindfulnessActivity | null => {
  if (!entries.length) {
    return null;
  }

  const sortedEntries = entries
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id),
    );

  const dayKey = format(date, 'yyyy-MM-dd');
  const index = hashString(dayKey) % sortedEntries.length;

  return sortedEntries[index];
};

