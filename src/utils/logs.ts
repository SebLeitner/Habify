import type { DailyHabitTargets, LogEntry } from '../types';

export const DISMISS_NOTE_PREFIX = '__DISMISS__:';

export const isDismissalLog = (log: LogEntry): log is LogEntry & { note: string } =>
  (log.note ?? '').startsWith(DISMISS_NOTE_PREFIX) &&
  (['morning', 'day', 'evening'] as Array<keyof DailyHabitTargets>).some(
    (slot) => log.note === `${DISMISS_NOTE_PREFIX}${slot}`,
  );

export const isMindfulnessLog = (log: LogEntry): boolean =>
  Boolean(log.mindfulnessId || log.activityId?.startsWith('mindfulness-'));
