import { useState } from 'react';
import { stockStatus, formatQuantity, canModifyEntry, isCrmAdmin, createdByLabel, receiptStatusMeta, canReceive, canManageStock } from '../../config/purchase';

const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '—' : `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime()) ? '—' : x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Compact key/value row
const Row = ({ label, value, mono = false }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[11px] text-gray-500 flex-shrink-0">{label}</span>
    <span className={`text-xs text-gray-800 text-right truncate ${mono ? 'font-mono' : 'font-medium'}`} title={typeof value === 'string' ? value : undefined}>
      {value || '—'}
    </span>
  </div>
);

// Compact colour-coded stat chip
const Stat = ({ label, value, color, bg }) => (
  <div className={`${bg} rounded-lg px-2 py-1.5 text-center`}>
    <p className={`text-sm font-bold ${color} leading-none`}>{value}</p>
    <p className="text-[9px] text-gray-500 mt-1 leading-none">{label}</p>
  </div>
);

/**
 * Compact "Record" drawer for a purchase entry. Tabs keep it short — the summary
 * stats stay pinned while Details / Dispatch / Returns swap in below, so the
 * whole record is readable with minimal scrolling.
 */
const ACTION_META = {
  purchased: { label: 'Purchased', color: 'text-gray-700', dot: 'bg-gray-400' },
  received: { label: 'Received', color: 'text-green-700', dot: 'bg-green-500' },
  not_received: { label: 'Not Received', color: 'text-red-700', dot: 'bg-red-500' },
  dispatch: { label: 'Dispatched', color: 'text-blue-700', dot: 'bg-blue-500' },
  return: { label: 'Returned', color: 'text-amber-700', dot: 'bg-amber-500' },
  updated: { label: 'Updated', color: 'text-gray-600', dot: 'bg-gray-300' },
};

const PurchaseDetailPanel = ({ entry, currentUser, onClose, onReceive, onDispatch, onReturn, onEdit, onDelete }) => {
  const [tab, setTab] = useState('details');

  const st = stockStatus(entry.availableStock);
  const rs = receiptStatusMeta(entry.receiptStatus);
  const admin = isCrmAdmin(currentUser);

  // What this user may do, given the material's lifecycle stage
  const showReceive = !!onReceive && canReceive(currentUser, entry);
  const canStock = canManageStock(currentUser, entry); // dispatch / return
  const canEdit = canModifyEntry(currentUser, entry);   // procurement edit

  const dispatches = [...(entry.dispatches || [])].sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
  const returns = [...(entry.returns || [])].sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  const activity = [...(entry.activity || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
  const jobNumbers = [...new Set(dispatches.map((d) => d.jobNumber).filter(Boolean))];
  const showActions = showReceive || (canStock && (onDispatch || onReturn)) || (canEdit && onEdit) || (admin && onDelete);

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'dispatch', label: `Dispatch (${dispatches.length})` },
    { key: 'returns', label: `Returns (${returns.length})` },
    { key: 'activity', label: 'History' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-800 truncate">{entry.itemName}</h2>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${rs.badge}`}>{rs.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${st.badge}`}>{st.label}</span>
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {entry.storageLocation || 'No location'} · {entry.supplier || 'No supplier'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pinned summary stats */}
        <div className="grid grid-cols-4 gap-1.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <Stat label="Purchased" value={entry.quantityPurchased ?? 0} color="text-gray-800" bg="bg-white" />
          <Stat label="Dispatched" value={entry.totalDispatched ?? 0} color="text-blue-600" bg="bg-blue-50" />
          <Stat label="Returned" value={entry.totalReturned ?? 0} color="text-amber-600" bg="bg-amber-50" />
          <Stat label="Available" value={entry.availableStock ?? 0} color="text-green-600" bg="bg-green-50" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tab === 'details' && (
            <div className="space-y-3">
              <div>
                <Row label="Purchase Date" value={fmtDate(entry.purchaseDate)} />
                <Row label="Quantity" value={formatQuantity(entry.quantityPurchased, entry.unit)} />
                <Row label="Unit Price" value={inr(entry.unitPrice)} />
                <Row label="Total Amount" value={inr(entry.totalAmount)} />
                <Row label="Invoice / Bill No." value={entry.invoiceNumber} mono />
                <Row label="Supplier / Vendor" value={entry.supplier} />
                <Row label="Storage Location" value={entry.storageLocation} />
                <Row label="Job Number(s)" value={jobNumbers.length ? jobNumbers.join(', ') : 'Not dispatched yet'} mono={!!jobNumbers.length} />
              </div>

              {/* Receipt status */}
              <div className={`rounded-lg p-2.5 border ${entry.receiptStatus === 'received' ? 'bg-green-50 border-green-100' : entry.receiptStatus === 'not_received' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">Receipt Status</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${rs.badge}`}>{rs.label}</span>
                </div>
                {entry.receiptStatus !== 'pending' && (
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400">{entry.receiptStatus === 'received' ? 'Received By' : 'Actioned By'}</p>
                      <p className="text-[11px] text-gray-700">{entry.receivedByName || entry.receivedBy?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Date &amp; Time</p>
                      <p className="text-[11px] text-gray-700">{fmtDateTime(entry.receivedAt)}</p>
                    </div>
                    {entry.receiptNote && <div className="col-span-2"><p className="text-[10px] text-gray-400">Note</p><p className="text-[11px] text-gray-700">{entry.receiptNote}</p></div>}
                  </div>
                )}
              </div>

              {entry.remarks && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Remarks</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{entry.remarks}</p>
                </div>
              )}

              {/* Traceability */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {createdByLabel(entry).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{createdByLabel(entry)}</p>
                    <p className="text-[10px] text-gray-500">Created by</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-100 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400">Created</p>
                    <p className="text-[11px] text-gray-700">{fmtDateTime(entry.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Last Updated</p>
                    <p className="text-[11px] text-gray-700">{fmtDateTime(entry.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'dispatch' && (
            dispatches.length ? (
              <div className="space-y-2">
                {dispatches.map((d, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono">Job #{d.jobNumber || '—'}</span>
                      <span className="text-sm font-bold text-blue-600 whitespace-nowrap">−{d.quantity}</span>
                    </div>
                    {d.location && <p className="text-[11px] text-gray-600 mt-1">📍 {d.location}</p>}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{fmtDate(d.dispatchDate)}</span>
                      {d.createdByName && <span>by {d.createdByName}</span>}
                    </div>
                    {d.remark && <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{d.remark}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-6">No dispatches recorded</p>
          )}

          {tab === 'returns' && (
            returns.length ? (
              <div className="space-y-2">
                {returns.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700">{fmtDate(r.returnDate)}</p>
                      {r.location && <p className="text-[11px] text-gray-600">📍 {r.location}</p>}
                      {r.createdByName && <p className="text-[10px] text-gray-400">by {r.createdByName}</p>}
                    </div>
                    <span className="text-sm font-bold text-amber-600 whitespace-nowrap">+{r.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-6">No returns recorded</p>
          )}

          {tab === 'activity' && (
            activity.length ? (
              <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
                {activity.map((a, i) => {
                  const m = ACTION_META[a.action] || ACTION_META.updated;
                  return (
                    <li key={i} className="ml-3">
                      <span className={`absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full ${m.dot} ring-2 ring-white`}></span>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${m.color}`}>{m.label}
                          {a.quantity != null && <span className="font-normal text-gray-500"> · {a.quantity}{a.jobNumber ? ` · Job #${a.jobNumber}` : ''}</span>}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDateTime(a.at)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{a.byName || '—'}{a.byRole ? ` (${a.byRole.replace('_', ' ')})` : ''}</p>
                      {a.note && <p className="text-[11px] text-gray-600 mt-0.5">{a.note}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : <p className="text-xs text-gray-400 text-center py-6">No activity yet</p>
          )}
        </div>

        {/* Footer: lifecycle actions */}
        {showActions ? (
          <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
            {showReceive && (
              <button onClick={() => onReceive(entry)} className="w-full px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Confirm Receipt (Received / Not Received)
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {canStock && onDispatch && (
                <button onClick={() => onDispatch(entry)} className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Dispatch
                </button>
              )}
              {canStock && onReturn && (
                <button onClick={() => onReturn(entry)} className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  Return
                </button>
              )}
              {canEdit && onEdit && (
                <button onClick={() => onEdit(entry)} className="px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
              )}
              {admin && onDelete && (
                <button onClick={() => onDelete(entry)} className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          entry.receiptStatus === 'pending' && (
            <div className="px-4 py-2.5 border-t border-gray-200 bg-amber-50 text-amber-800 text-[11px] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Awaiting receipt confirmation by the location manager</span>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default PurchaseDetailPanel;
