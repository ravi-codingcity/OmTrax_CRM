// Rate Comparison configuration — mirrors the backend rules in
// services/rateComparisonService.js and utils/department.js.
// The backend remains the enforcement point; these let the UI hide what the
// API would refuse.

import { isCrmAdmin, isPurchaseUser } from './finance.js';

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

export const DEFAULT_GST_PERCENT = 18;

// ---- Items and per-item quotes -------------------------------------------
//
// A comparison holds items[] and, on each vendor quotation, lines[] quoting
// those items (linked by item _id). The API already presents comparisons stored
// before multi-item support in this shape; `comparisonView` repeats that here so
// a stale or partial object can never break a screen or the PDF.

export const comparisonView = (rc) => {
  if (!rc) return { items: [], quotations: [] };
  if (rc.items?.length) {
    return { ...rc, quotations: (rc.quotations || []).map((q) => ({ ...q, lines: q.lines || [] })) };
  }
  const items = rc.materialName
    ? [{ _id: rc._id, itemName: rc.materialName, requiredQuantity: rc.requiredQuantity, unit: rc.unit }]
    : [];
  const quotations = (rc.quotations || []).map((q) => ({
    ...q,
    lines: items.length && Number(q.quotedRate) > 0
      ? [{
          item: items[0]._id, itemName: items[0].itemName, quotedRate: q.quotedRate, taxPercent: q.taxPercent,
          deliveryTime: q.deliveryTime, paymentTerms: q.paymentTerms,
          baseAmount: q.baseAmount, taxAmount: q.taxAmount, totalAmount: q.totalAmount,
        }]
      : [],
  }));
  return { ...rc, items, quotations };
};

// The line a quotation holds for an item, or null when the vendor did not quote it
export const lineFor = (quotation, itemId) =>
  (quotation?.lines || []).find((l) => String(l.item) === String(itemId) && Number(l.quotedRate) > 0) || null;

// "100 Kg" for a one-item comparison, "3 items" otherwise
export const quantityLabel = (rc) => {
  const { items } = comparisonView(rc);
  if (items.length === 1) return `${items[0].requiredQuantity ?? '—'} ${items[0].unit || ''}`.trim();
  return `${items.length} items`;
};

let keySeq = 0;
// Client-side key for a new item row; lines reference items by key until saved
export const newItemKey = () => `new-${Date.now().toString(36)}-${(keySeq += 1)}`;

export const emptyItem = () => ({ key: newItemKey(), itemName: '', requiredQuantity: '', unit: '' });

export const emptyLine = () => ({ quotedRate: '', taxPercent: DEFAULT_GST_PERCENT, deliveryTime: '', paymentTerms: '' });

export const emptyQuotation = () => ({
  key: newItemKey(), vendor: '', vendorName: '', isSelected: false, lines: {},
});

// A form line counts as entered once any of its fields has a value
export const lineHasData = (line) =>
  !!line && (Number(line.quotedRate) > 0 || String(line.deliveryTime || '').trim() || String(line.paymentTerms || '').trim());

/**
 * Client-side preview of one line's amounts. The backend recomputes these on
 * save, so its figures are always the authoritative ones.
 */
export const lineTotals = (line, requiredQuantity) => {
  const base = (Number(line?.quotedRate) || 0) * (Number(requiredQuantity) || 0);
  const tax = base * (Number(line?.taxPercent) || 0) / 100;
  return { base, tax, total: base + tax };
};

/** Preview of a vendor's totals across every item it has quoted in the form. */
export const quotationTotals = (quotation, items) =>
  items.reduce((acc, it) => {
    const line = quotation.lines?.[it.key];
    if (!line || !(Number(line.quotedRate) > 0)) return acc;
    const t = lineTotals(line, it.requiredQuantity);
    return { base: acc.base + t.base, tax: acc.tax + t.tax, total: acc.total + t.total, quoted: acc.quoted + 1 };
  }, { base: 0, tax: 0, total: 0, quoted: 0 });

/**
 * Pre-fill for the purchase order raised from an approved comparison: every
 * item at the recommended vendor's quoted rate. A PO carries one GST rate, so
 * when the vendor quoted different GST rates per item the most common one is
 * proposed and the difference is flagged for the Purchase Manager to check.
 */
export const poPrefillFromComparison = (rc) => {
  const view = comparisonView(rc);
  const q = view.quotations.find((x) => x.isSelected);
  const lines = view.items
    .map((it) => ({ it, line: lineFor(q, it._id) }))
    .filter((x) => x.line);

  const gstCounts = lines.reduce((m, { line }) => {
    const g = Number(line.taxPercent) || 0;
    m.set(g, (m.get(g) || 0) + 1);
    return m;
  }, new Map());
  const gstRates = [...gstCounts.keys()];
  const taxPercent = gstRates.length
    ? [...gstCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : (q?.taxPercent ?? DEFAULT_GST_PERCENT);
  const paymentTerms = [...new Set(lines.map(({ line }) => String(line.paymentTerms || '').trim()).filter(Boolean))].join('; ');

  return {
    rateComparison: rc._id,
    comparisonNumber: rc.comparisonNumber,
    vendor: rc.selectedVendor?._id || rc.selectedVendor,
    vendorName: rc.selectedVendorName,
    taxPercent,
    paymentTerms: paymentTerms || q?.paymentTerms || '',
    gstByItem: gstRates.length > 1
      ? lines.map(({ it, line }) => ({ itemName: it.itemName, taxPercent: Number(line.taxPercent) || 0 }))
      : null,
    items: lines.map(({ it, line }) => ({
      itemName: it.itemName,
      description: view.items.length === 1 ? (rc.materialDescription || '') : '',
      quantity: it.requiredQuantity,
      unit: it.unit || '',
      rate: line.quotedRate ?? 0,
    })),
  };
};
