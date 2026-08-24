// Rate Comparison configuration — mirrors the backend rules in
// services/rateComparisonService.js and utils/department.js.
// The backend remains the enforcement point; these let the UI hide what the
// API would refuse.

import { isCrmAdmin, isPurchaseUser } from './finance';

export const MIN_QUOTATIONS_TO_SUBMIT = 2;

// Purchase staff prepare comparisons; administrators may too.
export const canManageRateComparisons = (user) => isCrmAdmin(user) || isPurchaseUser(user);

// Only the Director (or an Admin, who shares the same authority) may decide.
export const canApproveRateComparisons = (user) => isCrmAdmin(user);

export const RC_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'sent_back', 'cancelled'];

export const rcStatusMeta = (status) =>
  ({
    draft: {
      label: 'Draft', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400',
      hint: 'Not yet sent to the Director',
    },
    pending_approval: {
      label: 'Pending Approval', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',
      hint: 'Waiting on the Director',
    },
    approved: {
      label: 'Approved', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500',
      hint: 'You can raise the purchase order',
    },
    rejected: {
      label: 'Rejected', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500',
      hint: 'The Director declined this comparison',
    },
    sent_back: {
      label: 'Sent Back', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500',
      hint: 'Changes requested — revise and resubmit',
    },
    cancelled: {
      label: 'Cancelled', badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300',
      hint: '',
    },
  }[status] || { label: status || 'Unknown', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', hint: '' });

// A comparison the Director still has to act on
export const isAwaitingDirector = (rc) => rc?.status === 'pending_approval';

// Editable only while it is a draft or has been sent back
export const canEditComparison = (rc) => ['draft', 'sent_back'].includes(rc?.status);

// Ready to become a PO
export const canRaisePo = (rc) => rc?.status === 'approved' && !rc?.purchaseOrder;

export const directorDecisionLabel = (decision) =>
  ({ approved: 'Approved', rejected: 'Rejected', sent_back: 'Sent Back' }[decision] || '—');

// Suggested remarks the Director can apply with one tap
export const DIRECTOR_QUICK_REMARKS = [
  'Approved — proceed with the selected vendor.',
  'Negotiate further and get better rates.',
  'Select another vendor from the comparison.',
  'Request a revised quotation from the vendor.',
  'Add at least one more vendor quotation.',
  'Delivery timeline is too long — check alternatives.',
];

export const emptyQuotation = () => ({
  vendor: '', vendorName: '', quotedRate: '', taxPercent: 18,
  deliveryTime: '', paymentTerms: '', isSelected: false,
});

/**
 * Client-side preview of a quotation's totals. The backend recomputes these on
 * save, so its figures are always the authoritative ones.
 */
export const quotationTotals = (q, requiredQuantity) => {
  const qty = Number(requiredQuantity) || 0;
  const base = (Number(q.quotedRate) || 0) * qty;
  const tax = base * (Number(q.taxPercent) || 0) / 100;
  // Delivery is recorded as a time, not a charge. Legacy rows may still carry
  // deliveryCharges, so it stays in the sum for their totals to remain correct.
  const total = base + tax + (Number(q.deliveryCharges) || 0);
  return { base, tax, total };
};
