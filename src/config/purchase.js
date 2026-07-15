// Purchase module frontend constants (mirrors backend master data as a fallback;
// the /purchase/items endpoint also returns the authoritative lists).

export const UNITS = ['Piece', 'Box', 'Kg', 'Gram', 'Litre', 'Metre', 'Roll', 'Packet', 'Set', 'Dozen', 'Bundle', 'Pair'];

// Predefined branches / warehouses. Used everywhere a Branch or Location is
// selected (storage location AND dispatch destination). Users may add new ones,
// which are saved to the master and appear in future suggestions — no code change.
export const STORAGE_LOCATIONS = [
  'Delhi',
  'Chennai',
  'Mumbai',
  'Jaipur',
  'Ahmedabad',
  'Pune',
  'Hyderabad',
  'Kolkata',
  'Gurugram',
];

// Units that read the same in singular and plural (mass / measure)
const NO_PLURAL = ['kg', 'gram', 'litre', 'liter'];

const pluralize = (unit, qty) => {
  if (!unit) return '';
  if (Number(qty) === 1 || NO_PLURAL.includes(unit.toLowerCase())) return unit;
  if (/(?:s|x|ch|sh)$/i.test(unit)) return `${unit}es`; // Box -> Boxes
  return `${unit}s`;                                    // Piece -> Pieces, Roll -> Rolls
};

// "1,500 Kg", "200 Pieces", "50 Boxes" — quantity merged with its unit
export const formatQuantity = (qty, unit) => {
  const n = Number(qty || 0);
  const value = n.toLocaleString('en-IN');
  return unit ? `${value} ${pluralize(unit, n)}` : value;
};

// Username of the user who created a record (falls back to name for older rows)
export const createdByLabel = (entry) =>
  entry?.createdByUsername || entry?.createdBy?.username || entry?.createdByName || '—';

// Creator's full name and branch/location (populated createdBy is the fallback)
export const creatorName = (entry) =>
  entry?.createdByName || entry?.createdBy?.name || '—';

export const creatorBranch = (entry) =>
  entry?.createdByBranch || entry?.createdBy?.branch || '';

// Stock status helper for colour-coding
export const stockStatus = (available) => {
  if (available <= 0) return { label: 'Out of Stock', text: 'text-red-600', badge: 'bg-red-100 text-red-700' };
  if (available <= 5) return { label: 'Low Stock', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
  return { label: 'In Stock', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
};

// Roles that belong to the Purchase department
export const PURCHASE_ROLES = ['purchase_manager', 'branch_manager', 'warehouse_manager'];

export const isPurchaseManager = (user) => user?.role === 'purchase_manager';
export const isPurchaseStaff = (user) => PURCHASE_ROLES.includes(user?.role);
export const isCrmAdmin = (user) => user?.role === 'admin';
// Purchase staff can create entries; only the CRM Admin can delete.
export const canManagePurchase = (user) => isPurchaseStaff(user) || isCrmAdmin(user);

// Write access to a specific record (mirrors the backend rule):
//  - CRM Admin can modify anything
//  - other Purchase staff may only modify records they personally created.
// Everyone in the department can still VIEW all records across all locations.
export const canModifyEntry = (user, entry) => {
  if (isCrmAdmin(user)) return true;
  if (!isPurchaseStaff(user)) return false;
  const owner = entry?.createdBy?._id || entry?.createdBy;
  const me = user?._id || user?.id;
  return !!owner && !!me && String(owner) === String(me);
};

export const roleTitle = (role) =>
  ({
    admin: 'CRM Admin',
    purchase_manager: 'Purchase Manager',
    branch_manager: 'Branch Manager',
    warehouse_manager: 'Warehouse Manager',
  }[role] || role);
