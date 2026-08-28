import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendors } from '../../context/VendorContext';
import CollapsibleSection from '../Common/CollapsibleSection';
import {
  kycStatusMeta, kycDepartmentShort, isAwaitingFinance, fmtDate,
} from '../../config/finance';

/**
 * Vendor / KYC snapshot for the Purchase Dashboard.
 *
 * Self-contained: it loads its own data so it can be dropped into the existing
 * dashboard without touching that page's state or effects.
 */
const VendorKycSummary = () => {
  const navigate = useNavigate();
  const { vendors, fetchVendors } = useVendors();
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    await fetchVendors();
    setLoaded(true);
  }, [fetchVendors]);

  useEffect(() => { load(); }, [load]);

  const { pending, recent, counts } = useMemo(() => {
    const p = vendors.filter(isAwaitingFinance);
    return {
      pending: p,
      recent: [...vendors]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 6),
      counts: {
        total: vendors.length,
        approved: vendors.filter((v) => v.kycStatus === 'approved').length,
        rejected: vendors.filter((v) => v.kycStatus === 'rejected').length,
        awaiting: p.length,
      },
    };
  }, [vendors]);

  if (!loaded && !vendors.length) return null;

  return (
    <>
      {/* Highlighted banner — the "visually highlighted" pending state */}
      {counts.awaiting > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {counts.awaiting} vendor{counts.awaiting === 1 ? '' : 's'} pending Finance approval
            </p>
            <p className="text-xs text-amber-800 truncate">
              {pending.slice(0, 3).map((v) => v.vendorName).join(', ')}
              {pending.length > 3 ? ` +${pending.length - 3} more` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/purchase/vendors')}
            className="ml-auto px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex-shrink-0"
          >
            View
          </button>
        </div>
      )}

      <CollapsibleSection title="Vendors & KYC" badge={counts.total}>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Total', value: counts.total, tone: 'text-gray-800' },
            { label: 'Awaiting', value: counts.awaiting, tone: 'text-amber-600' },
            { label: 'Approved', value: counts.approved, tone: 'text-green-600' },
            { label: 'Rejected', value: counts.rejected, tone: 'text-red-600' },
          ].map((k) => (
            <div key={k.label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className={`text-base font-bold ${k.tone}`}>{k.value}</p>
              <p className="text-[10px] text-gray-500">{k.label}</p>
            </div>
          ))}
        </div>

        {recent.length ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-1.5 font-semibold">Vendor</th>
                  <th className="px-2 py-1.5 font-semibold">KYC Status</th>
                  <th className="px-2 py-1.5 font-semibold">Department</th>
                  <th className="px-2 py-1.5 font-semibold">Submitted</th>
                  <th className="px-2 py-1.5 font-semibold">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => {
                  const meta = kycStatusMeta(v.kycStatus);
                  const flag = isAwaitingFinance(v);
                  return (
                    <tr
                      key={v._id}
                      onClick={() => navigate('/purchase/vendors')}
                      className={`border-b border-gray-100 cursor-pointer ${flag ? 'bg-amber-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {flag && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                          <span className="font-medium text-gray-800 truncate">{v.vendorName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{kycDepartmentShort(v.kycType)}</td>
                      <td className="px-2 py-1.5 text-gray-600">{fmtDate(v.kycSubmittedAt)}</td>
                      <td className="px-2 py-1.5 text-gray-600">{fmtDate(v.financeReview?.reviewedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic py-2">No vendors yet.</p>
        )}

        <button
          onClick={() => navigate('/purchase/vendors')}
          className="w-full mt-3 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
        >
          Manage Vendors &amp; KYC
        </button>
      </CollapsibleSection>
    </>
  );
};

export default VendorKycSummary;
