import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate, NavLink } from 'react-router-dom';
import omtrax_logo from '../../assets/omtrax_logo.png';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const { 
    notifications, 
    reminders,
    unreadCount, 
    loading,
    fetchNotifications, 
    fetchUnreadCount,
    fetchReminders,
    markAsRead, 
    markAllAsRead,
    markReminderAsRead,
    getUnreadRemindersCount,
  } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Combine notifications and reminders, sorted by date
  const allNotifications = useMemo(() => {
    const combined = [...notifications, ...reminders];
    return combined.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.nextFollowUpDate);
      const dateB = new Date(b.createdAt || b.nextFollowUpDate);
      return dateB - dateA;
    });
  }, [notifications, reminders]);

  // Total badge count (unread notifications + unread reminders)
  const totalBadgeCount = useMemo(() => {
    const unreadReminders = reminders.filter((r) => !r.isRead).length;
    return unreadCount + unreadReminders;
  }, [unreadCount, reminders]);

  // Fetch notifications and reminders on mount
  const loadNotifications = useCallback(async () => {
    if (user) {
      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
        fetchReminders(),
      ]);
    }
  }, [user, fetchNotifications, fetchUnreadCount, fetchReminders]);

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = async (notification) => {
    // For reminders, mark as read (same behavior as regular notifications)
    if (notification.type === 'reminder' || notification.type === 'overdue') {
      if (!notification.isRead) {
        await markReminderAsRead(notification._id);
      }
      return;
    }
    // For regular notifications, mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Also mark all reminders as read
    for (const r of reminders) {
      if (!r.isRead) {
        await markReminderAsRead(r._id);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatFollowUpDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderNotificationContent = (notification) => {
    // Get salesperson name from different possible structures
    const getSalesPersonName = () => {
      return notification.salesPersonName || 
             notification.salesPerson?.name || 
             notification.user?.name || 
             'Unknown';
    };

    if (notification.type === 'reminder' || notification.type === 'overdue') {
      return (
        <>
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-orange-600">
              {notification.type === 'overdue' ? '⚠️ Overdue' : '🔔 Reminder'}
            </span>
            <span className="text-gray-600"> Follow-up due for </span>
            <span className="font-medium">{notification.companyName || notification.salesEntry?.companyName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Contact: {notification.contactPerson || notification.salesEntry?.contactPerson}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Due: {formatFollowUpDate(notification.nextFollowUpDate || notification.followUpDate || notification.salesEntry?.nextFollowUpDate)}
            {isAdmin() && <span className="ml-2">• {getSalesPersonName()}</span>}
          </p>
        </>
      );
    }
    
    // Follow-up notification (type === 'followup')
    return (
      <>
        <p className="text-sm text-gray-800">
          <span className="font-semibold">{getSalesPersonName()}</span>
          <span className="text-gray-600"> added a follow-up for </span>
          <span className="font-medium">{notification.companyName || notification.salesEntry?.companyName}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">
          "{notification.remark || notification.message || 'No details'}"
        </p>
      </>
    );
  };

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/admin/new-entry', label: 'New Entry', icon: 'M12 4v16m8-8H4' },
    { to: '/admin/sales', label: 'All Sales', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const salesLinks = [
    { to: '/sales/new-entry', label: 'New Entry', icon: 'M12 4v16m8-8H4' },
    { to: '/sales/my-entries', label: 'My Entries', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to: '/sales/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const links = isAdmin() ? adminLinks : salesLinks;

  return (
    <header className="bg-gradient-to-r from-blue-100 via-white to-blue-200 border-b border-gray-300/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div>
                <img src={omtrax_logo} alt="OmTrax Logo" className="h-9 w-auto" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1 bg-white/60 backdrop-blur-sm px-1.5 py-1 rounded-xl border border-gray-100">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`
                }
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                <span className="hidden md:inline">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-2">
            {/* Notification Bell - Available for all users */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                    {totalBadgeCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center">
                        <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-gray-500">Loading notifications...</p>
                      </div>
                    ) : allNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      allNotifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
                            !notification.isRead ? 'bg-blue-50/50' : ''
                          } ${notification.type === 'overdue' && !notification.isRead ? 'bg-orange-50/50' : ''} ${notification.type === 'reminder' && !notification.isRead ? 'bg-yellow-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              notification.type === 'overdue' && !notification.isRead
                                ? 'bg-orange-500'
                                : notification.type === 'reminder' && !notification.isRead
                                  ? 'bg-yellow-500'
                                  : !notification.isRead
                                    ? 'bg-blue-500' 
                                    : 'bg-gray-300'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              {renderNotificationContent(notification)}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(notification.createdAt || notification.nextFollowUpDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 leading-tight">
                  {isAdmin() ? 'Admin' : user?.branch}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
