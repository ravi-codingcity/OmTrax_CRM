import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRecruitment } from '../../context/RecruitmentContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import RecruitmentTable from '../../components/HR/RecruitmentTable';
import RecruitmentModal from '../../components/HR/RecruitmentModal';
import { RECRUITERS, canManageHr, isRecruiter } from '../../config/hr';

const HrRequirements = () => {
  const { user } = useAuth();
  const { entries, recruiters, loading, fetchEntries, fetchRecruiters, addEntry, updateEntry, reassignEntry, deleteEntry } = useRecruitment();

  const manage = canManageHr(user);
  const recruiterView = isRecruiter(user);

  const [search, setSearch] = useState('');
  const [recruiterFilter, setRecruiterFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [modal, setModal] = useState({ open: false, mode: 'add', entry: null });
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchRecruiters()]);
  }, [fetchEntries, fetchRecruiters]);

  useEffect(() => { loadData(); }, [loadData]);

  const recruiterNames = recruiters.length ? recruiters.map((r) => r.name) : RECRUITERS;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch = !term ||
        e.clientName?.toLowerCase().includes(term) ||
        e.position?.toLowerCase().includes(term) ||
        e.salesPersonName?.toLowerCase().includes(term) ||
        e.recruiterName?.toLowerCase().includes(term);
      const matchesRecruiter = !recruiterFilter || e.recruiterName === recruiterFilter;
      return matchesSearch && matchesRecruiter;
    });
  }, [entries, search, recruiterFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  useEffect(() => { setPage(1); }, [search, recruiterFilter]);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

  const handleSubmit = async (payload) => {
    const res = modal.mode === 'add' ? await addEntry(payload) : await updateEntry(modal.entry._id, payload);
    if (res.success) flash(modal.mode === 'add' ? 'Requirement assigned successfully!' : 'Requirement updated successfully!');
    return res;
  };

  const confirmReassign = async () => {
    if (!reassignTo) return;
    setBusy(true);
    const res = await reassignEntry(reassignTarget._id, reassignTo);
    setBusy(false);
    if (res.success) { flash(`Reassigned to ${reassignTo}.`); setReassignTarget(null); setReassignTo(''); }
    else flash(res.message || 'Failed to reassign.');
  };

  const confirmDelete = async () => {
    setBusy(true);
    const res = await deleteEntry(deleteTarget._id);
    setBusy(false);
    flash(res.success ? 'Requirement deleted.' : (res.message || 'Failed to delete.'));
    setDeleteTarget(null);
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{recruiterView ? 'My Tasks' : 'Requirements'}</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {recruiterView ? 'Update progress on requirements assigned to you' : 'Assign and track recruitment requirements'}
              </p>
            </div>
            {manage && (
              <button
                onClick={() => setModal({ open: true, mode: 'add', entry: null })}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center w-full sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign Requirement
              </button>
            )}
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search client, position, recruiter..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {!recruiterView && (
                <select
                  value={recruiterFilter}
                  onChange={(e) => setRecruiterFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="">All recruiters</option>
                  {recruiterNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
              <span className="text-xs text-gray-500 ml-auto">{filtered.length} requirement{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* Table */}
          <RecruitmentTable
            entries={pageItems}
            currentUser={user}
            onEdit={(e) => setModal({ open: true, mode: 'edit', entry: e })}
            onReassign={(e) => { setReassignTarget(e); setReassignTo(''); }}
            onDelete={(e) => setDeleteTarget(e)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 bg-white rounded-xl shadow-sm px-3 py-2.5 border border-gray-100">
              <span className="text-xs text-gray-600">Showing {start + 1}–{Math.min(start + perPage, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">First</button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Prev</button>
                <span className="px-2 text-xs font-medium text-gray-700">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Next</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Last</button>
              </div>
            </div>
          )}

          {/* Add / Edit modal */}
          {modal.open && (
            <RecruitmentModal
              mode={modal.mode}
              entry={modal.entry}
              currentUser={user}
              recruiterOptions={recruiters}
              onClose={() => setModal({ open: false, mode: 'add', entry: null })}
              onSubmit={handleSubmit}
            />
          )}

          {/* Reassign modal */}
          {reassignTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setReassignTarget(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Reassign Requirement</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {reassignTarget.position} @ {reassignTarget.clientName} — currently <span className="font-medium">{reassignTarget.recruiterName || 'Unassigned'}</span>
                </p>
                <label className="block text-xs font-medium text-gray-600 mb-1">New recruiter</label>
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-md mb-4 focus:ring-1 focus:ring-blue-500">
                  <option value="">Select recruiter</option>
                  {recruiterNames.filter((n) => n !== reassignTarget.recruiterName).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setReassignTarget(null)} disabled={busy} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  <button onClick={confirmReassign} disabled={busy || !reassignTo} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {busy ? 'Reassigning...' : 'Reassign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setDeleteTarget(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Delete Requirement</h3>
                <p className="text-sm text-gray-600 mb-4">Delete <span className="font-medium">{deleteTarget.position} @ {deleteTarget.clientName}</span>? This cannot be undone.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteTarget(null)} disabled={busy} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  <button onClick={confirmDelete} disabled={busy} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">{busy ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default HrRequirements;
