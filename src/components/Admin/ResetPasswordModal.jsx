import { useState } from 'react';

// Admin sets a new password for a user (no old password needed).
// `onSubmit(newPassword)` returns { success, message }.
const ResetPasswordModal = ({ user, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 5) return setError('Password must be at least 5 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setSubmitting(true);
    setError('');
    const res = await onSubmit(password);
    setSubmitting(false);
    if (res?.success) onClose();
    else setError(res?.message || 'Failed to reset password');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Reset Password</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            Set a new password for <span className="font-medium text-gray-800">{user?.name}</span> (@{user?.username}).
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Min 5 characters" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Re-enter password" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
