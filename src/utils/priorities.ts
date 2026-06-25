import { NotificationItem } from '../types';

/**
 * Priority ranking system for the Campus notification inbox.
 * 
 * Notifications are scored based on:
 * 1. Type weight (Placement=3, Result=2, Event=1)
 * 2. Recency boost (newer notifications get a small boost, max 1 point)
 * 
 * The topNNotifications function uses an efficient bounded buffer
 * to select the top N highest-scoring notifications.
 */

// Higher weights mean higher priority in the inbox
const typeWeight: Record<string, number> = {
  Placement: 3,  // Job placements are most important
  Result: 2,     // Academic results are moderately important
  Event: 1       // General events have lower priority
};

/**
 * Calculate a numeric score for a notification.
 * 
 * Score = Type Weight + Recency Bonus
 * where Recency Bonus = max(0, 1 - (ageInSeconds / 86400))
 * 
 * This gives newer items a slight advantage while respecting type priority.
 * An item from 24 hours ago gets 0 recency bonus, newer items get 0-1 bonus.
 */
export function scoreNotification(notification: NotificationItem): number {
  const baseWeight = typeWeight[notification.Type] ?? 1;
  const timestamp = new Date(notification.Timestamp).getTime();
  const ageInSeconds = Math.max(0, (Date.now() - timestamp) / 1000);
  
  // Recency bonus decays from 1 (just now) to 0 (24+ hours old)
  const recencyBonus = Math.max(0, 1 - Math.min(ageInSeconds / 86400, 1));
  
  return baseWeight + recencyBonus;
}

/**
 * Comparator function for sorting notifications by score.
 * Sorts in descending order (highest score first).
 * Breaks ties by preferring newer timestamps.
 */
export function compareByScore(a: NotificationItem, b: NotificationItem): number {
  const scoreA = scoreNotification(a);
  const scoreB = scoreNotification(b);
  
  // Primary sort: by score (descending)
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }
  
  // Tiebreaker: by timestamp (newer first)
  return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
}

/**
 * Select the top N notifications from a list using a bounded buffer algorithm.
 * 
 * This is more efficient than sorting the entire list when N is small relative
 * to the input size. Time complexity: O(n log n) worst case.
 * 
 * @param notifications - Array of all notifications
 * @param limit - How many top notifications to return (default 10)
 * @returns The top N notifications sorted by score
 */
export function topNNotifications(notifications: NotificationItem[], limit = 10): NotificationItem[] {
  const buffer: NotificationItem[] = [];

  notifications.forEach((notification) => {
    if (buffer.length < limit) {
      // Buffer not full yet, just add and sort
      buffer.push(notification);
      buffer.sort(compareByScore);
      return;
    }

    // Buffer is full. Check if this notification scores better than our worst item.
    const worstInBuffer = buffer[buffer.length - 1];
    if (compareByScore(notification, worstInBuffer) > 0) {
      // Replace the lowest-scoring item with this one
      buffer[buffer.length - 1] = notification;
      buffer.sort(compareByScore);
    }
  });

  return buffer.slice(0, limit);
}
