import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecruitment } from '../../context/RecruitmentContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import { feedbackBadge } from '../../config/hr';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? '—'
    : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

// Read-only view for a salesperson: the HR requirements generated from their own
// sales leads. They can watch progress (recruiter, CVs, feedback) but cannot edit
// any recruiter/HR-team data — enforced by the backend, which only returns their
// own originated requirements and rejects update attempts.
const MyHrRequirements = () => {
  const { entries, loading, fetchEntries, createFromSales } = useRecruitment();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const [flashMsg, setFlashMsg] = useState('');

  // Create form (opened by the ₹ button on an "HR & Recruitment" sales entry)
  const [createFor, setCreateFor] = useState(null); // { salesEntryId, clientName }
  const [position, setPosition] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => fetchEntries(), [fetchEntries]);
  useEffect(() => { loadData(); }, [loadData]);

  // Open the pre-filled create form when arriving from a sales entry's ₹ action
  useEffect(() => {
    const cf = location.state?.createFor;
    if (cf) {
      setCreateFor(cf);
      setPosition('');
      setFormError('');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const flash = (msg) => { setFlashMsg(msg); setTimeout(() => setFlashMsg(''), 3500); };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!position.trim()) { setFormError('Position is required'); return; }
    setSubmitting(true);
    setFormError('');
    const res = await createFromSales(createFor.salesEntryId, { position: position.trim() });
    setSubmitting(false);
    if (res.success) {
      setHighlightId(res.data?._id);
      setCreateFor(null);
      flash(res.duplicate ? 'This lead is already in HR Management.' : 'HR Requirement created successfully!');
      fetchEntries();
    } else {
      setFormError(res.message || 'Failed to create requirement');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((e) =>
      e.clientName?.toLowerCase().includes(term) ||
      e.position?.toLowerCase().includes(term) ||
      e.recruiterName?.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const stats = useMemo(() => ({
    total: entries.length,
    assigned: entries.filter((e) => e.recruiterName).length,
    cvs: entries.reduce((sum, e) => sum + (e.cvsSubmitted || 0), 0),
    shortlisted: entries.filter((e) => e.feedback === 'Short Listed').length,
  }), [entries]);

  const headCls = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300';
  const cellCls = 'px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle';

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">HR Requirement Status</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Requirements you sent to HR Management. Progress is managed by the HR team.
              </p>
            </div>
          </div>

          {/* Success message */}
          {flashMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {flashMsg}
            </div>
          )}

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Requirements', value: stats.total, color: 'text-gray-800' },
              { label: 'Assigned', value: stats.assigned, color: 'text-blue-600' },
              { label: 'CVs Submitted', value: stats.cvs, color: 'text-indigo-600' },
              { label: 'Short Listed', value: stats.shortlisted, color: 'text-green-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-2.5">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, position, recruiter..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No HR requirements yet. Use the ₹ button on an “HR &amp; Recruitment” sales entry to send it to HR Management.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={headCls}>Client</th>
                    <th className={headCls}>Position</th>
                    <th className={headCls}>Received</th>
                    <th className={headCls}>Recruiter</th>
                    <th className={`${headCls} text-center`}>CVs</th>
                    <th className={`${headCls} text-center`}>Feedback</th>
                    <th className={headCls}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e._id}
                      className={`hover:bg-gray-50 ${highlightId && e._id === highlightId ? 'bg-emerald-50' : ''}`}
                    >
                      <td className={`${cellCls} font-semibold text-gray-900`}>{e.clientName}</td>
                      <td className={cellCls}>{e.position}</td>
                      <td className={`${cellCls} whitespace-nowrap`}>{fmtDate(e.positionReceivedDate)}</td>
                      <td className={cellCls}>
                        {e.recruiterName || <span className="text-amber-600">Awaiting assignment</span>}
                      </td>
                      <td className={`${cellCls} text-center tabular-nums`}>{e.cvsSubmitted || 0}</td>
                      <td className={`${cellCls} text-center`}>
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${feedbackBadge(e.feedback)}`}>
                          {e.feedback || 'Feedback Pending'}
                        </span>
                      </td>
                      <td className={`${cellCls} max-w-[200px]`}>
                        <span className="line-clamp-2" title={e.remarks}>{e.remarks || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Create HR Requirement — Client pre-filled, Position entered manually */}
      {createFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCreateFor(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">New HR Requirement</h2>
              <button onClick={() => setCreateFor(null)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitCreate} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input
                  value={createFor.clientName}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  value={position}
                  onChange={(e) => { setPosition(e.target.value); if (formError) setFormError(''); }}
                  autoFocus
                  placeholder="e.g. Sales Executive"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Position Received Date is set automatically. A recruiter is assigned later by the HR Team Leader.
              </p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateFor(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
                  {submitting ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : 'Create Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default MyHrRequirements;
