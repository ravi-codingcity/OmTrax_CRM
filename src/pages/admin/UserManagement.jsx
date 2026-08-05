import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import UserFormModal from '../../components/Admin/UserFormModal';
import ResetPasswordModal from '../../components/Admin/ResetPasswordModal';
import { DEPARTMENTS, getDepartmentLabel, getRoleLabel } from '../../config/departments';

const PER_PAGE = 20;

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? '—'
    : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const deptBadge = (dept) =>
  ({ relocation: 'bg-blue-100 text-blue-700', hr: 'bg-purple-100 text-purple-700', purchase: 'bg-emerald-100 text-emerald-700' }[dept] || 'bg-gray-100 text-gray-700');

const roleBadge = (role) =>
  (role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700');

const UserManagement = () => {
  const { user: currentUser, getUsers, createUser, updateUser, resetUserPassword, deleteUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { text, ok }

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState(null); // { mode, user }
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const flash = (text, ok = true) => { setMessage({ text, ok }); setTimeout(() => setMessage(null), 3500); };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const list = await getUsers({ scope: 'all' });
    setUsers(Array.isArray(list) ? list : []);
    setLoading(false);
  }, [getUsers]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Distinct roles present, for the role filter dropdown
  const roleOptions = useMemo(
    () => [...new Set(users.map((u) => u.role).filter(Boolean))].sort(),
    [users]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !term ||
        u.name?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term);
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesDept = !deptFilter || u.department === deptFilter;
      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' ? u.isActive !== false : u.isActive === false);
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);
  useEffect(() => { setPage(1); }, [search, roleFilter, deptFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive !== false).length,
    inactive: users.filter((u) => u.isActive === false).length,
    admins: users.filter((u) => u.role === 'admin').length,
  }), [users]);

  // --- actions ---
  const handleCreate = async (payload) => {
    const res = await createUser(payload);
    if (res.success) { flash('User created successfully.'); loadUsers(); }
    return res;
  };
  const handleEdit = async (payload) => {
    const res = await updateUser(formModal.user._id, payload);
    if (res.success) { flash('User updated successfully.'); loadUsers(); }
    return res;
  };
  const handleReset = async (newPassword) => {
    const res = await resetUserPassword(resetTarget._id, newPassword);
    if (res.success) flash(`Password reset for ${resetTarget.name}.`);
    return res;
  };
  const toggleStatus = async (u) => {
    setBusyId(u._id);
    const res = await updateUser(u._id, { isActive: !(u.isActive !== false) });
    setBusyId(null);
    if (res.success) { flash(`${u.name} is now ${u.isActive !== false ? 'inactive' : 'active'}.`); loadUsers(); }
    else flash(res.message, false);
  };
  const confirmDelete = async () => {
    const res = await deleteUser(deleteTarget._id);
    setDeleteTarget(null);
    if (res.success) { flash('User deleted.'); loadUsers(); }
    else flash(res.message, false);
  };

  const th = 'px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300';
  const td = 'px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle';

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadUsers} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Create, edit, reset passwords and manage all CRM accounts</p>
            </div>
            <button
              onClick={() => setFormModal({ mode: 'create', user: null })}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>

          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm border ${message.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Total Users', value: stats.total, color: 'text-gray-800' },
              { label: 'Active', value: stats.active, color: 'text-green-600' },
              { label: 'Inactive', value: stats.inactive, color: 'text-amber-600' },
              { label: 'Admins', value: stats.admins, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-2.5">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username or email…"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
              <option value="">All roles</option>
              {roleOptions.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading users…</div>
            ) : pageItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No users match your filters.</div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>User</th>
                    <th className={th}>Email</th>
                    <th className={th}>Role</th>
                    <th className={th}>Department</th>
                    <th className={th}>Branch</th>
                    <th className={`${th} text-center`}>Status</th>
                    <th className={th}>Created</th>
                    <th className={`${th} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u) => {
                    const active = u.isActive !== false;
                    const isSelf = String(u._id) === String(currentUser?._id || currentUser?.id);
                    return (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className={td}>
                          <p className="text-xs font-semibold text-gray-900">{u.name}{isSelf && <span className="ml-1 text-[10px] text-blue-600">(you)</span>}</p>
                          <p className="text-[11px] text-gray-500">@{u.username}</p>
                        </td>
                        <td className={`${td} text-gray-600`}>{u.email || '—'}</td>
                        <td className={td}><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${roleBadge(u.role)}`}>{getRoleLabel(u.role)}</span></td>
                        <td className={td}><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${deptBadge(u.department)}`}>{getDepartmentLabel(u.department)}</span></td>
                        <td className={`${td} text-gray-600`}>{u.branch || '—'}</td>
                        <td className={`${td} text-center`}>
                          <button
                            onClick={() => toggleStatus(u)}
                            disabled={busyId === u._id}
                            title="Click to toggle"
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold disabled:opacity-50 ${active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                          >
                            {active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className={`${td} whitespace-nowrap text-gray-500`}>{fmtDate(u.createdAt)}</td>
                        <td className={`${td} text-center`}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setFormModal({ mode: 'edit', user: u })} title="Edit" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => setResetTarget(u)} title="Reset password" className="p-1 text-amber-600 hover:bg-amber-50 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={isSelf}
                              title={isSelf ? "You can't delete your own account" : 'Delete'}
                              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-gray-600">Showing {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">First</button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Prev</button>
                <span className="px-2 text-xs font-medium text-gray-700">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Next</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Last</button>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={formModal.user}
          onClose={() => setFormModal(null)}
          onSubmit={formModal.mode === 'create' ? handleCreate : handleEdit}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} onSubmit={handleReset} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete User</h3>
            <p className="text-sm text-gray-600 text-center mb-6">Permanently delete <span className="font-medium">{deleteTarget.name}</span> (@{deleteTarget.username})? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default UserManagement;
