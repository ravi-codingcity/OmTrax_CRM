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

export const KYC_STATUSES = [
  'not_sent', 'sent', 'submitted', 'under_review', 'approved', 'rejected',
  // Correction / resubmission — Finance sent it back to the owning department
  'correction_required', 'correction_sent',
];

// Sent back by Finance and not yet resubmitted by the vendor
export const isAwaitingCorrection = (vendor) =>
  ['correction_required', 'correction_sent'].includes(vendor?.kycStatus);

// The correction round in progress, or null (mirrors Vendor.openCorrection)
export const openCorrection = (vendor) => {
  const rounds = vendor?.kycCorrections || [];
  const last = rounds[rounds.length - 1];
  return last && ['requested', 'link_generated'].includes(last.status) ? last : null;
};

// The most recent correction round of any status, or null
export const latestCorrection = (vendor) => {
  const rounds = vendor?.kycCorrections || [];
  return rounds.length ? rounds[rounds.length - 1] : null;
};

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
    correction_required: {
      label: 'Correction Required', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500',
      text: 'text-orange-700',
    },
    correction_sent: {
      label: 'Correction Link Sent', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500',
      text: 'text-violet-700',
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

// POs are not sent through the CRM: Purchase downloads the PDF, prints it on
// letterhead and dispatches it by hand. There is therefore no "sent" status.
export const PO_STATUSES = ['draft', 'generated', 'completed', 'cancelled'];

// Orders saved under the retired send workflow still read as generated
const LEGACY_SENT_STATUSES = ['sent', 'acknowledged'];
export const normalisePoStatus = (status) => (LEGACY_SENT_STATUSES.includes(status) ? 'generated' : status);

export const poStatusMeta = (status) =>
  ({
    draft: { label: 'Draft', badge: 'bg-gray-100 text-gray-600' },
    generated: { label: 'Generated', badge: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', badge: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-700' },
  }[normalisePoStatus(status)] || { label: status || 'Unknown', badge: 'bg-gray-100 text-gray-600' });

// The GST rates a purchase order may be raised at. Mirrors PO_GST_RATES in the
// backend's PurchaseOrder model, which enforces it.
export const PO_GST_RATES = [5, 18];

// Filled in on every new purchase order. Suggestions only: the Purchase
// Manager may edit, reorder or remove any of them, and the PO carries only the
// terms that are kept.
export const DEFAULT_PO_TERMS = [
  'Warehousing charges are included in the quoted cost.',
  'Second-handling charges are included in the quoted cost.',
  'Shuttle and long-carry charges are included in the quoted cost.',
  'HMS services, if required, will be charged extra.',
  'Delivery charges will be charged extra.',
];

// "10%", "2.5%"
export const fmtPercent = (n) =>
  `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

/**
 * A purchase order's totals, worked out exactly as the backend does on save
 * (PurchaseOrder pre-save hook), so the preview matches what is stored:
 *
 *   discount amount = subtotal x discount %      (or a fixed amount, on orders
 *                                                 saved before percentages)
 *   taxable amount  = subtotal - discount amount
 *   GST amount      = taxable amount x GST %
 *   grand total     = taxable amount + GST amount
 */
export const poTotals = ({ lines = [], taxPercent, discountPercent, fixedDiscount = null }) => {
  const money = (n) => +(Number(n) || 0).toFixed(2);
  const subTotal = money(lines.reduce(
    (s, l) => s + money((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0
  ));
  const discountAmount = fixedDiscount != null
    ? Number(fixedDiscount) || 0
    : money(subTotal * (Number(discountPercent) || 0) / 100);
  const taxable = Math.max(0, subTotal - discountAmount);
  const taxAmount = money(taxable * (Number(taxPercent) || 0) / 100);
  return { subTotal, discountAmount, taxable: money(taxable), taxAmount, total: money(taxable + taxAmount) };
};

// A PO can be corrected while it is a draft or generated. Completed and
// cancelled orders are closed records. Mirrors the backend rule.
export const canEditPurchaseOrder = (user, po) =>
  canManagePurchaseOrders(user) && ['draft', 'generated'].includes(normalisePoStatus(po?.status));

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

// "14-09-2026 08:44 PM" — the edit stamp shown on purchase orders. Rendered in
// the viewer's local time; the stored value is an unchanged UTC timestamp.
export const fmtEditStamp = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  const h = x.getHours();
  const hh = String(h % 12 || 12).padStart(2, '0');
  const mm = String(x.getMinutes()).padStart(2, '0');
  return `${fmtDate(x)} ${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '—'
    : x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
