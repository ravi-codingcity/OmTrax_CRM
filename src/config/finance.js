// Finance department + shared Vendor KYC configuration.
// Mirrors the backend rules in src/utils/department.js so the UI can hide what
// the API would refuse. The backend remains the enforcement point.

export const FINANCE_ROLES = ['finance_manager', 'accounts_executive'];
export const PURCHASE_ROLES = ['purchase_manager', 'branch_manager', 'warehouse_manager'];

export const isCrmAdmin = (user) => ['admin', 'director'].includes(user?.role);
export const isFinanceUser = (user) => FINANCE_ROLES.includes(user?.role);
export const isPurchaseUser = (user) => PURCHASE_ROLES.includes(user?.role);
export const isPurchaseManager = (user) => user?.role === 'purchase_manager';

// Who may see the shared vendor register
export const canViewVendors = (user) =>
  isCrmAdmin(user) || isPurchaseUser(user) || isFinanceUser(user);

// Who may CREATE or EDIT a vendor record.
// Finance is deliberately excluded — they review and verify what Purchase has
// recorded rather than altering it. Administrators still can.
export const canEditVendors = (user) => isCrmAdmin(user) || isPurchaseManager(user);

// Who may generate and share a vendor's KYC form link. Wider than editing:
// Finance may request a KYC, they just cannot edit the record afterwards.
export const canGenerateKycLink = (user) =>
  isCrmAdmin(user) || isPurchaseManager(user) || isFinanceUser(user);

// Alias kept so existing imports keep working. Prefer the specific helpers.
export const canManageVendors = canEditVendors;

// Finance is the ONLY department that approves or rejects KYC.
// Purchase users — Purchase Managers included — are deliberately excluded.
export const canReviewKyc = (user) => isCrmAdmin(user) || isFinanceUser(user);

// Purchase Orders are the Purchase Manager's (and Admin's) to create
export const canManagePurchaseOrders = (user) => isCrmAdmin(user) || isPurchaseManager(user);
export const canViewPurchaseOrders = (user) => isCrmAdmin(user) || isPurchaseUser(user);

export const financeRoleLabel = (role) =>
  ({ finance_manager: 'Finance Manager', accounts_executive: 'Accounts Executive' }[role] || role);

// ---- KYC status -----------------------------------------------------------

export const KYC_STATUSES = ['not_sent', 'sent', 'submitted', 'under_review', 'approved', 'rejected'];

export const kycStatusMeta = (status) =>
  ({
    not_sent: {
      label: 'Not Sent', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400',
      text: 'text-gray-600',
    },
    sent: {
      label: 'Sent', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500',
      text: 'text-blue-700',
    },
    submitted: {
      label: 'Submitted', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',
      text: 'text-amber-700',
    },
    under_review: {
      label: 'Under Finance Review', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500',
      text: 'text-indigo-700',
    },
    approved: {
      label: 'Approved', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500',
      text: 'text-green-700',
    },
    rejected: {
      label: 'Rejected', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500',
      text: 'text-red-700',
    },
  }[status] || { label: status || 'Unknown', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', text: 'text-gray-600' });

// A vendor that Purchase should visually flag as waiting on Finance
export const isAwaitingFinance = (vendor) =>
  ['submitted', 'under_review'].includes(vendor?.kycStatus);

/**
 * Which DEPARTMENT a KYC record belongs to — driven by the workflow the vendor
 * was put through (`kycType`), not by whoever happened to click Generate.
 * Finance and administrators generate both, so the generating user's own
 * department does not identify the record. Anything without a kycType predates
 * the Operations split and is Purchase.
 */
export const kycDepartmentLabel = (kycType) =>
  ({ purchase: 'Purchase Department', operations: 'Operations Department' }[kycType]
    || 'Purchase Department');

// Short form for narrow table columns
export const kycDepartmentShort = (kycType) =>
  ({ purchase: 'Purchase', operations: 'Operations' }[kycType] || 'Purchase');

/**
 * Who generated the link. Kept separate from the department above because it
 * answers a different question — it is audit information, not ownership.
 */
export const kycSourceLabel = (source) =>
  ({ purchase: 'Purchase Dept.', finance: 'Finance', operations: 'Operations Dept.' }[source] || '—');

// ---- KYC documents --------------------------------------------------------
// Document types, file limits and validation live in config/kyc.js — the single
// source of truth mirroring the backend's kycConstants.js. Nothing is duplicated
// here on purpose: two copies of the size limit is how they drift apart.

// ---- Purchase Orders ------------------------------------------------------

export const PO_STATUSES = ['draft', 'generated', 'sent', 'acknowledged', 'completed', 'cancelled'];

export const poStatusMeta = (status) =>
  ({
    draft: { label: 'Draft', badge: 'bg-gray-100 text-gray-600' },
    generated: { label: 'Generated', badge: 'bg-blue-100 text-blue-700' },
    sent: { label: 'Sent to Vendor', badge: 'bg-indigo-100 text-indigo-700' },
    acknowledged: { label: 'Acknowledged', badge: 'bg-teal-100 text-teal-700' },
    completed: { label: 'Completed', badge: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-700' },
  }[status] || { label: status || 'Unknown', badge: 'bg-gray-100 text-gray-600' });

// ---- Shared formatting ----------------------------------------------------

export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '—'
    : `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '—'
    : x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
