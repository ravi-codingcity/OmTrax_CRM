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
};

// Roles that can view all entries within their department (vs. only their own)
export const FULL_ACCESS_ROLES = [
  'admin', 'manager', 'hr_manager', 'hr_head',
  'purchase_manager', 'branch_manager', 'warehouse_manager',
];

export const getDepartment = (key) =>
  DEPARTMENTS.find((d) => d.key === key) || DEPARTMENTS[0];

export const getDepartmentLabel = (key) => getDepartment(key).label;

export const canViewAllInDepartment = (role) => FULL_ACCESS_ROLES.includes(role);

// Human-readable role label across all departments
export const getRoleLabel = (role) => {
  for (const list of Object.values(ROLES_BY_DEPARTMENT)) {
    const match = list.find((r) => r.value === role);
    if (match) return match.label;
  }
  return role;
};
