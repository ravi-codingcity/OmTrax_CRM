import { createContext, useContext, useState, useCallback } from 'react';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [reminderSummary, setReminderSummary] = useState({ total: 0, overdue: 0, today: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch follow-up reminders from the new endpoint
  const fetchReminders = useCallback(async () => {
    try {
      console.log('Fetching reminders from /notifications/reminders...');
      const response = await notificationAPI.getReminders();
      console.log('Reminders API response:', response.data);

      // Parse response: { success: true, data: [...], summary: {...} }
      const reminderData = response.data?.data || [];
      const summary = response.data?.summary || { total: 0, overdue: 0, today: 0 };

      // Add type based on isOverdue flag if not already set
      // Set createdAt to current time if not provided (for display timestamp)
      const now = new Date().toISOString();
      const processedReminders = reminderData.map((reminder) => ({
        ...reminder,
        type: reminder.type || (reminder.isOverdue ? 'overdue' : 'reminder'),
        followUpDate: reminder.nextFollowUpDate,
        createdAt: reminder.createdAt || now, // Use current time for display
        isLocalReminder: false, // These are from backend
      }));

      console.log('Fetched reminders:', processedReminders.length, 'total (', summary.overdue, 'overdue,', summary.today, 'today)');
      setReminders(processedReminders);
      setReminderSummary(summary);
      return processedReminders;
    } catch (err) {
      console.error('Error fetching reminders:', err);
      console.error('Error response:', err.response?.data);
      return [];
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await notificationAPI.getAll(params);
      console.log('Notifications API response:', response.data);
      
      // Handle different response formats
      let data = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data?.notifications) {
        data = response.data.notifications;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      console.log('Parsed notifications:', data);
      setNotifications(data);
      return data;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      console.error('Error response:', err.response?.data);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      console.log('Unread count API response:', response.data);
      
      // Handle different response formats: {data: {unreadCount: 2}} or {unreadCount: 2} or {count: 2}
      const count = response.data?.data?.unreadCount ?? response.data?.unreadCount ?? response.data?.data?.count ?? response.data?.count ?? 0;
      console.log('Parsed unread count:', count);
      setUnreadCount(count);
      return count;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      console.error('Error response:', err.response?.data);
      return 0;
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId || n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return { success: true };
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return { success: false };
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      return { success: true };
    } catch (err) {
      console.error('Error marking all as read:', err);
      return { success: false };
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationAPI.delete(notificationId);
      setNotifications((prev) => 
        prev.filter((n) => n._id !== notificationId && n.id !== notificationId)
      );
      return { success: true };
    } catch (err) {
      console.error('Error deleting notification:', err);
      return { success: false };
    }
  }, []);

  // Clear all read notifications
  const clearReadNotifications = useCallback(async () => {
    try {
      await notificationAPI.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      return { success: true };
    } catch (err) {
      console.error('Error clearing read notifications:', err);
      return { success: false };
    }
  }, []);

  // Generate overdue notifications (Admin only)
  const generateOverdueNotifications = useCallback(async () => {
    try {
      await notificationAPI.generateOverdue();
      await fetchNotifications();
      await fetchUnreadCount();
      return { success: true };
    } catch (err) {
      console.error('Error generating overdue notifications:', err);
      return { success: false };
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Get notifications for current user (returns current state)
  const getNotificationsForUser = useCallback(() => {
    return notifications;
  }, [notifications]);

  // Get unread count for current user
  const getUnreadCount = useCallback(() => {
    return unreadCount;
  }, [unreadCount]);

  // Get all notifications including reminders (combined and sorted by date)
  const getAllNotifications = useCallback(() => {
    // Combine notifications and reminders, sort by createdAt descending
    const combined = [...notifications, ...reminders];
    return combined.sort((a, b) => new Date(b.createdAt || b.nextFollowUpDate) - new Date(a.createdAt || a.nextFollowUpDate));
  }, [notifications, reminders]);

  // Mark a reminder as read (does not remove from list)
  const markReminderAsRead = useCallback(async (reminderId) => {
    try {
      // Call API to mark as read
      if (reminderId && !reminderId.startsWith('reminder_')) {
        await notificationAPI.markAsRead(reminderId);
      }
      // Update local state to mark as read
      setReminders((prev) =>
        prev.map((r) => (r._id === reminderId ? { ...r, isRead: true } : r))
      );
    } catch (err) {
      console.error('Error marking reminder as read:', err);
    }
  }, []);

  // Get unread reminders count
  const getUnreadRemindersCount = useCallback(() => {
    return reminders.filter((r) => !r.isRead).length;
  }, [reminders]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        reminders,
        reminderSummary,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        fetchReminders,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        generateOverdueNotifications,
        getNotificationsForUser,
        getUnreadCount,
        getAllNotifications,
        markReminderAsRead,
        getUnreadRemindersCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
