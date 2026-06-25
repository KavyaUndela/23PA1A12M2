export type NotificationType = 'Event' | 'Result' | 'Placement';

export interface NotificationItem {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface NotificationResponse {
  notifications: NotificationItem[];
}

export interface LogEntry {
  id: string;
  level: 'info' | 'error';
  message: string;
  metadata?: Record<string, string>;
  createdAt: string;
}
