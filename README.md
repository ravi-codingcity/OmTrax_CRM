# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## 👥 User Management (Admin Dashboard)

A dedicated **Users** section in the Admin navbar (`/admin/users`) for managing
every CRM account. **Admin only** — the route is guarded by `ProtectedRoute`
(frontend) and every `/api/auth/users*` endpoint is guarded by
`protect + authorize('admin')` (backend), so salespersons, team leaders,
recruiters, managers, and all other roles cannot access it via the UI **or** by
calling the API directly.

### What an Admin can do
| Action | How |
|--------|-----|
| **View users** | Table of Name, Username, Email, Role, Department, Branch, Status (Active/Inactive) and Date Created |
| **Search & filter** | Search by name/username/email; filter by department, role, and status |
| **Pagination** | 20 users per page with First / Prev / Next / Last controls |
| **Create user** | "Add User" → fill name, username, email, password, department, role, branch, phone |
| **Edit user** | ✏️ icon → update name, email, role, department, branch, phone, status |
| **Reset password** | 🔑 icon → set a new password (no old password required) |
| **Activate / deactivate** | Click the Active/Inactive status pill to toggle login access |
| **Delete user** | 🗑️ icon → confirm to permanently remove the account |

### Safety guarantees (enforced on the backend)
- An admin **cannot delete their own account**.
- The **last active admin** cannot be demoted, deactivated, or deleted (no lockout).
- A role must be valid for its department (admin is cross-department).
- The `business_sub` sandbox account is not creatable here (it is script-managed).

The existing authentication and role-based access control are unchanged — user
creation, password resets, and deletion are simply centralised in the Admin
Dashboard.
