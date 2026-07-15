import { useState } from 'react';
import { stockStatus, formatQuantity, canModifyEntry, isCrmAdmin, createdByLabel } from '../../config/purchase';

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
const PurchaseDetailPanel = ({ entry, currentUser, onClose, onDispatch, onReturn, onEdit, onDelete }) => {
  const [tab, setTab] = useState('details');

  const st = stockStatus(entry.availableStock);
  const canModify = canModifyEntry(currentUser, entry);
  const admin = isCrmAdmin(currentUser);

  const dispatches = [...(entry.dispatches || [])].sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
  const returns = [...(entry.returns || [])].sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  const jobNumbers = [...new Set(dispatches.map((d) => d.jobNumber).filter(Boolean))];
  const showActions = onDispatch || onReturn || onEdit || onDelete;

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'dispatch', label: `Dispatch (${dispatches.length})` },
    { key: 'returns', label: `Returns (${returns.length})` },
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800 truncate">{entry.itemName}</h2>
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
                      {r.createdByName && <p className="text-[10px] text-gray-400">by {r.createdByName}</p>}
                    </div>
                    <span className="text-sm font-bold text-amber-600 whitespace-nowrap">+{r.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-6">No returns recorded</p>
          )}
        </div>

        {/* Footer: actions or read-only notice */}
        {showActions && (
          canModify ? (
            <div className="grid grid-cols-2 gap-2 px-4 py-3 border-t border-gray-200 bg-white">
              {onDispatch && (
                <button onClick={() => onDispatch(entry)} className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Dispatch
                </button>
              )}
              {onReturn && (
                <button onClick={() => onReturn(entry)} className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  Return
                </button>
              )}
              {onEdit && (
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
          ) : (
            <div className="px-4 py-2.5 border-t border-gray-200 bg-amber-50 text-amber-800 text-[11px] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>View only — created by <b>{createdByLabel(entry)}</b></span>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default PurchaseDetailPanel;
