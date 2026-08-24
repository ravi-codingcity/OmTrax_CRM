import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRateComparisons } from '../../context/RateComparisonContext';
import { usePurchaseOrders } from '../../context/PurchaseOrderContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import RateComparisonDetail from '../../components/Purchase/RateComparisonDetail';
import { inr, fmtDate } from '../../config/finance';
import { rcStatusMeta, isAwaitingDirector } from '../../config/rateComparison';
import { exportPurchaseOrderPdf, exportRateComparisonPdf } from '../../utils/pdfExport';

/**
 * Director dashboard.
 *
 * The Director's job in the CRM is a queue: rate comparisons waiting on a
 * decision, and visibility of the purchase orders that follow from them. The
 * approval queue is therefore the first thing on the page.
 */
const DirectorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    comparisons, loading, fetchComparisons, fetchStats, getComparison, decide,
  } = useRateComparisons();
  const { orders, fetchOrders, getOrder } = usePurchaseOrders();

  const [stats, setStats] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [, , s] = await Promise.all([fetchComparisons(), fetchOrders(), fetchStats()]);
    setStats(s);
  }, [fetchComparisons, fetchOrders, fetchStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (m) => { setMessage(m); setTimeout(() => setMessage(''), 4000); };

  const queue = useMemo(
    () => comparisons
      .filter(isAwaitingDirector)
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)),
    [comparisons]
  );

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    [orders]
  );

  const s = stats || {};
  const poValue = useMemo(() => orders.reduce((t, o) => t + (o.totalAmount || 0), 0), [orders]);

  const kpis = [
    { label: 'Awaiting You', value: queue.length, tone: 'text-amber-600' },
    { label: 'Approved', value: s.approved ?? 0, tone: 'text-green-600' },
    { label: 'Sent Back', value: s.sent_back ?? 0, tone: 'text-orange-600' },
    { label: 'Rejected', value: s.rejected ?? 0, tone: 'text-red-600' },
    { label: 'Purchase Orders', value: orders.length, tone: 'text-gray-800' },
    { label: 'PO Value', value: inr(poValue), tone: 'text-emerald-600' },
  ];

  const openReview = async (rc) => {
    const full = await getComparison(rc._id);
    setReviewTarget(full || rc);
  };

  const handleDecide = async (id, kind, remarks) => {
    const res = await decide(id, kind, remarks);
    if (res.success) { flash(res.message || 'Decision recorded. Purchase has been notified.'); loadData(); }
    return res;
  };

  const downloadPo = async (po) => {
    setBusy(true);
    try {
      const full = (await getOrder(po._id)) || po;
      await exportPurchaseOrderPdf(full);
    } catch (err) {
      console.error('PO PDF failed:', err);
      flash('Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Director Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Approve rate comparisons and review the purchase orders they produce.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/director/rate-comparisons')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Rate Comparisons
              </button>
              <button
                onClick={() => navigate('/director/orders')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                Purchase Orders
              </button>
            </div>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{message}</div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-base sm:text-xl font-bold ${k.tone} truncate`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Approval queue — the Director's core job */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Awaiting Your Approval</h2>
              {queue.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                  {queue.length}
                </span>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500">Nothing waiting — every rate comparison has been decided.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {queue.map((rc) => {
                  const meta = rcStatusMeta(rc.status);
                  const selected = (rc.quotations || []).find((q) => q.isSelected);
                  return (
                    <div key={rc._id} className="px-4 py-3 hover:bg-amber-50/60 transition-colors flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <button onClick={() => openReview(rc)} className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          <span className="font-mono text-xs text-gray-500 mr-1.5">{rc.comparisonNumber}</span>
                          {rc.materialName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {rc.requiredQuantity} {rc.unit} · {(rc.quotations || []).length} vendors ·
                          {' '}recommending {rc.selectedVendorName || '—'}
                          {selected ? ` at ${inr(selected.totalAmount)}` : ''}
                          {' '}· {fmtDate(rc.submittedAt)}
                        </p>
                      </button>
                      <button
                        onClick={() => exportRateComparisonPdf(rc)}
                        title="Download PDF"
                        className="p-1.5 rounded-md text-amber-700 hover:bg-amber-100 flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openReview(rc)}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                      >
                        Review
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Purchase orders raised off the back of approvals */}
          <CollapsibleSection title="Recent Purchase Orders" badge={orders.length} defaultOpen>
            {recentOrders.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="px-2 py-1.5 font-semibold">PO Number</th>
                      <th className="px-2 py-1.5 font-semibold">Date</th>
                      <th className="px-2 py-1.5 font-semibold">Vendor</th>
                      <th className="px-2 py-1.5 font-semibold">From Comparison</th>
                      <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                      <th className="px-2 py-1.5 font-semibold text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((po) => (
                      <tr key={po._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5 font-mono font-medium text-gray-800">{po.poNumber}</td>
                        <td className="px-2 py-1.5 text-gray-600">{fmtDate(po.poDate)}</td>
                        <td className="px-2 py-1.5 text-gray-700 truncate max-w-[150px]">{po.vendorName}</td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-gray-500">
                          {po.rateComparisonNumber || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{inr(po.totalAmount)}</td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => downloadPo(po)}
                            disabled={busy}
                            title="Download PO as PDF"
                            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">No purchase orders yet.</p>
            )}
            <button
              onClick={() => navigate('/director/orders')}
              className="w-full mt-3 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
            >
              View all purchase orders
            </button>
          </CollapsibleSection>
        </div>
      </PullToRefresh>

      {reviewTarget && (
        <RateComparisonDetail
          comparison={reviewTarget}
          currentUser={user}
          onClose={() => { setReviewTarget(null); loadData(); }}
          onDecide={handleDecide}
          onSubmit={async () => ({ success: false, message: 'Submitting is done by the Purchase Team.' })}
        />
      )}
    </MainLayout>
  );
};

export default DirectorDashboard;
