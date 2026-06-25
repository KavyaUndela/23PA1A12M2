import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Container, Divider, FormControl, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Tab, Tabs, Typography } from '@mui/material';
import { fetchNotifications } from './api/notifications';
import { NotificationItem, NotificationType } from './types';
import { recordLog } from './lib/loggingMiddleware';
import { topNNotifications } from './utils/priorities';

/**
 * Campus Notification Platform
 * 
 * A responsive web app for managing student notifications with:
 * - Real-time fetching from a backend API
 * - Client-side priority ranking (top 10 inbox)
 * - Viewed/unviewed state tracking
 * - Request logging and analytics via middleware
 */

const DEFAULT_PAGE_SIZE = 12;
const NOTIFICATION_TYPES = ['All', 'Event', 'Result', 'Placement'] as const;

// Fallback sample data shown when API is unavailable
const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  { ID: 'b283218f-ea5a-4b7c-93a9-1f2f40d64b0', Type: 'Placement', Message: 'CSX Corporation hiring', Timestamp: '2026-04-22T17:51:18Z' },
  { ID: '81589ada-0ad3-4f77-9554-f52fb558e09d', Type: 'Event', Message: 'Farewell ceremony', Timestamp: '2026-04-22T17:51:06Z' },
  { ID: '0005513a-142b-4bbc-8678-eefec65e1ede', Type: 'Result', Message: 'Mid-semester results', Timestamp: '2026-04-22T17:50:54Z' },
  { ID: 'ea836726-c25e-4f21-a72f-544a6af8a37f', Type: 'Result', Message: 'Project review completed', Timestamp: '2026-04-22T17:50:42Z' },
  { ID: '8a7412bd-6065-4d09-8501-a37f11cc848b', Type: 'Placement', Message: 'Advanced Micro Devices Inc. recruiting', Timestamp: '2026-04-22T17:49:42Z' }
];

/**
 * Convert an ISO timestamp to a human-readable relative time string.
 * Examples: "just now", "5m ago", "2h ago", "3d ago"
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const elapsedMs = Date.now() - date.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  
  if (elapsedMinutes < 1) return 'just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

/**
 * Get a Material UI color for each notification type.
 * Colors help users quickly identify notification categories.
 */
function getTypeColor(type: NotificationType): 'success' | 'primary' | 'default' {
  switch (type) {
    case 'Placement':
      return 'success';  // Green - highest priority
    case 'Result':
      return 'primary';  // Blue - medium priority
    case 'Event':
      return 'default';  // Gray - lower priority
    default:
      return 'default';
  }
}

export default function App() {
  // Notification data and filtering
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'All' | NotificationType>('All');
  
  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [viewedNotificationIds, setViewedNotificationIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Note: Logging middleware runs automatically in the background

  // Load viewed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('campus_viewed_notifications');
      if (stored) {
        setViewedNotificationIds(JSON.parse(stored));
      }
    } catch (err) {
      // Silently fail if localStorage is corrupted
    }
  }, []);

  // Persist viewed state to localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('campus_viewed_notifications', JSON.stringify(viewedNotificationIds));
    } catch (err) {
      // Silently fail if storage quota exceeded
    }
  }, [viewedNotificationIds]);

  // Fetch notifications from backend whenever page or filter changes
  useEffect(() => {
    const loadNotifications = async () => {
      setErrorMessage(null);
      try {
        const fetchOptions = {
          limit: DEFAULT_PAGE_SIZE,
          page: currentPage,
          notificationType: typeFilter === 'All' ? undefined : typeFilter
        };
        
        const remoteNotifications = await fetchNotifications(fetchOptions);
        
        if (remoteNotifications.length === 0) {
          // No results - show fallback sample data
          setNotifications(FALLBACK_NOTIFICATIONS);
          recordLog({
            level: 'info',
            message: 'Backend returned no notifications; showing fallback data',
            metadata: {
  page: String(currentPage),
  filter: typeFilter
}
          });
          return;
        }
        
        setNotifications(remoteNotifications);
      } catch (error) {
        // API unavailable - fall back to sample data
        setNotifications(FALLBACK_NOTIFICATIONS);
        setErrorMessage('Unable to reach the notification service. Displaying sample data instead.');
        recordLog({
          level: 'error',
          message: 'Failed to fetch notifications from backend',
          metadata: {
  page: String(currentPage),
  filter: typeFilter
}
        });
      }
    };

    loadNotifications();
  }, [currentPage, typeFilter]);

  // Apply type filter to notifications
  const filteredNotifications = useMemo(() => {
    if (typeFilter === 'All') {
      return notifications;
    }
    return notifications.filter((notif) => notif.Type === typeFilter);
  }, [notifications, typeFilter]);

  // Select top 10 for priority inbox
  const priorityNotifications = useMemo(() => {
    return topNNotifications(filteredNotifications, 10);
  }, [filteredNotifications]);

  // Calculate stats for the UI
  const unviewedCount = filteredNotifications.filter((notif) => !viewedNotificationIds[notif.ID]).length;
  const totalCount = filteredNotifications.length;

  // Helper: mark a single notification as viewed
  const markAsViewed = (notification: NotificationItem) => {
    setViewedNotificationIds((current) => ({
      ...current,
      [notification.ID]: true
    }));
  };

  // Helper: mark all filtered notifications as viewed
  const markAllAsViewed = () => {
    const updated = { ...viewedNotificationIds };
    filteredNotifications.forEach((notif) => {
      updated[notif.ID] = true;
    });
    setViewedNotificationIds(updated);
  };

  return (
    <Container maxWidth="lg" sx={{ paddingTop: 4, paddingBottom: 6 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Campus Notification Platform
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="textSecondary">
        View and manage your academic notifications with automatic priority ranking
      </Typography>

      {/* Controls Panel */}
      <Paper sx={{ padding: 2, marginBottom: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {/* Type Filter Dropdown */}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="type-filter-label">Notification Type</InputLabel>
            <Select
              labelId="type-filter-label"
              value={typeFilter}
              label="Notification Type"
              onChange={(event: SelectChangeEvent) => {
                setTypeFilter(event.target.value as 'All' | NotificationType);
                setCurrentPage(1);  // Reset to page 1 when filtering
              }}
            >
              {NOTIFICATION_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Button variant="contained" onClick={() => setCurrentPage(1)}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={markAllAsViewed}>
            Mark as viewed
          </Button>

          {/* Stats */}
          <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
            <Chip label={`${totalCount} Total`} color="primary" />
            <Chip label={`${unviewedCount} Unviewed`} color="secondary" />
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onChange={(_, idx) => setActiveTab(idx)} sx={{ marginTop: 2 }}>
          <Tab label="All Notifications" />
          <Tab label="Priority Inbox" />
        </Tabs>
      </Paper>

      {/* Error Banner */}
      {errorMessage && (
        <Paper sx={{ padding: 2, marginBottom: 3, backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
          <Typography variant="body2" color="textSecondary">
            ⚠️ {errorMessage}
          </Typography>
        </Paper>
      )}

      {/* Tab 1: All Notifications */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Notifications
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
          
          {filteredNotifications.length === 0 ? (
            <Typography color="textSecondary">No notifications to display.</Typography>
          ) : (
            filteredNotifications.map((notification) => {
              const isViewed = viewedNotificationIds[notification.ID];
              return (
                <Paper
                  key={notification.ID}
                  sx={{
                    padding: 2,
                    marginBottom: 2,
                    borderLeft: `4px solid ${isViewed ? '#ccc' : '#1976d2'}`,
                    backgroundColor: isViewed ? '#fafafa' : '#fff'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1">{notification.Message}</Typography>
                    <Chip label={notification.Type} color={getTypeColor(notification.Type)} size="small" />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ marginTop: 1 }}>
                    {formatRelativeTime(notification.Timestamp)}
                  </Typography>
                  
                  <Box sx={{ marginTop: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {!isViewed && <Chip label="Unviewed" color="warning" size="small" />}
                    <Button size="small" variant="outlined" onClick={() => markAsViewed(notification)}>
                      Mark as viewed
                    </Button>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
      )}

      {/* Tab 2: Priority Inbox */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Priority Inbox (Top 10 Most Important)
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
          
          {priorityNotifications.length === 0 ? (
            <Typography color="textSecondary">No priority notifications available.</Typography>
          ) : (
            priorityNotifications.map((notification) => {
              const isViewed = viewedNotificationIds[notification.ID];
              return (
                <Paper
                  key={notification.ID}
                  sx={{
                    padding: 2,
                    marginBottom: 2,
                    borderLeft: '4px solid #4caf50',
                    backgroundColor: isViewed ? '#f1f8e9' : '#fff'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1">{notification.Message}</Typography>
                    <Chip label={notification.Type} color={getTypeColor(notification.Type)} size="small" />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ marginTop: 1 }}>
                    {formatRelativeTime(notification.Timestamp)}
                  </Typography>
                  
                  <Box sx={{ marginTop: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {!isViewed && <Chip label="Unviewed" color="warning" size="small" />}
                    <Button size="small" variant="outlined" onClick={() => markAsViewed(notification)}>
                      Mark as viewed
                    </Button>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
      )}

    </Container>
  );
}
