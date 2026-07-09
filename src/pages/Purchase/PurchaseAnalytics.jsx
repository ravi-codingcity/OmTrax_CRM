import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePurchase } from '../../context/PurchaseContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import { stockStatus } from '../../config/purchase';

const inr = (n) => {
  n = Number(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '—' : `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const getRange = (preset, cs, ce) => {
  const now = new Date();
  switch (preset) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': { const day = now.getDay(); const diff = day === 0 ? 6 : day - 1; const mon = new Date(now); mon.setDate(now.getDate() - diff); return { start: startOfDay(mon), end: endOfDay(now) }; }
    case 'month': return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
    case 'year': return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now) };
    case 'custom':
      if (!cs && !ce) return null;
      return { start: cs ? startOfDay(new Date(cs)) : new Date(0), end: ce ? endOfDay(new Date(ce)) : endOfDay(now) };
    default: return null;
  }
};
const PRESETS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
  { key: 'custom', label: 'Custom' },
];

const PurchaseAnalytics = () => {
  const { entries, loading, fetchEntries, fetchInventory } = usePurchase();
  const [inventory, setInventory] = useState([]);
  const [preset, setPreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadData = useCallback(async () => {
    const [, inv] = await Promise.all([fetchEntries(), fetchInventory()]);
    setInventory(inv);
  }, [fetchEntries, fetchInventory]);

  useEffect(() => { loadData(); }, [loadData]);

  // Date-range-filtered entries (by purchase date) drive activity metrics
  const filtered = useMemo(() => {
    const range = getRange(preset, customStart, customEnd);
    if (!range) return entries;
    return entries.filter((e) => {
      const t = new Date(e.purchaseDate || e.createdAt);
      return !isNaN(t.getTime()) && t >= range.start && t <= range.end;
    });
  }, [entries, preset, customStart, customEnd]);

  const data = useMemo(() => {
    const now = new Date();
    // 12-month trend from ALL entries
    const months = [];
    const idx = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      idx[k] = months.length;
      months.push({ key: k, label: monthLabel(k), amount: 0, count: 0 });
    }
    entries.forEach((e) => {
      const d = new Date(e.purchaseDate || e.createdAt);
      if (!isNaN(d.getTime())) {
        const k = monthKey(d);
        if (k in idx) { months[idx[k]].amount += e.totalAmount || 0; months[idx[k]].count += 1; }
      }
    });

    // Activity totals from filtered set
    const byProduct = {};
    const bySupplier = {};
    let purchaseAmount = 0, stockPurchased = 0, stockDispatched = 0, stockReturned = 0;
    filtered.forEach((e) => {
      purchaseAmount += e.totalAmount || 0;
      stockPurchased += e.quantityPurchased || 0;
      stockDispatched += e.totalDispatched || 0;
      stockReturned += e.totalReturned || 0;
      const p = e.itemName || 'Unknown';
      if (!byProduct[p]) byProduct[p] = { name: p, amount: 0, qty: 0 };
      byProduct[p].amount += e.totalAmount || 0;
      byProduct[p].qty += e.quantityPurchased || 0;
      const s = (e.supplier || '').trim();
      if (s) {
        if (!bySupplier[s]) bySupplier[s] = { name: s, amount: 0, count: 0 };
        bySupplier[s].amount += e.totalAmount || 0;
        bySupplier[s].count += 1;
      }
    });

    // Current inventory snapshot (all entries)
    const availableStock = entries.reduce((s, e) => s + (e.availableStock || 0), 0);
    const inventoryValue = entries.reduce((s, e) => s + (e.availableStock || 0) * (e.unitPrice || 0), 0);

    return {
      purchaseAmount,
      totalEntries: filtered.length,
      totalProducts: Object.keys(byProduct).length,
      totalSuppliers: Object.keys(bySupplier).length,
      stockPurchased, stockDispatched, stockReturned, availableStock, inventoryValue,
      months,
      maxMonth: Math.max(1, ...months.map((m) => m.amount)),
      topProducts: Object.values(byProduct).sort((a, b) => b.amount - a.amount).slice(0, 6),
      topSuppliers: Object.values(bySupplier).sort((a, b) => b.amount - a.amount).slice(0, 6),
      recent: [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    };
  }, [entries, filtered]);

  const lowStock = useMemo(() => inventory.filter((i) => i.availableStock <= 5), [inventory]);

  const kpis = [
    { label: 'Purchase Amount', value: inr(data.purchaseAmount), color: 'text-emerald-600' },
    { label: 'Entries', value: data.totalEntries, color: 'text-gray-800' },
    { label: 'Products', value: data.totalProducts, color: 'text-blue-600' },
    { label: 'Suppliers', value: data.totalSuppliers, color: 'text-indigo-600' },
    { label: 'Inventory Value', value: inr(data.inventoryValue), color: 'text-emerald-600' },
    { label: 'Stock Purchased', value: data.stockPurchased, color: 'text-gray-800' },
    { label: 'Dispatched', value: data.stockDispatched, color: 'text-blue-600' },
    { label: 'Returned', value: data.stockReturned, color: 'text-amber-600' },
    { label: 'Available Stock', value: data.availableStock, color: 'text-green-600' },
  ];

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Purchase Analytics</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Procurement insights & inventory reports</p>
            </div>
          </div>

          {/* Date range filter */}
          <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-1">Period:</span>
              {PRESETS.map((p) => (
                <button key={p.key} onClick={() => setPreset(p.key)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${preset === p.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.label}</button>
              ))}
              {preset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg" />
                  <span className="text-gray-400 text-xs">to</span>
                  <input type="date" value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg" />
                </div>
              )}
              <span className="text-xs text-gray-500 ml-auto">{data.totalEntries} entr{data.totalEntries === 1 ? 'y' : 'ies'} in range</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-base sm:text-xl font-bold ${k.color} break-words`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Monthly purchase trend */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Monthly Purchase Trend</h3>
            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-44">
              {data.months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[9px] font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{inr(m.amount)}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500" style={{ height: `${Math.max((m.amount / data.maxMonth) * 100, m.amount > 0 ? 3 : 0)}%` }} title={`${m.label}: ${inr(m.amount)} (${m.count} entries)`}></div>
                  <span className="text-[9px] text-gray-500 mt-1.5">{m.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-2">Purchase value per month (last 12 months)</p>
          </div>

          {/* Top products + Top suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <CollapsibleSection title="Top Purchased Products" defaultOpen>
              {data.topProducts.length ? (
                <div className="space-y-2.5">
                  {data.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate" title={p.name}>{p.name}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{p.qty} qty</span>
                      <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap w-20 text-right">{inr(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">No data in range</p>}
            </CollapsibleSection>

            <CollapsibleSection title="Top Suppliers" defaultOpen>
              {data.topSuppliers.length ? (
                <div className="space-y-2.5">
                  {data.topSuppliers.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate" title={s.name}>{s.name}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{s.count} orders</span>
                      <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap w-20 text-right">{inr(s.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">No data in range</p>}
            </CollapsibleSection>
          </div>

          {/* Low stock + Recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <CollapsibleSection title="Low / Out of Stock Items" badge={lowStock.length} defaultOpen>
              {lowStock.length ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {lowStock.map((i) => {
                    const st = stockStatus(i.availableStock);
                    return (
                      <div key={i.itemName} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-700 truncate flex-1">{i.itemName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{i.availableStock} · {st.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">All items well stocked</p>}
            </CollapsibleSection>

            <CollapsibleSection title="Recent Purchase Activity" defaultOpen>
              {data.recent.length ? (
                <div className="divide-y divide-gray-50">
                  {data.recent.map((e) => (
                    <div key={e._id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.itemName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{e.supplier || 'No supplier'} · {e.quantityPurchased} {e.unit || ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-emerald-600">{inr(e.totalAmount)}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(e.purchaseDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>}
            </CollapsibleSection>
          </div>
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default PurchaseAnalytics;
