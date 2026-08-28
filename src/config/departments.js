// Central department configuration. Adding a future department only requires a
// new entry here (plus the matching backend enum) — screens read from this config.

export const DEPARTMENTS = [
  {
    key: 'relocation',
    label: 'Relocation',
    description: 'Relocation & moving services sales CRM',
    color: 'blue',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    key: 'hr',
    label: 'HR Management',
    description: 'Recruitment & HR management CRM',
    color: 'purple',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    key: 'purchase',
    label: 'Purchase',
    description: 'Procurement, dispatch, returns & inventory',
    color: 'emerald',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    key: 'director',
    label: 'Director',
    description: 'Approve rate comparisons & review purchase orders',
    color: 'slate',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    // Only administrators may enter this section
    restrictedToRoles: ['admin', 'director'],
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Vendor KYC verification & approvals',
    color: 'amber',
    icon: 'M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Operations tasks & vendor KYC',
    color: 'cyan',
    icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  },
];

export const DEFAULT_DEPARTMENT = 'relocation';

// Roles selectable per department on signup (admin is shared)
export const ROLES_BY_DEPARTMENT = {
  relocation: [
    { value: 'salesperson', label: 'Salesperson' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ],
  hr: [
    { value: 'recruiter', label: 'Recruiter' },
    { value: 'team_leader', label: 'HR Team Leader' },
  ],
  purchase: [
    { value: 'purchase_manager', label: 'Purchase Manager' },
    { value: 'branch_manager', label: 'Branch Manager' },
    { value: 'warehouse_manager', label: 'Warehouse Manager' },
  ],
  finance: [
    { value: 'finance_manager', label: 'Finance Manager' },
    { value: 'accounts_executive', label: 'Accounts Executive' },
  ],
  // No dedicated roles — only the cross-department Admin and Director may enter
  director: [],
  operations: [
    { value: 'operations_manager', label: 'Operations Manager' },
    { value: 'operations_executive', label: 'Operations Executive' },
  ],
};

// Roles that can view all entries within their department (vs. only their own)
// Cross-department roles — offered whichever department is selected.
// Director carries the same authority as Admin.
export const CROSS_DEPARTMENT_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
];

export const ADMIN_LEVEL_ROLES = ['admin', 'director'];
export const isAdminLevel = (user) => ADMIN_LEVEL_ROLES.includes(user?.role);

export const FULL_ACCESS_ROLES = [
  'admin', 'director', 'manager', 'hr_manager', 'hr_head',
  'purchase_manager', 'branch_manager', 'warehouse_manager',
  'finance_manager', 'accounts_executive',
  'operations_manager', 'operations_executive',
];

// --- Vendor KYC workflows ---------------------------------------------------
// Mirrors canGenerateKycLink / canAccessKycType in the backend's department.js.
// The backend is the enforcement point; these only shape the UI.

export const KYC_TYPES = [
  { value: 'purchase', label: 'Purchase Department KYC', short: 'Purchase' },
  { value: 'operations', label: 'Operations Department KYC', short: 'Operations' },
];

const OPERATIONS_ROLES = ['operations_manager', 'operations_executive'];
const FINANCE_ROLES = ['finance_manager', 'accounts_executive'];
const PURCHASE_ROLES = ['purchase_manager', 'branch_manager', 'warehouse_manager'];

export const isOperationsUser = (user) => OPERATIONS_ROLES.includes(user?.role);
export const isFinanceUser = (user) => FINANCE_ROLES.includes(user?.role);
export const isPurchaseUser = (user) => PURCHASE_ROLES.includes(user?.role);

// Finance and administrators reach both workflows; everyone else only their own
export const canGenerateKycLink = (user, kycType = 'purchase') => {
  if (isAdminLevel(user) || isFinanceUser(user)) return true;
  if (kycType === 'operations') return isOperationsUser(user);
  return user?.role === 'purchase_manager';
};

export const canAccessKycType = (user, kycType) => {
  if (isAdminLevel(user) || isFinanceUser(user)) return true;
  if (kycType === 'operations') return isOperationsUser(user);
  if (kycType === 'purchase') return isPurchaseUser(user);
  return false;
};

// The KYC types this user may generate — drives the picker on the Vendors page
export const kycTypesForUser = (user) =>
  KYC_TYPES.filter((t) => canGenerateKycLink(user, t.value));

export const kycTypeLabel = (value) =>
  KYC_TYPES.find((t) => t.value === value)?.short || 'Purchase';

export const getDepartment = (key) =>
  DEPARTMENTS.find((d) => d.key === key) || DEPARTMENTS[0];

// Departments this user may open. A department with `restrictedToRoles` is
// hidden from everyone else — the Director section is not offered to Sales, HR,
// Purchase or Finance users.
export const departmentsForUser = (user) =>
  DEPARTMENTS.filter((d) => !d.restrictedToRoles || d.restrictedToRoles.includes(user?.role));

export const canOpenDepartment = (user, key) =>
  departmentsForUser(user).some((d) => d.key === key);

export const getDepartmentLabel = (key) => getDepartment(key).label;

export const canViewAllInDepartment = (role) => FULL_ACCESS_ROLES.includes(role);

// Human-readable role label across all departments
export const getRoleLabel = (role) => {
  const cross = CROSS_DEPARTMENT_ROLES.find((r) => r.value === role);
  if (cross) return cross.label;
  for (const list of Object.values(ROLES_BY_DEPARTMENT)) {
    const match = list.find((r) => r.value === role);
    if (match) return match.label;
  }
  return role;
};
