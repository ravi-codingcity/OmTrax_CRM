const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Stat = ({ label, value, color }) => (
  <div className="bg-gray-50 rounded-lg p-2 text-center">
    <p className={`text-base font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

// Read-only complete lifecycle (purchase → dispatches → returns) for one entry.
const HistoryModal = ({ entry, onClose }) => {
  const dispatches = [...(entry.dispatches || [])].sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
  const returns = [...(entry.returns || [])].sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">{entry.itemName}</h2>
            <p className="text-[11px] text-gray-500 truncate">{entry.category || '—'} · {entry.supplier || 'No supplier'} · {entry.invoiceNumber || 'No invoice'}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Inventory summary */}
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Purchased" value={entry.quantityPurchased} color="text-gray-800" />
            <Stat label="Dispatched" value={entry.totalDispatched} color="text-blue-600" />
            <Stat label="Returned" value={entry.totalReturned} color="text-amber-600" />
            <Stat label="Available" value={entry.availableStock} color="text-green-600" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Purchase Date: <span className="font-medium text-gray-700">{fmtDate(entry.purchaseDate)}</span></span>
            <span>Unit Price: <span className="font-medium text-gray-700">{inr(entry.unitPrice)}</span></span>
            <span>Total: <span className="font-medium text-gray-700">{inr(entry.totalAmount)}</span></span>
          </div>
          {entry.remarks && <p className="text-xs text-gray-500"><span className="text-gray-400">Remarks:</span> {entry.remarks}</p>}

          {/* Dispatch history */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Dispatch History ({dispatches.length})
            </h3>
            {dispatches.length ? (
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                {dispatches.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-gray-500">{fmtDate(d.dispatchDate)}</span>
                    <span className="text-gray-700 truncate mx-2 flex-1 text-center">{d.location || '—'}</span>
                    <span className="font-semibold text-blue-600">{d.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">No dispatches recorded</p>}
          </div>

          {/* Return history */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Return History ({returns.length})
            </h3>
            {returns.length ? (
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                {returns.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-gray-500">{fmtDate(r.returnDate)}</span>
                    <span className="font-semibold text-amber-600">{r.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">No returns recorded</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
