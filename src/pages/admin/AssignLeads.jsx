import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';

const ownerId = (entry) => entry.salesPerson?._id || entry.salesPerson || '';
const ownerName = (entry) => entry.salesPersonName || entry.salesPerson?.name || 'Unknown';

const statusBadge = (status) => {
  const s = (status || '').toLowerCase();
  const map = {
    hot: 'bg-red-100 text-red-700',
    warm: 'bg-amber-100 text-amber-700',
    cold: 'bg-blue-100 text-blue-700',
    closed: 'bg-green-100 text-green-700',
    active: 'bg-teal-100 text-teal-700',
  };
  return map[s] || 'bg-gray-100 text-gray-600';
};

const AssignLeads = () => {
  const { getUsers } = useAuth();
  const { salesEntries, loading, fetchSalesEntries, reassignLeads } = useSales();

  const [users, setUsers] = useState([]);
  const [sourceFilter, setSourceFilter] = useState(''); // narrow list by current owner
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toUserId, setToUserId] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load assignable users + sales entries
  const loadData = useCallback(async () => {
    const [userList] = await Promise.all([getUsers(), fetchSalesEntries()]);
    // Anyone who isn't an admin can own/receive leads (salesperson, manager, etc.)
    setUsers((userList || []).filter((u) => u.role !== 'admin'));
  }, [getUsers, fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toUser = users.find((u) => u._id === toUserId);

  // Leads owned by each user (for the source dropdown counts)
  const leadCountByUser = useMemo(() => {
    const counts = {};
    salesEntries.forEach((e) => {
      const id = ownerId(e);
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [salesEntries]);

  // Leads visible in the picker (filtered by owner + search)
  const visibleLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return salesEntries.filter((e) => {
      const matchesOwner = !sourceFilter || String(ownerId(e)) === sourceFilter;
      const matchesSearch =
        !term ||
        e.companyName?.toLowerCase().includes(term) ||
        e.contactPerson?.toLowerCase().includes(term) ||
        e.location?.toLowerCase().includes(term);
      return matchesOwner && matchesSearch;
    });
  }, [salesEntries, sourceFilter, searchTerm]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = visibleLeads.filter((e) => selectedSet.has(e._id)).length;
  const allVisibleSelected = visibleLeads.length > 0 && visibleSelectedCount === visibleLeads.length;

  const toggleLead = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleLeads.map((e) => e._id);
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const canSubmit = selectedIds.length > 0 && toUserId && !isSubmitting;

  const handleOpenConfirm = () => {
    setErrorMessage('');
    if (selectedIds.length === 0) {
      setErrorMessage('Select at least one lead to transfer.');
      return;
    }
    if (!toUserId) {
      setErrorMessage('Select the salesperson to assign the leads to.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    const result = await reassignLeads({ leadIds: selectedIds, toSalesPerson: toUserId });

    setIsSubmitting(false);
    setShowConfirm(false);

    if (result.success) {
      const count = result.data?.transferredCount ?? 0;
      setSuccessMessage(
        count > 0
          ? `Transferred ${count} lead(s) to ${toUser?.name}.`
          : 'No leads needed transferring (already owned by the selected salesperson).'
      );
      setSelectedIds([]);
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
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Assign Leads</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Select specific leads and transfer them to another salesperson.
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

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Filter by current owner */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by current owner</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">All salespersons</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}{u.branch ? ` — ${u.branch}` : ''} ({leadCountByUser[u._id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign to */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assign selected leads to <span className="text-red-500">*</span>
                </label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select new salesperson</option>
                  {users
                    .filter((u) => u.isActive !== false)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}{u.branch ? ` — ${u.branch}` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search company, contact, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Leads list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* List header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={visibleLeads.length === 0}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-600">
                    Select all ({visibleLeads.length})
                  </span>
                </label>
                <span className="text-xs text-gray-400 ml-auto">
                  {selectedIds.length} selected
                </span>
              </div>

              {/* List body */}
              <div className="max-h-[22rem] overflow-y-auto divide-y divide-gray-100">
                {visibleLeads.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No leads match the current filters.</p>
                ) : (
                  visibleLeads.map((entry) => {
                    const checked = selectedSet.has(entry._id);
                    return (
                      <label
                        key={entry._id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLead(entry._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{entry.companyName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {entry.contactPerson || '—'}{entry.location ? ` • ${entry.location}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`hidden sm:inline px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge(entry.queryStatus)}`}>
                            {entry.queryStatus || '—'}
                          </span>
                          <span className="text-[11px] text-gray-500 max-w-[110px] truncate text-right">{ownerName(entry)}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.length === 0}
                className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={handleOpenConfirm}
                disabled={!canSubmit}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Transfer {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}Lead{selectedIds.length === 1 ? '' : 's'}
              </button>
            </div>
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
                  Transfer{' '}
                  <span className="font-semibold text-gray-800">{selectedIds.length} selected lead(s)</span> to{' '}
                  <span className="font-semibold text-gray-800">{toUser?.name}</span>? Their follow-ups and
                  reminders move along with each lead, and the full history is preserved.
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
