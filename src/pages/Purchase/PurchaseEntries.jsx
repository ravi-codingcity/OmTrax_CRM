import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePurchase } from '../../context/PurchaseContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import PurchaseTable from '../../components/Purchase/PurchaseTable';
import PurchaseModal from '../../components/Purchase/PurchaseModal';
import PurchaseActionModal from '../../components/Purchase/PurchaseActionModal';
import HistoryModal from '../../components/Purchase/HistoryModal';
import { CATEGORIES, canManagePurchase, stockStatus } from '../../config/purchase';

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
const inRange = (date, range) => { if (!range) return true; const t = new Date(date); return !isNaN(t.getTime()) && t >= range.start && t <= range.end; };

const DATE_PRESETS = [
  { key: 'all', label: 'All' }, { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'custom', label: 'Custom' },
];
const STATUSES = ['In Stock', 'Low Stock', 'Out of Stock'];
const SORTS = [
  { key: 'newest', label: 'Newest' }, { key: 'oldest', label: 'Oldest' },
  { key: 'amount', label: 'Amount (high→low)' }, { key: 'product', label: 'Product (A→Z)' }, { key: 'supplier', label: 'Supplier (A→Z)' },
];

const defaultFilters = {
  category: '', supplier: '', location: '', status: '', createdBy: '',
  dateField: 'purchase', datePreset: 'all', customStart: '', customEnd: '',
};

const PurchaseEntries = () => {
  const { user } = useAuth();
  const { entries, items, suppliers, loading, fetchEntries, fetchItems, fetchSuppliers, addEntry, updateEntry, deleteEntry, dispatchItem, returnItem } = usePurchase();
  const manage = canManagePurchase(user);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [f, setF] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [modal, setModal] = useState({ open: false, mode: 'add', entry: null });
  const [action, setAction] = useState(null);
  const [historyEntry, setHistoryEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchItems(), fetchSuppliers()]);
  }, [fetchEntries, fetchItems, fetchSuppliers]);
  useEffect(() => { loadData(); }, [loadData]);

  const setFilter = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const resetFilters = () => { setF(defaultFilters); setSearch(''); setSortBy('newest'); };

  // Dropdown option sets derived from data
  const supplierOptions = useMemo(() => {
    const set = new Set(suppliers.map((s) => s.name));
    entries.forEach((e) => { if (e.supplier) set.add(e.supplier); });
    return [...set].sort();
  }, [suppliers, entries]);
  const locationOptions = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => (e.dispatches || []).forEach((d) => { if (d.location) set.add(d.location); }));
    return [...set].sort();
  }, [entries]);
  const createdByOptions = useMemo(() => [...new Set(entries.map((e) => e.createdByName).filter(Boolean))].sort(), [entries]);

  const activeFilterCount = useMemo(
    () => Object.entries(f).filter(([k, v]) => v && !['dateField', 'datePreset', 'customStart', 'customEnd'].includes(k)).length
      + (f.datePreset !== 'all' ? 1 : 0),
    [f]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const range = getRange(f.datePreset, f.customStart, f.customEnd);
    const list = entries.filter((e) => {
      if (term && !(
        e.itemName?.toLowerCase().includes(term) ||
        e.supplier?.toLowerCase().includes(term) ||
        e.invoiceNumber?.toLowerCase().includes(term) ||
        e.category?.toLowerCase().includes(term)
      )) return false;
      if (f.category && e.category !== f.category) return false;
      if (f.supplier && e.supplier !== f.supplier) return false;
      if (f.status && stockStatus(e.availableStock).label !== f.status) return false;
      if (f.createdBy && e.createdByName !== f.createdBy) return false;
      if (f.location && !(e.dispatches || []).some((d) => d.location === f.location)) return false;
      // Date range on the selected date field
      if (range) {
        if (f.dateField === 'purchase' && !inRange(e.purchaseDate || e.createdAt, range)) return false;
        if (f.dateField === 'dispatch' && !(e.dispatches || []).some((d) => inRange(d.dispatchDate, range))) return false;
        if (f.dateField === 'return' && !(e.returns || []).some((r) => inRange(r.returnDate, range))) return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'oldest': sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'amount': sorted.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0)); break;
      case 'product': sorted.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || '')); break;
      case 'supplier': sorted.sort((a, b) => (a.supplier || '').localeCompare(b.supplier || '')); break;
      default: sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return sorted;
  }, [entries, search, sortBy, f]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  useEffect(() => { setPage(1); }, [search, sortBy, f]);

  const flash = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  const handleSubmit = async (payload) => {
    const res = modal.mode === 'add' ? await addEntry(payload) : await updateEntry(modal.entry._id, payload);
    if (res.success) { flash(modal.mode === 'add' ? 'Purchase entry added!' : 'Purchase entry updated!'); fetchItems(); fetchSuppliers(); }
    return res;
  };
  const handleAction = async (payload) => {
    const { type, entry } = action;
    const res = type === 'dispatch' ? await dispatchItem(entry._id, payload) : await returnItem(entry._id, payload);
    if (res.success) flash(type === 'dispatch' ? 'Dispatch recorded.' : 'Return recorded.');
    return res;
  };
  const confirmDelete = async () => {
    setBusy(true);
    const res = await deleteEntry(deleteTarget._id);
    setBusy(false);
    flash(res.success ? 'Entry deleted.' : (res.message || 'Failed to delete.'));
    setDeleteTarget(null);
  };

  const selectCls = 'px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500';

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Purchase Entries</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Search, filter & manage procurement records</p>
            </div>
            {manage && (
              <button onClick={() => setModal({ open: true, mode: 'add', entry: null })} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Purchase
              </button>
            )}
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {message}
            </div>
          )}

          {/* Search + sort + filter toggle */}
          <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search product, supplier, invoice, category..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls} title="Sort by">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button onClick={() => setShowFilters((v) => !v)} className={`px-3 py-1.5 text-sm font-medium rounded-lg border flex items-center gap-1.5 ${showFilters || activeFilterCount ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </button>
              {(activeFilterCount > 0 || search || sortBy !== 'newest') && (
                <button onClick={resetFilters} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Reset</button>
              )}
              <span className="text-xs text-gray-500 ml-auto">{filtered.length} of {entries.length}</span>
            </div>

            {showFilters && (
              <div className="border-t border-gray-100 pt-2.5 space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <select value={f.category} onChange={(e) => setFilter('category', e.target.value)} className={selectCls}>
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={f.supplier} onChange={(e) => setFilter('supplier', e.target.value)} className={selectCls}>
                    <option value="">All suppliers</option>
                    {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={f.location} onChange={(e) => setFilter('location', e.target.value)} className={selectCls}>
                    <option value="">All locations</option>
                    {locationOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={f.status} onChange={(e) => setFilter('status', e.target.value)} className={selectCls}>
                    <option value="">All status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={f.createdBy} onChange={(e) => setFilter('createdBy', e.target.value)} className={selectCls}>
                    <option value="">All creators</option>
                    {createdByOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Date range */}
                <div className="flex flex-wrap items-center gap-2">
                  <select value={f.dateField} onChange={(e) => setFilter('dateField', e.target.value)} className={selectCls} title="Date field">
                    <option value="purchase">Purchase Date</option>
                    <option value="dispatch">Dispatch Date</option>
                    <option value="return">Return Date</option>
                  </select>
                  {DATE_PRESETS.map((p) => (
                    <button key={p.key} onClick={() => setFilter('datePreset', p.key)} className={`px-2.5 py-1.5 text-xs font-medium rounded-lg ${f.datePreset === p.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.label}</button>
                  ))}
                  {f.datePreset === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={f.customStart} max={f.customEnd || undefined} onChange={(e) => setFilter('customStart', e.target.value)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg" />
                      <span className="text-gray-400 text-xs">to</span>
                      <input type="date" value={f.customEnd} min={f.customStart || undefined} onChange={(e) => setFilter('customEnd', e.target.value)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <PurchaseTable
            entries={pageItems}
            currentUser={user}
            onDispatch={(e) => setAction({ type: 'dispatch', entry: e })}
            onReturn={(e) => setAction({ type: 'return', entry: e })}
            onHistory={(e) => setHistoryEntry(e)}
            onEdit={(e) => setModal({ open: true, mode: 'edit', entry: e })}
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

          {/* Modals */}
          {modal.open && (
            <PurchaseModal mode={modal.mode} entry={modal.entry} items={items} suppliers={suppliers} onClose={() => setModal({ open: false, mode: 'add', entry: null })} onSubmit={handleSubmit} />
          )}
          {action && <PurchaseActionModal action={action.type} entry={action.entry} onClose={() => setAction(null)} onSubmit={handleAction} />}
          {historyEntry && <HistoryModal entry={historyEntry} onClose={() => setHistoryEntry(null)} />}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setDeleteTarget(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Delete Purchase Entry</h3>
                <p className="text-sm text-gray-600 mb-4">Delete <span className="font-medium">{deleteTarget.itemName}</span>? This cannot be undone.</p>
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

export default PurchaseEntries;
