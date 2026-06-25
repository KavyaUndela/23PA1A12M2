import { NotificationItem, NotificationResponse, NotificationType } from '../types';
import { fetchAndLog } from '../lib/loggingMiddleware';

/**
 * API client for the Campus notification service.
 * 
 * This module handles communication with the evaluation service backend,
 * including request logging and error handling.
 */

// By default, point to the local mock server for development/testing.
// Override with VITE_API_BASE_URL environment variable to use a different backend.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/evaluation-service/notifications';

interface FetchNotificationsOptions {
  limit?: number;
  page?: number;
  notificationType?: NotificationType;
}

/**
 * Construct the full request URL with query parameters.
 */
function buildUrl(options: FetchNotificationsOptions): string {
  const url = new URL(BASE_URL);
  
  if (options.limit) {
    url.searchParams.set('limit', String(options.limit));
  }
  if (options.page) {
    url.searchParams.set('page', String(options.page));
  }
  if (options.notificationType) {
    url.searchParams.set('notification_type', options.notificationType);
  }
  
  return url.toString();
}

/**
 * Fetch notifications from the backend.
 * Automatically logs all requests via the logging middleware.
 * 
 * @param options - Query options (limit, page, filter by type)
 * @returns Array of notification items
 * @throws Error if the API returns a non-2xx status
 */
export async function fetchNotifications(options: FetchNotificationsOptions = {}): Promise<NotificationItem[]> {
  const requestUrl = buildUrl(options);
  const authToken = import.meta.env.VITE_API_TOKEN;
  
  const response = await fetchAndLog(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      // Include auth token if configured
      ...(authToken ? { Authorization: authToken } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Notification API returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as NotificationResponse;
  return data.notifications || [];
}
