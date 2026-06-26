// HR Management module configuration.

// Fixed recruiter team (dropdown). Recruiter accounts should be created with
// these exact names so assignments link to their logins.
export const RECRUITERS = ['Ridhi', 'Priya', 'Rishita'];

// Sales person suggestions (manual entry also allowed).
export const SALES_PERSONS = ['Varun', 'Nimit', 'Anchal'];

// Role helpers
export const isHrAdmin = (user) => user?.role === 'admin';
export const isTeamLeader = (user) => user?.role === 'team_leader';
export const isRecruiter = (user) => user?.role === 'recruiter';
export const canManageHr = (user) => isHrAdmin(user) || isTeamLeader(user);

// Feedback options the recruiter selects
export const FEEDBACK_OPTIONS = ['Hold', 'Rejected', 'Short Listed', 'Feedback Pending'];

// Tailwind badge classes per feedback status
export const feedbackBadge = (value) =>
  ({
    'Short Listed': 'bg-green-100 text-green-700',
    Hold: 'bg-amber-100 text-amber-700',
    Rejected: 'bg-red-100 text-red-700',
    'Feedback Pending': 'bg-gray-100 text-gray-600',
  }[value] || 'bg-gray-100 text-gray-600');

// Text colour per feedback status (no background/badge)
export const feedbackTextColor = (value) =>
  ({
    'Short Listed': 'text-green-600',
    Hold: 'text-amber-600',
    Rejected: 'text-red-600',
    'Feedback Pending': 'text-gray-500',
  }[value] || 'text-gray-500');

export const roleLabel = (role) =>
  ({ admin: 'HR Admin', team_leader: 'HR Team Leader', recruiter: 'Recruiter' }[role] || role);
