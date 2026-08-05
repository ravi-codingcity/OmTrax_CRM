import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePurchase } from '../../context/PurchaseContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import PurchaseTable from '../../components/Purchase/PurchaseTable';
import PurchaseDetailPanel from '../../components/Purchase/PurchaseDetailPanel';
import ExportModal from '../../components/Purchase/ExportModal';
import ReceiveModal from '../../components/Purchase/ReceiveModal';
import { stockStatus, roleTitle, canReceive, formatQuantity } from '../../config/purchase';
import { getExportRange, exportPurchaseExcel } from '../../utils/purchaseExport';

const inr = (n) => {
  n = Number(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
};

const PurchaseDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entries, loading, fetchEntries, fetchStats, fetchInventory, receiveEntry } = usePurchase();
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [detailEntry, setDetailEntry] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [flashMsg, setFlashMsg] = useState('');
  const [awaitingOpen, setAwaitingOpen] = useState(false); // collapsed by default
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Materials awaiting this user's receipt confirmation (location managers/admin)
  const pendingForMe = useMemo(() => entries.filter((e) => canReceive(user, e)), [entries, user]);

  const handleReceive = async (status, note) => {
    const res = await receiveEntry(receiveTarget._id, { status, note });
    if (res.success) {
      setFlashMsg(`Material marked ${status === 'received' ? 'Received' : 'Not Received'}.`);
      setTimeout(() => setFlashMsg(''), 3500);
      loadData();
    }
    return res;
  };

  const loadData = useCallback(async () => {
    const [, s, inv] = await Promise.all([fetchEntries(), fetchStats(), fetchInventory()]);
    setStats(s);
    setInventory(inv);
  }, [fetchEntries, fetchStats, fetchInventory]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter entries by the chosen period and generate the Excel report
  const handleExport = async ({ type, customStart, customEnd }) => {
    const range = getExportRange(type, customStart, customEnd);
    if (!range) return { error: 'Please choose a valid date range.' };
    const rows = entries.filter((e) => {
      const t = new Date(e.purchaseDate || e.createdAt);
      return !isNaN(t.getTime()) && t >= range.start && t <= range.end;
    });
    if (!rows.length) return { error: 'No purchase records found for the selected period.' };
    try {
      await exportPurchaseExcel({ entries: rows, periodLabel: range.label });
      return {};
    } catch (err) {
      console.error('Export failed:', err);
      return { error: 'Failed to generate the Excel file.' };
    }
  };

  const s = stats || {};
  const kpis = [
    { label: 'Items', value: s.totalItems || 0, color: 'text-gray-800' },
    { label: 'Purchase Value', value: inr(s.purchaseValue), color: 'text-emerald-600' },
    { label: 'Purchased Qty', value: s.purchasedQty || 0, color: 'text-gray-800' },
    { label: 'Dispatched', value: s.dispatchedQty || 0, color: 'text-blue-600' },
    { label: 'Returned', value: s.returnedQty || 0, color: 'text-amber-600' },
    { label: 'Available Stock', value: s.availableStock || 0, color: 'text-green-600' },
  ];

  // Recent purchases, newest first, paginated (20 per page)
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [entries]
  );
  const totalPages = Math.ceil(sortedEntries.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = sortedEntries.slice(start, start + perPage);
  useEffect(() => { setPage(1); }, [sortedEntries.length]);

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Purchase Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">{roleTitle(user?.role)} · Procurement & inventory overview</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowExport(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center flex-1 sm:flex-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Excel
              </button>
              <button
                onClick={() => navigate('/purchase/entries')}
                className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center justify-center flex-1 sm:flex-none"
              >
                Manage Entries
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-lg sm:text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Low / out of stock alert */}
          {(s.lowStock > 0 || s.outOfStock > 0) && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {s.lowStock > 0 && <span><b>{s.lowStock}</b> item(s) low on stock</span>}
              {s.outOfStock > 0 && <span>· <b>{s.outOfStock}</b> out of stock</span>}
            </div>
          )}

          {flashMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm">{flashMsg}</div>
          )}

          {/* Pending receipt inbox — location manager / admin. Collapsed by
              default; only rendered when there are pending confirmations. */}
          {pendingForMe.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setAwaitingOpen((o) => !o)}
                aria-expanded={awaitingOpen}
                className="w-full flex items-center gap-2 px-3 sm:px-4 py-3 text-left hover:bg-amber-100/60 transition-colors"
              >
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <h3 className="text-sm font-semibold text-amber-900 flex-1">Materials Awaiting Your Confirmation</h3>
                <span className="text-xs font-bold text-white bg-amber-500 rounded-full px-2 py-0.5 flex-shrink-0">{pendingForMe.length}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-amber-700 flex-shrink-0 transition-transform ${awaitingOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {awaitingOpen && (
                <div className="px-3 sm:px-4 pb-3 space-y-2">
                  {pendingForMe.map((e) => (
                    <div key={e._id} className="bg-white rounded-lg border border-amber-200 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{e.itemName}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {formatQuantity(e.quantityPurchased, e.unit)} · {e.storageLocation || 'No location'} · from {e.createdByName || e.createdBy?.name || '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => setReceiveTarget(e)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                      >
                        Confirm Receipt
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inventory summary */}
          <CollapsibleSection title="Inventory Summary" badge={inventory.length}>
            {inventory.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2">Storage Location</th>
                      <th className="px-2 py-2 text-center">Purchased</th>
                      <th className="px-2 py-2 text-center">Dispatched</th>
                      <th className="px-2 py-2 text-center">Returned</th>
                      <th className="px-2 py-2 text-center">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((i) => {
                      const st = stockStatus(i.availableStock);
                      return (
                        <tr key={i.itemName} className="hover:bg-gray-50">
                          <td className="px-2 py-2 font-medium text-gray-800">{i.itemName}</td>
                          <td className="px-2 py-2 text-gray-500">{i.storageLocations?.length ? i.storageLocations.join(', ') : '—'} {i.unit ? `(${i.unit})` : ''}</td>
                          <td className="px-2 py-2 text-center text-gray-700 tabular-nums">{i.totalPurchased}</td>
                          <td className="px-2 py-2 text-center text-blue-600 tabular-nums">{i.totalDispatched}</td>
                          <td className="px-2 py-2 text-center text-amber-600 tabular-nums">{i.totalReturned}</td>
                          <td className="px-2 py-2 text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{i.availableStock}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500 text-center py-4">No inventory yet</p>}
          </CollapsibleSection>

          {/* Recent purchases */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Recent Purchases</h3>
              <button onClick={() => navigate('/purchase/entries')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">View all →</button>
            </div>
            <PurchaseTable entries={pageItems} currentUser={user} onOpenDetails={(e) => setDetailEntry(e)} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <span className="text-xs text-gray-600">
                  Showing {sortedEntries.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, sortedEntries.length)} of {sortedEntries.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">First</button>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Prev</button>
                  <span className="px-2 text-xs font-medium text-gray-700">{page}/{totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Next</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50">Last</button>
                </div>
              </div>
            )}
          </div>

          {detailEntry && (
            <PurchaseDetailPanel
              entry={detailEntry}
              currentUser={user}
              onClose={() => setDetailEntry(null)}
              onReceive={canReceive(user, detailEntry) ? (e) => { setDetailEntry(null); setReceiveTarget(e); } : undefined}
            />
          )}
          {receiveTarget && (
            <ReceiveModal entry={receiveTarget} onClose={() => setReceiveTarget(null)} onSubmit={handleReceive} />
          )}
          {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={handleExport} />}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default PurchaseDashboard;
