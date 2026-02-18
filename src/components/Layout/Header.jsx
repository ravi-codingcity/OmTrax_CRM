import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate, NavLink } from 'react-router-dom';
import omtrax_logo from '../../assets/OmTrax.png';

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
    dismissReminder,
    dismissAllReminders,
    deleteNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissingIds, setDismissingIds] = useState(new Set());
  const notificationRef = useRef(null);

  // Combine notifications and reminders, sorted by date (newest first), limit to 20
  // Filter out read/dismissed reminders for all users
  const allNotifications = useMemo(() => {
    let combined = [...notifications, ...reminders];
    
    // Filter out read reminders (they should not appear for any user)
    combined = combined.filter((n) => {
      // Keep non-reminder notifications as is (unless read for Admin)
      if (n.type !== 'reminder' && n.type !== 'overdue') {
        return !n.isRead;
      }
      // For reminders/overdue: only show unread ones
      return !n.isRead;
    });
    
    // Sort by date descending (latest first)
    const sorted = combined.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.nextFollowUpDate);
      const dateB = new Date(b.createdAt || b.nextFollowUpDate);
      return dateB - dateA;
    });
    // Limit to 20 notifications
    return sorted.slice(0, 20);
  }, [notifications, reminders]);

  // Total badge count (unread notifications + unread reminders)
  // For Salesperson: only count unread reminders that are not dismissed
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
    if (notification.isRead) return;
    
    const notificationId = notification._id;
    
    // Start dismiss animation
    setDismissingIds(prev => new Set([...prev, notificationId]));
    
    // For reminders/overdue
    if (notification.type === 'reminder' || notification.type === 'overdue') {
      await markReminderAsRead(notificationId);
      // Dismiss after animation completes
      setTimeout(async () => {
        await dismissReminder(notificationId);
        setDismissingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }, 300);
      return;
    }
    
    // For regular notifications (new_entry, sales_entry, followup)
    await markAsRead(notificationId);
    // Delete notification after animation
    setTimeout(async () => {
      await deleteNotification(notificationId);
      setDismissingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 300);
  };

  const handleMarkAllAsRead = async () => {
    // Start dismiss animation for all
    const allIds = allNotifications.map(n => n._id);
    setDismissingIds(new Set(allIds));
    
    // Dismiss all after animation
    setTimeout(async () => {
      await markAllAsRead();
      await dismissAllReminders();
      setDismissingIds(new Set());
    }, 300);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isToday = date.toDateString() === now.toDateString();
    
    // For today's date
    if (isToday) {
      return 'Today';
    }
    
    // For dates in the past
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays > 1 && diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 0 && diffDays > -7) {
      // Future dates (upcoming reminders)
      const futureDays = Math.abs(diffDays);
      if (futureDays === 1) return 'Tomorrow';
      return `In ${futureDays} days`;
    } else {
      // Older or further future - show date
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
  };

  const formatFollowUpDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
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

    // New sales entry notification (Admin only)
    if (notification.type === 'new_entry' || notification.type === 'sales_entry') {
      return (
        <>
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-green-600">📋 New Entry</span>
            <span className="text-gray-600"> added by </span>
            <span className="font-medium">{getSalesPersonName()}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Company: {notification.companyName || notification.salesEntry?.companyName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Status: {notification.queryStatus || notification.salesEntry?.queryStatus || 'N/A'}
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
    <>
    <header className="bg-gradient-to-r from-blue-100 via-white to-blue-200 border-b border-gray-300/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div>
                <img src={omtrax_logo} alt="OmTrax Logo" className="h-8 sm:h-9 w-auto" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-white/60 backdrop-blur-sm px-1.5 py-1 rounded-xl border border-gray-100">
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
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notification Bell - Available for all users */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-h-[80vh] sm:max-h-none">
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
                      allNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50
                            transition-all duration-300 ease-out
                            ${dismissingIds.has(notification._id) ? 'opacity-0 -translate-x-4 max-h-0 py-0 overflow-hidden' : 'opacity-100 translate-x-0 max-h-40'}
                            ${!notification.isRead 
                              ? notification.type === 'overdue' 
                                ? 'bg-orange-50/50' 
                                : notification.type === 'reminder' 
                                  ? 'bg-yellow-50/50' 
                                  : (notification.type === 'new_entry' || notification.type === 'sales_entry')
                                    ? 'bg-green-50/50'
                                    : 'bg-blue-50/50'
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              !notification.isRead
                                ? notification.type === 'overdue'
                                  ? 'bg-orange-500'
                                  : notification.type === 'reminder'
                                    ? 'bg-yellow-500'
                                    : (notification.type === 'new_entry' || notification.type === 'sales_entry')
                                      ? 'bg-green-500'
                                      : 'bg-blue-500' 
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
              className="hidden md:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
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

    {/* Mobile Bottom Navigation Bar */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl">
      <div className="flex items-center justify-around px-2 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {link.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        
        {/* Logout Button in Bottom Nav */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] text-gray-500 hover:text-red-500 hover:bg-red-50"
        >
          <div className="p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Logout</span>
        </button>
      </div>
    </nav>
    </>
  );
};

export default Header;
