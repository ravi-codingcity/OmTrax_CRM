import axios from 'axios';

const API_BASE_URL = 'https://peachpuff-boar-650004.hostingersite.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token + active department
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('omtrax_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Attach the active department so the backend can scope data. The backend
    // only honours this for admins; other roles are locked to their own dept.
    const department = localStorage.getItem('omtrax_department');
    if (department) {
      config.params = { ...(config.params || {}), department };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if not already on login page and not a login request
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isOnLoginPage = window.location.pathname === '/login';
      
      if (!isLoginRequest && !isOnLoginPage) {
        localStorage.removeItem('omtrax_token');
        localStorage.removeItem('omtrax_user');
        localStorage.removeItem('omtrax_department');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/update-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
};

// ==================== SALES APIs ====================
export const salesAPI = {
  getAll: (params = {}) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  getTodayFollowUps: () => api.get('/sales/follow-ups/today'),
  getOverdueFollowUps: () => api.get('/sales/follow-ups/overdue'),
  reassignLeads: (data) => api.post('/sales/reassign-leads', data),
  // Admin only — the backend rejects non-admins with 403
  exportEntries: (params = {}) => api.get('/sales/export', { params, responseType: 'blob' }),
};

// ==================== BUSINESS APIs ====================
export const businessAPI = {
  getAll: (params = {}) => api.get('/business', { params }),
  getById: (id) => api.get(`/business/${id}`),
  create: (data) => api.post('/business', data),
  update: (id, data) => api.put(`/business/${id}`, data),
  delete: (id) => api.delete(`/business/${id}`),
};

// ==================== PURCHASE APIs ====================
export const purchaseAPI = {
  getItems: (params = {}) => api.get('/purchase/items', { params }),
  createItem: (data) => api.post('/purchase/items', data),
  getSuppliers: (params = {}) => api.get('/purchase/suppliers', { params }),
  createSupplier: (data) => api.post('/purchase/suppliers', data),
  getLocations: (params = {}) => api.get('/purchase/locations', { params }),
  createLocation: (data) => api.post('/purchase/locations', data),
  getEntries: (params = {}) => api.get('/purchase/entries', { params }),
  getEntry: (id) => api.get(`/purchase/entries/${id}`),
  create: (data) => api.post('/purchase/entries', data),
  update: (id, data) => api.put(`/purchase/entries/${id}`, data),
  delete: (id) => api.delete(`/purchase/entries/${id}`),
  dispatch: (id, data) => api.post(`/purchase/entries/${id}/dispatch`, data),
  return: (id, data) => api.post(`/purchase/entries/${id}/return`, data),
  getInventory: () => api.get('/purchase/inventory'),
  getStats: () => api.get('/purchase/stats'),
};

// ==================== RECRUITMENT (HR) APIs ====================
export const recruitmentAPI = {
  getAll: (params = {}) => api.get('/recruitment', { params }),
  getStats: () => api.get('/recruitment/stats'),
  getRecruiters: () => api.get('/recruitment/recruiters'),
  getById: (id) => api.get(`/recruitment/${id}`),
  create: (data) => api.post('/recruitment', data),
  createFromSales: (salesEntryId, data = {}) => api.post(`/recruitment/from-sales/${salesEntryId}`, data),
  update: (id, data) => api.put(`/recruitment/${id}`, data),
  reassign: (id, data) => api.put(`/recruitment/${id}/reassign`, data),
  delete: (id) => api.delete(`/recruitment/${id}`),
};

// ==================== FOLLOW-UP APIs ====================
export const followUpAPI = {
  create: (data) => api.post('/follow-ups', data),
  getMy: (params = {}) => api.get('/follow-ups/my', { params }),
  getBySalesEntry: (salesEntryId) => api.get(`/follow-ups/sales/${salesEntryId}`),
  getById: (id) => api.get(`/follow-ups/${id}`),
  update: (id, data) => api.put(`/follow-ups/${id}`, data),
  delete: (id) => api.delete(`/follow-ups/${id}`),
};

// ==================== NOTIFICATION APIs ====================
export const notificationAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getReminders: () => api.get('/notifications/reminders'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
  create: (data) => api.post('/notifications', data),
  generateOverdue: () => api.post('/notifications/generate-overdue'),
  // Dismiss endpoints for reminders
  dismissReminder: (id) => api.put(`/notifications/reminders/${id}/dismiss`),
  dismissAllReminders: () => api.put('/notifications/reminders/dismiss-all'),
};

// ==================== DASHBOARD APIs ====================
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAnalytics: (params = {}) => api.get('/dashboard/analytics', { params }),
  getActivities: () => api.get('/dashboard/activities'),
  getSalespersonPerformance: () => api.get('/dashboard/salesperson-performance'),
};

// ==================== SALES VISIT APIs ====================
export const salesVisitAPI = {
  getAll: (params = {}) => api.get('/sales-visits', { params }),
  getById: (id) => api.get(`/sales-visits/${id}`),
  create: (data) => {
    // Send JSON with base64 image - longer timeout for large images
    return api.post('/sales-visits', {
      companyName: data.companyName,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      date: data.date,  // YYYY-MM-DD
      time: data.time,  // HH:mm
      imageBase64: data.imageBase64,
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000,  // 2 minutes timeout for large image uploads
    });
  },
  delete: (id) => api.delete(`/sales-visits/${id}`),
};

// ==================== BRANCH APIs ====================
export const branchAPI = {
  getAll: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export default api;
