// Purchase module frontend constants (mirrors backend master data as a fallback;
// the /purchase/items endpoint also returns the authoritative lists).

export const UNITS = ['Piece', 'Box', 'Kg', 'Gram', 'Litre', 'Metre', 'Roll', 'Packet', 'Set', 'Dozen', 'Bundle', 'Pair'];

export const CATEGORIES = [
  'Packing Material',
  'Stationery',
  'Hardware',
  'Electrical',
  'Furniture',
  'Cleaning Supplies',
  'Safety Equipment',
  'Tools',
  'Office Supplies',
  'Other',
];

// Stock status helper for colour-coding
export const stockStatus = (available) => {
  if (available <= 0) return { label: 'Out of Stock', text: 'text-red-600', badge: 'bg-red-100 text-red-700' };
  if (available <= 5) return { label: 'Low Stock', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
  return { label: 'In Stock', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
};

export const isPurchaseManager = (user) => user?.role === 'purchase_manager';
export const isCrmAdmin = (user) => user?.role === 'admin';
export const canManagePurchase = (user) => isPurchaseManager(user) || isCrmAdmin(user);

export const roleTitle = (role) =>
  ({ admin: 'CRM Admin', purchase_manager: 'Purchase Manager' }[role] || role);
