import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';

const AssignLeads = () => {
  const { getUsers } = useAuth();
  const { salesEntries, loading, fetchSalesEntries, reassignLeads } = useSales();

  const [users, setUsers] = useState([]);
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load users + sales entries
  const loadData = useCallback(async () => {
    const [userList] = await Promise.all([getUsers(), fetchSalesEntries()]);
    // Only salespersons can own/receive leads
    setUsers((userList || []).filter((u) => u.role === 'salesperson'));
  }, [getUsers, fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Count active leads owned by each salesperson (from loaded entries)
  const leadCountByUser = useMemo(() => {
    const counts = {};
    salesEntries.forEach((entry) => {
      const ownerId = entry.salesPerson?._id || entry.salesPerson;
      if (ownerId) {
        counts[ownerId] = (counts[ownerId] || 0) + 1;
      }
    });
    return counts;
  }, [salesEntries]);

  const fromUser = users.find((u) => u._id === fromUserId);
  const toUser = users.find((u) => u._id === toUserId);
  const fromLeadCount = fromUserId ? leadCountByUser[fromUserId] || 0 : 0;

  const canSubmit =
    fromUserId && toUserId && fromUserId !== toUserId && !isSubmitting;

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fromUserId || !toUserId) {
      setErrorMessage('Please select both the current and the new salesperson.');
      return;
    }
    if (fromUserId === toUserId) {
      setErrorMessage('Current and new salesperson must be different.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    const result = await reassignLeads(fromUserId, toUserId);

    setIsSubmitting(false);
    setShowConfirm(false);

    if (result.success) {
      const count = result.data?.transferredCount ?? 0;
      setSuccessMessage(
        count > 0
          ? `Transferred ${count} lead(s) from ${fromUser?.name} to ${toUser?.name}.`
          : `${fromUser?.name} had no leads to transfer.`
      );
      setFromUserId('');
      setToUserId('');
      // Refresh entries so updated ownership/counts reflect immediately
      await fetchSalesEntries();
      setTimeout(() => setSuccessMessage(''), 5000);
    } else {
      setErrorMessage(result.message || 'Failed to transfer leads. Please try again.');
    }
  };

  const selectClasses =
    'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all';

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Assign Leads</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Transfer all sales entries, follow-ups and reminders from one salesperson to another.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <form onSubmit={handleOpenConfirm} className="space-y-5">
              {/* From Salesperson */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer leads from <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromUserId}
                  onChange={(e) => setFromUserId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select current salesperson</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                      {u.branch ? ` — ${u.branch}` : ''} ({leadCountByUser[u._id] || 0} leads)
                      {u.isActive === false ? ' • inactive' : ''}
                    </option>
                  ))}
                </select>
                {fromUserId && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    <span className="font-semibold text-gray-700">{fromLeadCount}</span> lead(s) will be transferred.
                  </p>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 bg-blue-50 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* To Salesperson */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign leads to <span className="text-red-500">*</span>
                </label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select new salesperson</option>
                  {users
                    .filter((u) => u._id !== fromUserId && u.isActive !== false)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                        {u.branch ? ` — ${u.branch}` : ''} ({leadCountByUser[u._id] || 0} leads)
                      </option>
                    ))}
                </select>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-800 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  All sales entries, follow-up history and pending reminders move to the new
                  salesperson and appear instantly in their dashboard, My Entries, analytics and
                  notifications. The complete lead history is preserved.
                </span>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transfer Leads
                </button>
              </div>
            </form>
          </div>

          {/* Confirmation Modal */}
          {showConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => !isSubmitting && setShowConfirm(false)}
            >
              <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Confirm Lead Transfer</h3>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  You are about to transfer{' '}
                  <span className="font-semibold text-gray-800">{fromLeadCount} lead(s)</span> from{' '}
                  <span className="font-semibold text-gray-800">{fromUser?.name}</span> to{' '}
                  <span className="font-semibold text-gray-800">{toUser?.name}</span>. This will
                  move all related entries, follow-ups and reminders. Continue?
                </p>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmTransfer}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Transferring...
                      </>
                    ) : (
                      'Confirm Transfer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default AssignLeads;
