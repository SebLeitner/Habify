export type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  categories: string[];
  createdAt: string;
  updatedAt: string;
};

export type LogEntry = {
  id: string;
  activityId: string;
  timestamp: string;
  note?: string;
  userId: string;
};
