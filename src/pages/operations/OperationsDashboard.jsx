import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVendors } from '../../context/VendorContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import KycReviewPanel from '../../components/Vendor/KycReviewPanel';
import { kycStatusMeta, fmtDate } from '../../config/finance';

/**
 * Operations Department dashboard.
 *
 * Deliberately vendor-KYC focused — Operations has no Leads workflow. The
 * backend scopes every figure to the Operations KYC type, so nothing here
 * needs to filter by department itself.
 */

const Kpi = ({ label, value, tone = 'text-gray-800', hint }) => (
  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`text-xl font-bold mt-0.5 tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

const Panel = ({ title, count, children, empty }) => (
  <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex items-baseline justify-between">
      <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
      {count !== undefined && <span className="text-[10px] text-gray-400">{count}</span>}
    </div>
    <div className="p-3">
      {children || <p className="text-[11px] text-gray-400 italic">{empty}</p>}
    </div>
  </section>
);

// A labelled proportion bar — same visual language as the other dashboards
const BarRow = ({ label, value, max, sub }) => (
  <li className="flex items-center gap-2 text-xs">
    <span className="w-32 sm:w-40 truncate text-gray-700" title={label}>{label}</span>
    <span className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <span
        className="block h-full bg-cyan-500 rounded-full"
        style={{ width: `${max ? Math.max(4, (value / max) * 100) : 0}%` }}
      />
    </span>
    <span className="w-8 text-right tabular-nums text-gray-600">{value}</span>
    {sub && <span className="w-20 text-right text-[10px] text-gray-400 truncate hidden sm:block">{sub}</span>}
  </li>
);

const OperationsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vendors, loading, fetchVendors, fetchStats, getVendor } = useVendors();

  const [stats, setStats] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const loadData = useCallback(async () => {
    const [, s] = await Promise.all([fetchVendors(), fetchStats()]);
    setStats(s);
  }, [fetchVendors, fetchStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const s = stats || {};

  const kpis = [
    { label: 'Total Vendors', value: s.total || 0 },
    { label: 'KYC Requests', value: s.kycRequests || 0, hint: 'links raised' },
    { label: 'Pending KYC', value: s.pendingKyc || 0, tone: 'text-gray-500', hint: 'sent, not returned' },
    { label: 'Awaiting Review', value: s.awaitingReview || 0, tone: 'text-amber-600', hint: 'with Finance' },
    { label: 'Approved', value: s.approved || 0, tone: 'text-green-600' },
    { label: 'Rejected', value: s.rejected || 0, tone: 'text-red-600' },
  ];

  const recent = useMemo(
    () => [...vendors]
      .filter((v) => v.kycSubmittedAt)
      .sort((a, b) => new Date(b.kycSubmittedAt) - new Date(a.kycSubmittedAt))
      .slice(0, 8),
    [vendors]
  );

  const services = s.byService || [];
  const locations = s.byLocation || [];
  const maxService = services.length ? services[0].count : 0;
  const maxLocation = locations.length ? locations[0].count : 0;

  const openRecord = async (vendor) => {
    const full = await getVendor(vendor._id);
    setReviewTarget(full || vendor);
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Operations Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Vendor KYC across the Operations Department.
              </p>
            </div>
            <button
              onClick={() => navigate('/operations/vendors')}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 whitespace-nowrap"
            >
              Go to Vendors
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {kpis.map((k) => <Kpi key={k.label} {...k} />)}
          </div>

          {/* Fleet — only meaningful for Operations */}
          {(s.fleet?.vehicles > 0) && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2 text-xs text-cyan-900">
              <span className="font-semibold tabular-nums">{s.fleet.vehicles}</span> vehicles reported across{' '}
              <span className="font-semibold tabular-nums">{s.fleet.vendors}</span>{' '}
              {s.fleet.vendors === 1 ? 'vendor' : 'vendors'}.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Panel
              title="Services offered"
              count={services.length ? `${services.length} listed` : undefined}
              empty="No services recorded yet — they appear once vendors submit their KYC."
            >
              {services.length > 0 && (
                <ul className="space-y-1.5">
                  {services.map((x) => (
                    <BarRow key={x.name} label={x.name} value={x.count} max={maxService} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Service locations"
              count={locations.length ? `${locations.length} states` : undefined}
              empty="No service locations recorded yet."
            >
              {locations.length > 0 && (
                <ul className="space-y-1.5">
                  {locations.map((x) => (
                    <BarRow
                      key={x.state}
                      label={x.state}
                      value={x.vendors}
                      max={maxLocation}
                      sub={x.cityCount ? `${x.cityCount} ${x.cityCount === 1 ? 'city' : 'cities'}` : 'statewide'}
                    />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            title="Recent KYC submissions"
            count={recent.length ? `${recent.length} shown` : undefined}
            empty="No KYC submissions yet."
          >
            {recent.length > 0 && (
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-200">
                      <th className="py-1.5 pr-2 font-semibold">Vendor</th>
                      <th className="py-1.5 px-2 font-semibold hidden sm:table-cell">Company</th>
                      <th className="py-1.5 px-2 font-semibold">Status</th>
                      <th className="py-1.5 pl-2 font-semibold text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((v) => {
                      const meta = kycStatusMeta(v.kycStatus);
                      return (
                        <tr
                          key={v._id}
                          onClick={() => openRecord(v)}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="py-1.5 pr-2 font-medium text-gray-800 truncate max-w-[10rem]">
                            {v.nameIsPlaceholder ? '—' : v.vendorName}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600 hidden sm:table-cell truncate max-w-[12rem]">
                            {v.companyName || '—'}
                          </td>
                          <td className="py-1.5 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-1.5 pl-2 text-right text-gray-500 whitespace-nowrap">
                            {fmtDate(v.kycSubmittedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {(s.byCompanySize || []).length > 0 && (
            <Panel title="Vendors by company size">
              <ul className="flex flex-wrap gap-1.5">
                {s.byCompanySize.map((c) => (
                  <li key={c.size}
                    className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
                    {c.size} employees <span className="font-semibold tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </PullToRefresh>

      {reviewTarget && (
        <KycReviewPanel
          vendor={reviewTarget}
          currentUser={user}
          onClose={() => { setReviewTarget(null); loadData(); }}
        />
      )}
    </MainLayout>
  );
};

export default OperationsDashboard;
