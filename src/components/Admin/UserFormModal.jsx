import { useState } from 'react';
import { DEPARTMENTS, ROLES_BY_DEPARTMENT, DEFAULT_DEPARTMENT } from '../../config/departments';

const BRANCHES = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Gurugram', 'Ahmedabad'];

// Role choices for a department. Admin is cross-department, so always offer it.
const roleOptionsFor = (deptKey) => {
  const base = ROLES_BY_DEPARTMENT[deptKey] || [];
  return base.some((r) => r.value === 'admin') ? base : [...base, { value: 'admin', label: 'Admin' }];
};

const emptyForm = {
  name: '', username: '', email: '', password: '', confirmPassword: '',
  department: DEFAULT_DEPARTMENT, role: 'salesperson', branch: '', phoneNumber: '', isActive: true,
};

// Create / edit a user. `onSubmit(payload)` returns { success, message }.
const UserFormModal = ({ mode = 'create', user = null, onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() => {
    if (!isEdit) return emptyForm;
    const dept = user.department || DEFAULT_DEPARTMENT;
    return {
      ...emptyForm,
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      department: dept,
      role: user.role || roleOptionsFor(dept)[0].value,
      branch: user.branch || '',
      phoneNumber: user.phoneNumber || '',
      isActive: user.isActive !== false,
    };
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = roleOptionsFor(form.department);

  const setField = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'department' && !roleOptionsFor(value).some((r) => r.value === prev.role)) {
        next.role = roleOptionsFor(value)[0].value;
      }
      return next;
    });
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!isEdit) {
      if (!form.username.trim()) e.username = 'Username is required';
      else if (form.username.trim().length < 3) e.username = 'At least 3 characters';
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 5) e.password = 'At least 5 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.role) e.role = 'Select a role';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department,
      role: form.role,
      branch: form.branch.trim(),
      phoneNumber: form.phoneNumber.trim(),
      isActive: form.isActive,
    };
    if (!isEdit) {
      payload.username = form.username.trim();
      payload.password = form.password;
    }

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setApiError(res?.message || 'Something went wrong.');
  };

  const inputCls = (f) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      errors[f] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-800">{isEdit ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{apiError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls('name')} placeholder="John Doe" />
              {errors.name && <p className="text-red-500 text-[11px] mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username <span className="text-red-500">*</span></label>
              <input
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                className={`${inputCls('username')} ${isEdit ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                placeholder="johndoe"
                disabled={isEdit}
                title={isEdit ? 'Username cannot be changed' : ''}
              />
              {errors.username && <p className="text-red-500 text-[11px] mt-0.5">{errors.username}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputCls('email')} placeholder="john@example.com" />
              {errors.email && <p className="text-red-500 text-[11px] mt-0.5">{errors.email}</p>}
            </div>

            {!isEdit && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} className={inputCls('password')} placeholder="Min 5 characters" />
                  {errors.password && <p className="text-red-500 text-[11px] mt-0.5">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <input type="password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} className={inputCls('confirmPassword')} placeholder="Re-enter password" />
                  {errors.confirmPassword && <p className="text-red-500 text-[11px] mt-0.5">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select value={form.department} onChange={(e) => setField('department', e.target.value)} className={inputCls('department')}>
                {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setField('role', e.target.value)} className={inputCls('role')}>
                {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {errors.role && <p className="text-red-500 text-[11px] mt-0.5">{errors.role}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <input list="branch-list" value={form.branch} onChange={(e) => setField('branch', e.target.value)} className={inputCls('branch')} placeholder="Branch / location" />
              <datalist id="branch-list">{BRANCHES.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} className={inputCls('phoneNumber')} placeholder="10-digit number" />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Active (can log in)</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
              {submitting ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
