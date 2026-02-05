import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('omtrax_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('omtrax_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('omtrax_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('omtrax_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'followup', // 'followup' or 'reminder'
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const addReminder = useCallback((reminder) => {
    // Check if reminder already exists for this entry and date
    setReminders((prev) => {
      const exists = prev.some(
        (r) => r.entryId === reminder.entryId && r.followUpDate === reminder.followUpDate
      );
      if (exists) return prev;
      
      const newReminder = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'reminder',
        ...reminder,
      };
      return [newReminder, ...prev];
    });
  }, []);

  // Generate reminders for due follow-ups
  const generateReminders = useCallback((salesEntries, currentUser) => {
    if (!currentUser || !salesEntries) return;
    
    const today = new Date().toISOString().split('T')[0];
    const isAdmin = currentUser.role === 'admin';
    
    // Filter entries based on user role
    const relevantEntries = isAdmin 
      ? salesEntries 
      : salesEntries.filter((entry) => entry.salesPersonId === currentUser.id);
    
    // Find entries with follow-up due today or overdue
    relevantEntries.forEach((entry) => {
      if (entry.nextFollowUpDate && entry.nextFollowUpDate <= today) {
        addReminder({
          entryId: entry.id,
          companyName: entry.companyName,
          contactPerson: entry.contactPerson,
          salesPersonName: entry.salesPersonName,
          salesPersonId: entry.salesPersonId,
          followUpDate: entry.nextFollowUpDate,
          isOverdue: entry.nextFollowUpDate < today,
          forUserId: isAdmin ? 'admin' : currentUser.id,
        });
      }
    });
  }, [addReminder]);

  const markAsRead = (notificationId, type = 'notification') => {
    if (type === 'reminder') {
      setReminders((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    }
  };

  const markAllAsRead = (currentUser) => {
    const isAdmin = currentUser?.role === 'admin';
    
    // Mark notifications as read (admin only sees follow-up notifications)
    if (isAdmin) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    
    // Mark reminders as read (filtered by user)
    setReminders((prev) =>
      prev.map((r) => {
        if (isAdmin || r.forUserId === currentUser?.id || r.salesPersonId === currentUser?.id) {
          return { ...r, isRead: true };
        }
        return r;
      })
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
    setReminders([]);
  };

  // Get notifications for current user
  const getNotificationsForUser = useCallback((currentUser) => {
    if (!currentUser) return [];
    
    const isAdmin = currentUser.role === 'admin';
    
    // Admin sees all follow-up notifications from salespersons
    const userNotifications = isAdmin ? notifications : [];
    
    // Filter reminders based on user
    const userReminders = reminders.filter((r) => {
      if (isAdmin) return true;
      return r.forUserId === currentUser.id || r.salesPersonId === currentUser.id;
    });
    
    // Combine and sort by timestamp
    return [...userNotifications, ...userReminders].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [notifications, reminders]);

  const getUnreadCount = useCallback((currentUser) => {
    if (!currentUser) return 0;
    
    const isAdmin = currentUser.role === 'admin';
    
    const unreadNotifications = isAdmin 
      ? notifications.filter((n) => !n.isRead).length 
      : 0;
    
    const unreadReminders = reminders.filter((r) => {
      if (!r.isRead) {
        if (isAdmin) return true;
        return r.forUserId === currentUser.id || r.salesPersonId === currentUser.id;
      }
      return false;
    }).length;
    
    return unreadNotifications + unreadReminders;
  }, [notifications, reminders]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        reminders,
        addNotification,
        addReminder,
        generateReminders,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        getNotificationsForUser,
        getUnreadCount,
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
