import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRateComparisons } from '../../context/RateComparisonContext';
import { useVendors } from '../../context/VendorContext';
import { usePurchase } from '../../context/PurchaseContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import RateComparisonModal from '../../components/Purchase/RateComparisonModal';
import RateComparisonDetail from '../../components/Purchase/RateComparisonDetail';
import { exportRateComparisonPdf } from '../../utils/pdfExport';
import { inr, fmtDate, isCrmAdmin } from '../../config/finance';
import {
  RC_STATUSES, rcStatusMeta, canApproveRateComparisons, canEditComparison,
  canRaisePo, isAwaitingDirector,
} from '../../config/rateComparison';

const RateComparisons = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    comparisons, loading, fetchComparisons, fetchStats, getComparison,
    addComparison, updateComparison, submitForApproval, decide, deleteComparison,
  } = useRateComparisons();
  const { vendors, fetchVendors } = useVendors();
  const { items, fetchItems } = usePurchase();

  const mayDecide = canApproveRateComparisons(user);

  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [modal, setModal] = useState({ open: false, mode: 'add', comparison: null });
  const [detail, setDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [, , , s] = await Promise.all([fetchComparisons(), fetchVendors(), fetchItems(), fetchStats()]);
    setStats(s);
  }, [fetchComparisons, fetchVendors, fetchItems, fetchStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (m) => { setMessage(m); setTimeout(() => setMessage(''), 4000); };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return comparisons.filter((rc) => {
      if (statusFilter && rc.status !== statusFilter) return false;
      if (!term) return true;
      return [rc.comparisonNumber, rc.materialName, rc.selectedVendorName, rc.createdByName]
        .some((f) => (f || '').toLowerCase().includes(term))
        || (rc.quotations || []).some((q) => (q.vendorName || '').toLowerCase().includes(term));
    });
  }, [comparisons, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const counts = useMemo(() => {
    const c = { total: comparisons.length };
    RC_STATUSES.forEach((s) => { c[s] = comparisons.filter((rc) => rc.status === s).length; });
    return c;
  }, [comparisons]);

  const openDetail = async (rc) => {
    const full = await getComparison(rc._id);
    setDetail(full || rc);
  };

  const handleSubmitForm = async (payload) => {
    const res = modal.mode === 'add'
      ? await addComparison(payload)
      : await updateComparison(modal.comparison._id, payload);
    if (res.success) {
      flash(modal.mode === 'add'
        ? `Rate comparison ${res.data.comparisonNumber} created as a draft.`
        : 'Rate comparison updated.');
      loadData();
    }
    return res;
  };

  const handleSubmitToDirector = async (id) => {
    const res = await submitForApproval(id);
    if (res.success) { flash(res.message || 'Sent to the Director for approval.'); loadData(); }
    return res;
  };

  const handleDecide = async (id, kind, remarks) => {
    const res = await decide(id, kind, remarks);
    if (res.success) { flash(res.message || 'Decision recorded. The Purchase Team has been notified.'); loadData(); }
    return res;
  };

  // Approved comparison -> PO form, pre-filled from the approved quotation
  const handleCreatePo = (rc) => {
    const q = (rc.quotations || []).find((x) => x.isSelected);
    navigate('/purchase/orders', {
      state: {
        prefillFromComparison: {
          rateComparison: rc._id,
          comparisonNumber: rc.comparisonNumber,
          vendor: rc.selectedVendor?._id || rc.selectedVendor,
          vendorName: rc.selectedVendorName,
          taxPercent: q?.taxPercent ?? 18,
          paymentTerms: q?.paymentTerms || '',
          items: [{
            itemName: rc.materialName,
            description: rc.materialDescription || '',
            quantity: rc.requiredQuantity,
            unit: rc.unit || '',
            rate: q?.quotedRate ?? 0,
          }],
        },
      },
    });
  };

  // List rows carry summary data only; refetch so the PDF has every quotation
  // field and the full history.
  const downloadPdf = async (rc) => {
    try {
      const full = (await getComparison(rc._id)) || rc;
      await exportRateComparisonPdf(full);
    } catch (err) {
      console.error('Rate comparison PDF failed:', err);
      flash('Could not generate the PDF. Please try again.');
    }
  };

  const confirmDelete = async () => {
    const res = await deleteComparison(deleteTarget._id);
    setDeleteTarget(null);
    flash(res.success ? 'Rate comparison deleted.' : res.message);
  };

  const s = stats || {};
  const kpis = [
    { label: 'Total', value: s.total ?? counts.total, tone: 'text-gray-800' },
    { label: 'Draft', value: s.draft ?? counts.draft, tone: 'text-gray-500' },
    { label: mayDecide ? 'Awaiting You' : 'Pending Approval', value: s.pending_approval ?? counts.pending_approval, tone: 'text-amber-600' },
    { label: 'Approved', value: s.approved ?? counts.approved, tone: 'text-green-600' },
    { label: 'Sent Back', value: s.sent_back ?? counts.sent_back, tone: 'text-orange-600' },
    { label: 'Rejected', value: s.rejected ?? counts.rejected, tone: 'text-red-600' },
  ];

  const headCls = 'sticky top-0 z-10 bg-emerald-50 text-emerald-800 border-b border-r border-emerald-200 px-3 py-2.5 font-semibold text-left';
  const cellCls = 'border-b border-r border-gray-200 px-3 py-2.5 align-middle';

  const awaiting = counts.pending_approval || 0;

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rate Comparison</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {mayDecide
                  ? 'Review vendor quotations and approve before a purchase order is raised.'
                  : 'Compare vendor quotations and send them to the Director for approval.'}
              </p>
            </div>
            <button
              onClick={() => setModal({ open: true, mode: 'add', comparison: null })}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Comparison
            </button>
          </div>

          {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{message}</div>}

          {/* Pending banner — the Director's call to action */}
          {awaiting > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <p className="text-xs sm:text-sm text-amber-900">
                <strong>{awaiting}</strong> rate comparison{awaiting === 1 ? '' : 's'}{' '}
                {mayDecide ? 'awaiting your approval.' : 'pending Director approval.'}
              </p>
              <button
                onClick={() => setStatusFilter(statusFilter === 'pending_approval' ? '' : 'pending_approval')}
                className="ml-auto text-xs font-medium text-amber-800 underline underline-offset-2 flex-shrink-0"
              >
                {statusFilter === 'pending_approval' ? 'Show all' : 'Show them'}
              </button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-lg sm:text-2xl font-bold ${k.tone}`}>{k.value ?? 0}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search number, material, vendor..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white min-w-[150px]">
                <option value="">All statuses</option>
                {RC_STATUSES.map((st) => <option key={st} value={st}>{rcStatusMeta(st).label}</option>)}
              </select>
              {(search || statusFilter) && (
                <button onClick={() => { setSearch(''); setStatusFilter(''); }}
                  className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Clear</button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing {filtered.length ? start + 1 : 0}–{Math.min(start + perPage, filtered.length)} of {filtered.length} comparisons
            </p>
          </div>

          {/* List */}
          {pageItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <p className="text-gray-500 text-sm">
                {search || statusFilter ? 'No comparisons match these filters' : 'No rate comparisons yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[960px] text-xs">
                    <thead>
                      <tr>
                        <th className={headCls}>Number</th>
                        <th className={headCls}>Date</th>
                        <th className={headCls}>Material</th>
                        <th className={`${headCls} text-center`}>Qty</th>
                        <th className={`${headCls} text-center`}>Vendors</th>
                        <th className={headCls}>Recommended</th>
                        <th className={`${headCls} text-right`}>Amount</th>
                        <th className={headCls}>Status</th>
                        <th className={headCls}>PO</th>
                        <th className={`${headCls} text-center`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((rc) => {
                        const meta = rcStatusMeta(rc.status);
                        const pending = isAwaitingDirector(rc);
                        const selectedTotal = (rc.quotations || []).find((q) => q.isSelected)?.totalAmount;
                        return (
                          <tr key={rc._id}
                            className={pending ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50'}>
                            <td className={`${cellCls} font-mono font-semibold text-gray-800`}>
                              <div className="flex items-center gap-1.5">
                                {pending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                                {rc.comparisonNumber}
                              </div>
                              {rc.revisionCount > 0 && <span className="text-[10px] text-gray-400">rev {rc.revisionCount}</span>}
                            </td>
                            <td className={cellCls}>{fmtDate(rc.comparisonDate)}</td>
                            <td className={cellCls}>
                              <p className="font-medium text-gray-800 truncate max-w-[180px]">{rc.materialName}</p>
                              {rc.materialDescription && (
                                <p className="text-gray-500 truncate max-w-[180px]">{rc.materialDescription}</p>
                              )}
                            </td>
                            <td className={`${cellCls} text-center text-gray-700`}>{rc.requiredQuantity} {rc.unit}</td>
                            <td className={`${cellCls} text-center text-gray-700`}>{(rc.quotations || []).length}</td>
                            <td className={cellCls}>
                              {rc.selectedVendorName ? (
                                <span className="text-gray-800">{rc.selectedVendorName}</span>
                              ) : <span className="text-gray-400">Not selected</span>}
                            </td>
                            <td className={`${cellCls} text-right font-semibold text-gray-800`}>
                              {selectedTotal != null ? inr(selectedTotal) : '—'}
                            </td>
                            <td className={cellCls}>
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badge}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className={`${cellCls} font-mono text-[11px] text-gray-600`}>{rc.poNumber || '—'}</td>
                            <td className={`${cellCls} text-center whitespace-nowrap`}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => downloadPdf(rc)} title="Download comparison as PDF"
                                  className="p-1.5 rounded-md text-amber-700 hover:bg-amber-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                <button onClick={() => openDetail(rc)} title="View comparison"
                                  className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {mayDecide && pending && (
                                  <button onClick={() => openDetail(rc)}
                                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700">
                                    Review
                                  </button>
                                )}
                                {canEditComparison(rc) && (
                                  <button onClick={() => setModal({ open: true, mode: 'edit', comparison: rc })} title="Edit"
                                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {canRaisePo(rc) && (
                                  <button onClick={() => handleCreatePo(rc)}
                                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700">
                                    Create PO
                                  </button>
                                )}
                                {isCrmAdmin(user) && (
                                  <button onClick={() => setDeleteTarget(rc)} title="Delete"
                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {pageItems.map((rc) => {
                  const meta = rcStatusMeta(rc.status);
                  const pending = isAwaitingDirector(rc);
                  const selectedTotal = (rc.quotations || []).find((q) => q.isSelected)?.totalAmount;
                  return (
                    <div key={rc._id}
                      className={`bg-white rounded-xl shadow-sm border p-3 ${pending ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-gray-800">{rc.comparisonNumber}</p>
                          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{rc.materialName}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${meta.badge}`}>{meta.label}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600">
                        <div><span className="text-gray-400">Qty:</span> {rc.requiredQuantity} {rc.unit}</div>
                        <div><span className="text-gray-400">Vendors:</span> {(rc.quotations || []).length}</div>
                        <div><span className="text-gray-400">Recommended:</span> {rc.selectedVendorName || '—'}</div>
                        <div><span className="text-gray-400">Amount:</span> {selectedTotal != null ? inr(selectedTotal) : '—'}</div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <button onClick={() => openDetail(rc)}
                          className="flex-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md py-1.5">
                          {mayDecide && pending ? 'Review' : 'View'}
                        </button>
                        <button onClick={() => downloadPdf(rc)}
                          className="flex-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-md py-1.5">PDF</button>
                        {canEditComparison(rc) && (
                          <button onClick={() => setModal({ open: true, mode: 'edit', comparison: rc })}
                            className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md py-1.5">Edit</button>
                        )}
                        {canRaisePo(rc) && (
                          <button onClick={() => handleCreatePo(rc)}
                            className="flex-1 text-xs font-semibold text-white bg-emerald-600 rounded-md py-1.5">Create PO</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-4 py-3 border border-gray-100">
              <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {modal.open && (
        <RateComparisonModal
          mode={modal.mode}
          comparison={modal.comparison}
          vendors={vendors}
          items={items}
          onClose={() => setModal({ open: false, mode: 'add', comparison: null })}
          onSubmit={handleSubmitForm}
        />
      )}

      {detail && (
        <RateComparisonDetail
          comparison={detail}
          currentUser={user}
          onClose={() => { setDetail(null); loadData(); }}
          onDecide={handleDecide}
          onSubmit={handleSubmitToDirector}
          onEdit={(rc) => { setDetail(null); setModal({ open: true, mode: 'edit', comparison: rc }); }}
          onCreatePo={handleCreatePo}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800">Delete rate comparison?</h3>
            <p className="text-sm text-gray-600 mt-1.5">
              <strong className="font-mono">{deleteTarget.comparisonNumber}</strong> will be removed, along with its
              approval history.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={confirmDelete}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default RateComparisons;
