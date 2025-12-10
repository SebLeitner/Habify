import type { DailyHabitTargets } from '../types';

export const defaultDailyHabitTargets: DailyHabitTargets = {
  morning: 0,
  day: 0,
  evening: 0,
};

const normalizeValue = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const normalized = Number(value);
  if (Number.isNaN(normalized) || normalized < 0) {
    return 0;
  }

  return normalized;
};

export const normalizeDailyHabitTargets = (value: unknown): DailyHabitTargets => {
  if (typeof value === 'number') {
    return {
      morning: normalizeValue(value),
      day: 0,
      evening: 0,
    };
  }

  if (value && typeof value === 'object') {
    const source = value as Partial<DailyHabitTargets>;
    return {
      morning: normalizeValue(source.morning),
      day: normalizeValue(source.day),
      evening: normalizeValue(source.evening),
    };
  }

  return { ...defaultDailyHabitTargets };
};

export const sumDailyHabitTargets = (targets: DailyHabitTargets): number =>
  targets.morning + targets.day + targets.evening;

export const calculateRemainingTargets = (
  targets: DailyHabitTargets,
  loggedCount: number,
): DailyHabitTargets => {
  let remainingLogs = Math.max(loggedCount, 0);
  const remainingTargets: DailyHabitTargets = { ...targets };

  (['morning', 'day', 'evening'] as const).forEach((slot) => {
    if (remainingLogs <= 0) return;
    const used = Math.min(remainingTargets[slot], remainingLogs);
    remainingTargets[slot] -= used;
    remainingLogs -= used;
  });

  return remainingTargets;
};

export const hasAnyDailyTarget = (targets: DailyHabitTargets): boolean =>
  sumDailyHabitTargets(targets) > 0;
