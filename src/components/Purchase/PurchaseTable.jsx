import { stockStatus, canManagePurchase, isCrmAdmin } from '../../config/purchase';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const IconBtn = ({ onClick, title, color, children }) => (
  <button onClick={onClick} title={title} className={`p-1.5 rounded-md transition-colors ${color}`}>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{children}</svg>
  </button>
);

const PurchaseTable = ({ entries, currentUser, onDispatch, onReturn, onHistory, onEdit, onDelete }) => {
  const manage = canManagePurchase(currentUser);
  const admin = isCrmAdmin(currentUser);

  if (!entries.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <p className="text-sm text-gray-500">No purchase entries found</p>
      </div>
    );
  }

  const headCls = 'sticky top-0 z-10 bg-emerald-50 text-emerald-800 border-b border-r border-emerald-200 px-3 py-2.5 font-semibold whitespace-nowrap';
  const cellCls = 'border-b border-r border-gray-200 px-3 py-2.5 align-middle whitespace-nowrap';

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs border-separate border-spacing-0 min-w-[1000px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide">
                <th className={headCls}>Item</th>
                <th className={headCls}>Category</th>
                <th className={headCls}>Supplier</th>
                <th className={headCls}>Purchase Date</th>
                <th className={`${headCls} text-center`}>Qty</th>
                <th className={headCls}>Unit</th>
                <th className={`${headCls} text-right`}>Unit Price</th>
                <th className={`${headCls} text-right`}>Total</th>
                <th className={`${headCls} text-center`}>Dispatched</th>
                <th className={`${headCls} text-center`}>Returned</th>
                <th className={`${headCls} text-center`}>Available</th>
                <th className={`${headCls} text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const st = stockStatus(e.availableStock);
                return (
                  <tr key={e._id} className="even:bg-slate-50/70 hover:bg-emerald-50/50 transition-colors">
                    <td className={`${cellCls} font-medium text-gray-800 max-w-[160px] truncate`} title={e.itemName}>{e.itemName}</td>
                    <td className={`${cellCls} text-gray-600`}>{e.category || '—'}</td>
                    <td className={`${cellCls} text-gray-600 max-w-[120px] truncate`} title={e.supplier}>{e.supplier || '—'}</td>
                    <td className={`${cellCls} text-gray-500 tabular-nums`}>{fmtDate(e.purchaseDate)}</td>
                    <td className={`${cellCls} text-center font-medium text-gray-800 tabular-nums`}>{e.quantityPurchased}</td>
                    <td className={`${cellCls} text-gray-600`}>{e.unit || '—'}</td>
                    <td className={`${cellCls} text-right text-gray-600 tabular-nums`}>{inr(e.unitPrice)}</td>
                    <td className={`${cellCls} text-right font-semibold text-gray-800 tabular-nums`}>{inr(e.totalAmount)}</td>
                    <td className={`${cellCls} text-center text-blue-600 tabular-nums`}>{e.totalDispatched}</td>
                    <td className={`${cellCls} text-center text-amber-600 tabular-nums`}>{e.totalReturned}</td>
                    <td className={`${cellCls} text-center`}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{e.availableStock}</span>
                    </td>
                    <td className={`${cellCls} text-center`}>
                      <div className="flex items-center justify-center gap-0.5">
                        {manage && onDispatch && (
                          <IconBtn onClick={() => onDispatch(e)} title="Dispatch" color="text-blue-600 hover:bg-blue-100">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </IconBtn>
                        )}
                        {manage && onReturn && (
                          <IconBtn onClick={() => onReturn(e)} title="Return" color="text-amber-600 hover:bg-amber-100">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </IconBtn>
                        )}
                        {onHistory && (
                          <IconBtn onClick={() => onHistory(e)} title="History" color="text-gray-500 hover:bg-gray-100">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </IconBtn>
                        )}
                        {manage && onEdit && (
                          <IconBtn onClick={() => onEdit(e)} title="Edit" color="text-emerald-600 hover:bg-emerald-100">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </IconBtn>
                        )}
                        {admin && onDelete && (
                          <IconBtn onClick={() => onDelete(e)} title="Delete" color="text-red-600 hover:bg-red-100">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {entries.map((e) => {
          const st = stockStatus(e.availableStock);
          return (
            <div key={e._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{e.itemName}</p>
                  <p className="text-xs text-gray-500 truncate">{e.category || '—'} · {e.supplier || 'No supplier'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{st.label}</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-gray-800">{e.quantityPurchased}</p><p className="text-[9px] text-gray-500">Purchased</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-blue-600">{e.totalDispatched}</p><p className="text-[9px] text-gray-500">Dispatched</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-amber-600">{e.totalReturned}</p><p className="text-[9px] text-gray-500">Returned</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-green-600">{e.availableStock}</p><p className="text-[9px] text-gray-500">Available</p></div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
                <span>{fmtDate(e.purchaseDate)}</span>
                <span>{inr(e.totalAmount)}</span>
                {e.invoiceNumber && <span>#{e.invoiceNumber}</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5 border-t border-gray-100 pt-2">
                {manage && onDispatch && <button onClick={() => onDispatch(e)} className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md py-1.5">Dispatch</button>}
                {manage && onReturn && <button onClick={() => onReturn(e)} className="flex-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-md py-1.5">Return</button>}
                {onHistory && <button onClick={() => onHistory(e)} className="flex-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md py-1.5">History</button>}
                {manage && onEdit && <button onClick={() => onEdit(e)} className="flex-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md py-1.5">Edit</button>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PurchaseTable;
