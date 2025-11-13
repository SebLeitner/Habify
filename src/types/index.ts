export type ActivityAttributeType = 'number' | 'text' | 'timeRange' | 'duration';

export type ActivityAttribute = {
  id: string;
  name: string;
  type: ActivityAttributeType;
  unit?: string | null;
};

export type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  categories: string[];
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
  note?: string;
  attributes?: LogAttributeValue[];
  userId: string;
};
