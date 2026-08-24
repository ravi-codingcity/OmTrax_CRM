import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVendors } from '../../context/VendorContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import KycReviewPanel from '../../components/Vendor/KycReviewPanel';
import {
  kycStatusMeta, kycSourceLabel, financeRoleLabel, fmtDate,
} from '../../config/finance';

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vendors, loading, fetchVendors, fetchStats, getVendor, startKycReview, decideKyc } = useVendors();

  const [stats, setStats] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [, s] = await Promise.all([fetchVendors(), fetchStats()]);
    setStats(s);
  }, [fetchVendors, fetchStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const s = stats || {};

  const kpis = [
    { label: 'Total Vendors', value: s.total || 0, tone: 'text-gray-800' },
    { label: 'Pending KYC', value: (s.not_sent || 0) + (s.sent || 0), tone: 'text-gray-500' },
    { label: 'Submitted', value: s.submitted || 0, tone: 'text-amber-600' },
    { label: 'Under Review', value: s.under_review || 0, tone: 'text-indigo-600' },
    { label: 'Approved', value: s.approved || 0, tone: 'text-green-600' },
    { label: 'Rejected', value: s.rejected || 0, tone: 'text-red-600' },
  ];

  // Everything Finance still has to act on, newest submission first
  const queue = useMemo(
    () => vendors
      .filter((v) => ['submitted', 'under_review'].includes(v.kycStatus))
      .sort((a, b) => new Date(b.kycSubmittedAt || 0) - new Date(a.kycSubmittedAt || 0)),
    [vendors]
  );

  const openRecord = async (vendor) => {
    const full = await getVendor(vendor._id);
    setReviewTarget(full || vendor);
  };

  const handleDecide = async (id, decision, remarks) => {
    const res = await decideKyc(id, decision, remarks);
    if (res.success) {
      setMessage(`Vendor KYC ${decision}. The Purchase department has been notified.`);
      setTimeout(() => setMessage(''), 4000);
      loadData();
    }
    return res;
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Finance Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {financeRoleLabel(user?.role)} · Vendor KYC verification and approvals
              </p>
            </div>
            <button
              onClick={() => navigate('/finance/vendors')}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 flex items-center justify-center w-full sm:w-auto"
            >
              All Vendors
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{message}</div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-lg sm:text-2xl font-bold ${k.tone}`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Awaiting review queue — the primary Finance workflow */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">Awaiting Your Review</h2>
                {queue.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                    {queue.length}
                  </span>
                )}
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500">Nothing waiting — every KYC has been reviewed.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {queue.map((v) => {
                  const meta = kycStatusMeta(v.kycStatus);
                  return (
                    <button
                      key={v._id}
                      onClick={() => openRecord(v)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50/60 transition-colors flex items-center gap-3"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{v.vendorName}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {v.companyName || '—'} · via {kycSourceLabel(v.kycSource)} · {fmtDate(v.kycSubmittedAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 flex-shrink-0 hidden sm:inline">Review →</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent decisions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CollapsibleSection title="Recent Approvals" defaultOpen>
              {(s.recentApprovals || []).length ? (
                <div className="divide-y divide-gray-100">
                  {s.recentApprovals.map((v) => (
                    <div key={v._id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{v.vendorName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{v.companyName}</p>
                      </div>
                      <span className="text-[11px] text-green-700 font-medium flex-shrink-0">
                        {fmtDate(v.financeReview?.reviewedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-2">No approvals yet.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Recent Rejections" defaultOpen>
              {(s.recentRejections || []).length ? (
                <div className="divide-y divide-gray-100">
                  {s.recentRejections.map((v) => (
                    <div key={v._id} className="py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-gray-800 truncate">{v.vendorName}</p>
                        <span className="text-[11px] text-red-700 font-medium flex-shrink-0">
                          {fmtDate(v.financeReview?.reviewedAt)}
                        </span>
                      </div>
                      {v.financeReview?.remarks && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{v.financeReview.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-2">No rejections yet.</p>
              )}
            </CollapsibleSection>
          </div>

          {/* KYC source split */}
          <CollapsibleSection title="KYC Requests by Source" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-700">{s.bySource?.purchase || 0}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Generated by Purchase</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{s.bySource?.finance || 0}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Generated by Finance</p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </PullToRefresh>

      {reviewTarget && (
        <KycReviewPanel
          vendor={reviewTarget}
          currentUser={user}
          onClose={() => { setReviewTarget(null); loadData(); }}
          onStartReview={async (id) => {
            const res = await startKycReview(id);
            if (res.success) setReviewTarget(res.data);
            return res;
          }}
          onDecide={handleDecide}
        />
      )}
    </MainLayout>
  );
};

export default FinanceDashboard;
