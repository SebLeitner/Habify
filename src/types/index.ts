export type ActivityAttributeType = 'number' | 'text' | 'timeRange' | 'duration';

export type ActivityAttribute = {
  id: string;
  name: string;
  type: ActivityAttributeType;
  unit?: string | null;
};

export type DailyHabitTargets = {
  morning: number;
  day: number;
  evening: number;
};

export type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  minLogsPerDay?: DailyHabitTargets;
  attributes: ActivityAttribute[];
  createdAt: string;
  updatedAt: string;
};

export type LogAttributeValue =
  | {
      attributeId: string;
      type: 'number';
      value: number | null;
    }
  | {
      attributeId: string;
      type: 'text';
      value: string;
    }
  | {
      attributeId: string;
      type: 'timeRange';
      start: string | null;
      end: string | null;
    }
  | {
      attributeId: string;
      type: 'duration';
      hours: number | null;
      minutes: number | null;
    };

export type LogEntry = {
  id: string;
  activityId: string;
  timestamp: string;
  timeSlot?: 'morning' | 'day' | 'evening';
  note?: string;
  attributes?: LogAttributeValue[];
  mindfulnessId?: string;
  mindfulnessTitle?: string;
  userId: string;
};

export type DailyHighlight = {
  id: string;
  date: string;
  title: string;
  text: string;
  photoUrl?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type MindfulnessActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};
