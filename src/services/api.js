import axios from 'axios';

// Backend API base.
// --- DEVELOPMENT (active) --- local Express server, PORT=5000 in CRM Backend/.env
// const API_BASE_URL = 'http://localhost:5000/api';

// --- PRODUCTION (restore before building for deploy) ---
 const API_BASE_URL = 'https://crm.omtraxcrm.in/api';

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
// Account creation and password resets are admin-only (User Management panel).
// There is no public signup / self-service reset flow.
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/update-password', data),
  getUsers: (params = {}) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  resetUserPassword: (id, newPassword) => api.put(`/auth/users/${id}/password`, { newPassword }),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
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
  receive: (id, data) => api.post(`/purchase/entries/${id}/receive`, data),
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

// ==================== VENDOR APIs ====================
// Vendors are shared between the Purchase and Finance departments — the backend
// deliberately does not department-scope them.
export const vendorAPI = {
  getAll: (params = {}) => api.get('/vendors', { params }),
  getStats: () => api.get('/vendors/stats'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  // Generate a KYC link without filling in the Add Vendor form — the vendor
  // supplies their own details. Independent of create() above.
  createKycRequest: (data) => api.post('/vendors/kyc-request', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  // KYC link management (Purchase Manager, Finance, Admin)
  generateKycLink: (id, data = {}) => api.post(`/vendors/${id}/kyc-link`, data),
  markKycLinkSent: (id, data = {}) => api.post(`/vendors/${id}/kyc-link/sent`, data),
  // KYC review — the backend rejects non-Finance callers with 403
  startKycReview: (id) => api.post(`/vendors/${id}/kyc/review`),
  decideKyc: (id, data) => api.post(`/vendors/${id}/kyc/decision`, data),
  // KYC documents. Cloudinary assets are authenticated, so the backend issues
  // short-lived signed view/download URLs after checking permissions.
  getDocuments: (id) => api.get(`/vendors/${id}/documents`),
  documentUrl: (id, docId, download = false) =>
    api.get(`/vendors/${id}/documents/${docId}`, { params: { download, format: 'json' } }),
};

// ==================== PURCHASE ORDER APIs ====================
export const purchaseOrderAPI = {
  getAll: (params = {}) => api.get('/purchase-orders', { params }),
  getStats: () => api.get('/purchase-orders/stats'),
  // Terms used on previous POs, offered as suggestions on the next one
  getTermsSuggestions: () => api.get('/purchase-orders/terms-suggestions'),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  setStatus: (id, data) => api.post(`/purchase-orders/${id}/status`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
};

// ==================== RATE COMPARISON APIs ====================
// The approval step that precedes a Purchase Order. Decisions are Director /
// Admin only — the backend rejects anyone else with 403.
export const rateComparisonAPI = {
  getAll: (params = {}) => api.get('/rate-comparisons', { params }),
  getStats: () => api.get('/rate-comparisons/stats'),
  getById: (id) => api.get(`/rate-comparisons/${id}`),
  create: (data) => api.post('/rate-comparisons', data),
  update: (id, data) => api.put(`/rate-comparisons/${id}`, data),
  submit: (id) => api.post(`/rate-comparisons/${id}/submit`),
  decide: (id, data) => api.post(`/rate-comparisons/${id}/decision`, data),
  delete: (id) => api.delete(`/rate-comparisons/${id}`),
};

// ==================== PUBLIC KYC FORM ====================
// The vendor filling this in has no CRM account, so these calls must NOT carry
// the auth token or the department param. A bare axios instance is used so the
// interceptors above never touch them.
const publicApi = axios.create({ baseURL: API_BASE_URL });

// A submission carries up to five 1 MB documents. Without a ceiling a stalled
// connection leaves the vendor's form spinning forever with no way to retry,
// which is exactly the "stuck on submitting" symptom.
const KYC_SUBMIT_TIMEOUT_MS = 120000; // 2 minutes
const KYC_LOAD_TIMEOUT_MS = 20000;

export const kycAPI = {
  getForm: (token) => publicApi.get(`/kyc/${token}`, { timeout: KYC_LOAD_TIMEOUT_MS }),
  /**
   * @param onProgress optional (percent:number) => void, driven by the browser's
   *                   real upload progress so the vendor sees movement
   */
  submit: (token, formData, onProgress) =>
    publicApi.post(`/kyc/${token}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: KYC_SUBMIT_TIMEOUT_MS,
      onUploadProgress: onProgress
        ? (e) => {
            if (!e.total) return;
            onProgress(Math.min(100, Math.round((e.loaded * 100) / e.total)));
          }
        : undefined,
    }),
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
