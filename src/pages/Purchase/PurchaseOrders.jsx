import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePurchaseOrders } from '../../context/PurchaseOrderContext';
import { useVendors } from '../../context/VendorContext';
import { usePurchase } from '../../context/PurchaseContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import PurchaseOrderModal from '../../components/Purchase/PurchaseOrderModal';
import { exportPurchaseOrderPdf } from '../../utils/pdfExport';
import {
  PO_STATUSES, poStatusMeta, inr, fmtDate, fmtDateTime,
  canManagePurchaseOrders, isCrmAdmin,
} from '../../config/finance';

const PurchaseOrders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading, fetchOrders, fetchStats, fetchTermsSuggestions, getOrder, addOrder, updateOrder, setStatus, deleteOrder } = usePurchaseOrders();
  const { vendors, fetchVendors } = useVendors();
  const { items, fetchItems } = usePurchase();

  const mayManage = canManagePurchaseOrders(user);

  const [stats, setStats] = useState(null);
  const [termsSuggestions, setTermsSuggestions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [modal, setModal] = useState({ open: false, mode: 'add', order: null, prefill: null });
  const [detail, setDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [, , , s, sugg] = await Promise.all([
      fetchOrders(), fetchVendors(), fetchItems(), fetchStats(), fetchTermsSuggestions(),
    ]);
    setStats(s);
    setTermsSuggestions(sugg);
  }, [fetchOrders, fetchVendors, fetchItems, fetchStats, fetchTermsSuggestions]);

  useEffect(() => { loadData(); }, [loadData]);

  // Arriving from an approved rate comparison opens the PO form pre-filled
  useEffect(() => {
    const pf = location.state?.prefillFromComparison;
    if (pf) {
      setModal({ open: true, mode: 'add', order: null, prefill: pf });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const flash = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!term) return true;
      return [o.poNumber, o.vendorName, o.createdByName]
        .some((f) => (f || '').toLowerCase().includes(term))
        || (o.items || []).some((l) => (l.itemName || '').toLowerCase().includes(term));
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleSubmit = async (payload) => {
    const res = modal.mode === 'add'
      ? await addOrder(payload)
      : await updateOrder(modal.order._id, payload);
    if (res.success) { flash(modal.mode === 'add' ? `Purchase order ${res.data.poNumber} created.` : 'Purchase order updated.'); loadData(); }
    return res;
  };

  const openDetail = async (po) => {
    const full = await getOrder(po._id);
    setDetail(full || po);
  };

  const changeStatus = async (po, status, extra = {}) => {
    setBusy(true);
    const res = await setStatus(po._id, { status, ...extra });
    setBusy(false);
    if (res.success) {
      flash(`${po.poNumber} marked "${poStatusMeta(status).label}".`);
      if (detail) setDetail(res.data);
      loadData();
    } else flash(res.message);
  };

  const shareByEmail = (po) => {
    const subject = encodeURIComponent(`Purchase Order ${po.poNumber} — OmTrax`);
    const lines = (po.items || [])
      .map((l, i) => `${i + 1}. ${l.itemName} — ${l.quantity} ${l.unit || ''} @ ${inr(l.rate)} = ${inr(l.amount)}`)
      .join('%0D%0A');
    const body = encodeURIComponent(
      `Dear ${po.vendorName},\n\nPlease find our purchase order below.\n\n` +
      `PO Number: ${po.poNumber}\nPO Date: ${fmtDate(po.poDate)}\n` +
      `${po.expectedDeliveryDate ? `Expected Delivery: ${fmtDate(po.expectedDeliveryDate)}\n` : ''}` +
      `${po.deliveryLocation ? `Deliver To: ${po.deliveryLocation}\n` : ''}\nItems:\n`
    ) + lines + encodeURIComponent(
      `\n\nSubtotal: ${inr(po.subTotal)}\nTax: ${inr(po.taxAmount)}\nTotal: ${inr(po.totalAmount)}\n\n` +
      `${po.paymentTerms ? `Payment Terms: ${po.paymentTerms}\n` : ''}` +
      `${po.termsAndConditions ? `\nTerms:\n${po.termsAndConditions}\n` : ''}\nRegards,\nOmTrax`
    );
    window.open(`mailto:${po.vendorEmail || ''}?subject=${subject}&body=${body}`, '_blank');
    changeStatus(po, 'sent', { sentTo: po.vendorEmail, sentMethod: 'email' });
  };

  // A PO detail response carries the populated vendor; the list rows do not, so
  // refetch before generating so the PDF always has full vendor details.
  const downloadPdf = async (po) => {
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

  const confirmDelete = async () => {
    const res = await deleteOrder(deleteTarget._id);
    setDeleteTarget(null);
    flash(res.success ? 'Purchase order deleted.' : res.message);
  };

  const s = stats || {};
  const kpis = [
    { label: 'Total POs', value: s.total || 0, tone: 'text-gray-800' },
    { label: 'Value', value: inr(s.totalValue), tone: 'text-emerald-600' },
    { label: 'Draft', value: s.draft || 0, tone: 'text-gray-500' },
    { label: 'Generated', value: s.generated || 0, tone: 'text-blue-600' },
    { label: 'Sent', value: s.sent || 0, tone: 'text-indigo-600' },
    { label: 'Completed', value: s.completed || 0, tone: 'text-green-600' },
  ];

  const headCls = 'sticky top-0 z-10 bg-emerald-50 text-emerald-800 border-b border-r border-emerald-200 px-3 py-2.5 font-semibold text-left';
  const cellCls = 'border-b border-r border-gray-200 px-3 py-2.5 align-middle';

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Purchase Orders</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Raise, track and share purchase orders with vendors</p>
            </div>
            {mayManage && (
              <button
                onClick={() => setModal({ open: true, mode: 'add', order: null, prefill: null })}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center w-full sm:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New PO
              </button>
            )}
          </div>

          {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{message}</div>}

          {!mayManage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-lg text-xs">
              You can view purchase orders. Creating and editing them is limited to the Purchase Manager.
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-base sm:text-xl font-bold ${k.tone} truncate`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{k.label}</p>
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
                  placeholder="Search PO number, vendor, item..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white min-w-[140px]">
                <option value="">All statuses</option>
                {PO_STATUSES.map((st) => <option key={st} value={st}>{poStatusMeta(st).label}</option>)}
              </select>
              {(search || statusFilter) && (
                <button onClick={() => { setSearch(''); setStatusFilter(''); }}
                  className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Clear</button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing {filtered.length ? start + 1 : 0}–{Math.min(start + perPage, filtered.length)} of {filtered.length} purchase orders
            </p>
          </div>

          {/* Table */}
          {pageItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <p className="text-gray-500 text-sm">
                {search || statusFilter ? 'No purchase orders match these filters' : 'No purchase orders yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[900px] text-xs">
                    <thead>
                      <tr>
                        <th className={headCls}>PO Number</th>
                        <th className={headCls}>PO Date</th>
                        <th className={headCls}>Vendor</th>
                        <th className={headCls}>Items</th>
                        <th className={`${headCls} text-right`}>Amount</th>
                        <th className={headCls}>Created By</th>
                        <th className={headCls}>Sent</th>
                        <th className={`${headCls} text-center`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((po) => (
                          <tr key={po._id} className="hover:bg-gray-50">
                            <td className={`${cellCls} font-mono font-semibold text-gray-800`}>{po.poNumber}</td>
                            <td className={cellCls}>{fmtDate(po.poDate)}</td>
                            <td className={cellCls}>
                              <p className="font-medium text-gray-800 truncate">{po.vendorName}</p>
                              {po.vendorEmail && <p className="text-gray-500 truncate">{po.vendorEmail}</p>}
                            </td>
                            <td className={cellCls}>
                              <span className="text-gray-700">{(po.items || []).length} line{(po.items || []).length === 1 ? '' : 's'}</span>
                              <p className="text-gray-500 truncate max-w-[160px]">{(po.items || [])[0]?.itemName}</p>
                            </td>
                            <td className={`${cellCls} text-right font-semibold text-gray-800`}>{inr(po.totalAmount)}</td>
                            <td className={cellCls}>{po.createdByName || po.createdBy?.name || '—'}</td>
                            <td className={cellCls}>{po.sentAt ? fmtDate(po.sentAt) : '—'}</td>
                            <td className={`${cellCls} text-center whitespace-nowrap`}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => downloadPdf(po)} title="Download PO as PDF"
                                  className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                <button onClick={() => openDetail(po)} title="View"
                                  className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {mayManage && ['draft', 'generated'].includes(po.status) && (
                                  <>
                                    <button onClick={() => setModal({ open: true, mode: 'edit', order: po, prefill: null })} title="Edit"
                                      className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => shareByEmail(po)} title="Send to vendor" disabled={busy}
                                      className="px-2 py-1 rounded-md text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                                      Send
                                    </button>
                                  </>
                                )}
                                {isCrmAdmin(user) && (
                                  <button onClick={() => setDeleteTarget(po)} title="Delete"
                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {pageItems.map((po) => (
                    <div key={po._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-gray-800">{po.poNumber}</p>
                          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{po.vendorName}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600">
                        <div><span className="text-gray-400">Date:</span> {fmtDate(po.poDate)}</div>
                        <div><span className="text-gray-400">Items:</span> {(po.items || []).length}</div>
                        <div className="col-span-2"><span className="text-gray-400">Amount:</span> <strong className="text-gray-800">{inr(po.totalAmount)}</strong></div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <button onClick={() => openDetail(po)} className="flex-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md py-1.5">View</button>
                        <button onClick={() => downloadPdf(po)} className="flex-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md py-1.5">PDF</button>
                        {mayManage && ['draft', 'generated'].includes(po.status) && (
                          <>
                            <button onClick={() => setModal({ open: true, mode: 'edit', order: po, prefill: null })} className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md py-1.5">Edit</button>
                            <button onClick={() => shareByEmail(po)} className="flex-1 text-xs font-semibold text-white bg-emerald-600 rounded-md py-1.5">Send</button>
                          </>
                        )}
                      </div>
                    </div>
                ))}
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
        <PurchaseOrderModal
          mode={modal.mode}
          order={modal.order}
          vendors={vendors}
          items={items}
          prefill={modal.prefill}
          termsSuggestions={termsSuggestions}
          onClose={() => setModal({ open: false, mode: 'add', order: null, prefill: null })}
          onSubmit={handleSubmit}
        />
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-base font-semibold text-gray-800 font-mono">{detail.poNumber}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{detail.vendorName} · {fmtDate(detail.poDate)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${poStatusMeta(detail.status).badge}`}>
                {poStatusMeta(detail.status).label}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs min-w-[420px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Item</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Rate</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((l, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <p className="text-gray-800">{l.itemName}</p>
                          {l.description && <p className="text-gray-500 text-[11px]">{l.description}</p>}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{l.quantity} {l.unit}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{inr(l.rate)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{inr(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-56 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{inr(detail.subTotal)}</span></div>
                  {detail.discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>−{inr(detail.discount)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>Tax ({detail.taxPercent}%)</span><span>{inr(detail.taxAmount)}</span></div>
                  <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span><span>{inr(detail.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg p-3">
                <div><span className="text-gray-500">Delivery:</span> {detail.deliveryLocation || '—'}</div>
                <div><span className="text-gray-500">Expected:</span> {fmtDate(detail.expectedDeliveryDate)}</div>
                <div><span className="text-gray-500">Payment:</span> {detail.paymentTerms || '—'}</div>
                <div><span className="text-gray-500">Created by:</span> {detail.createdByName || '—'}</div>
                {detail.sentAt && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Sent:</span> {fmtDateTime(detail.sentAt)} to {detail.sentTo || '—'} via {detail.sentMethod || '—'}
                  </div>
                )}
              </div>

              {(detail.terms?.length || detail.termsAndConditions) && (
                <div className="text-xs">
                  <p className="text-gray-500 mb-1">Terms &amp; Conditions</p>
                  {detail.terms?.length ? (
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                      {detail.terms.map((t, i) => <li key={i}>{t}</li>)}
                    </ol>
                  ) : (
                    /* Older purchase orders stored one free-text block */
                    <p className="text-gray-700 whitespace-pre-wrap">{detail.termsAndConditions}</p>
                  )}
                </div>
              )}

              {/* Activity trail */}
              {(detail.activity || []).length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">History</p>
                  <div className="space-y-1.5">
                    {[...detail.activity].reverse().map((a, i) => (
                      <div key={i} className="flex items-baseline gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 capitalize">{a.action}</span>
                        <span className="text-gray-500">{a.byName}</span>
                        <span className="text-gray-400 ml-auto">{fmtDateTime(a.at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mayManage && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {['draft', 'generated'].includes(detail.status) && (
                    <button onClick={() => shareByEmail(detail)} disabled={busy}
                      className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      Send to Vendor
                    </button>
                  )}
                  {detail.status === 'sent' && (
                    <button onClick={() => changeStatus(detail, 'acknowledged')} disabled={busy}
                      className="px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50">
                      Mark Acknowledged
                    </button>
                  )}
                  {['sent', 'acknowledged'].includes(detail.status) && (
                    <button onClick={() => changeStatus(detail, 'completed')} disabled={busy}
                      className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50">
                      Mark Completed
                    </button>
                  )}
                  {!['completed', 'cancelled'].includes(detail.status) && (
                    <button onClick={() => changeStatus(detail, 'cancelled')} disabled={busy}
                      className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50">
                      Cancel PO
                    </button>
                  )}
                  <button onClick={() => exportPurchaseOrderPdf(detail)}
                    className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                    Download PDF
                  </button>
                  <button onClick={() => setDetail(null)}
                    className="ml-auto px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800">Delete purchase order?</h3>
            <p className="text-sm text-gray-600 mt-1.5">
              <strong className="font-mono">{deleteTarget.poNumber}</strong> will be removed from the register.
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

export default PurchaseOrders;
