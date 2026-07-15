import { stockStatus, canManagePurchase, formatQuantity, canModifyEntry, creatorName, creatorBranch } from '../../config/purchase';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Compact icon-only entry point into the record view (tooltip on hover).
const RecordButton = ({ onClick, locked }) => (
  <button
    onClick={onClick}
    title={locked ? 'View record (read-only)' : 'View record & actions'}
    aria-label="View record"
    className="p-1.5 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors relative"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    {locked && (
      <span className="absolute -top-1 -right-1 bg-white rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </span>
    )}
  </button>
);

// Fixed-width columns so the table always fits the page (no horizontal scroll)
const COLS = ['5%', '18%', '10%', '11%', '8%', '9%', '7%', '9%', '5%', '5%', '8%'];

const PurchaseTable = ({ entries, currentUser, onOpenDetails }) => {
  const manage = canManagePurchase(currentUser);
  const showActions = !!onOpenDetails;

  if (!entries.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <p className="text-sm text-gray-500">No purchase entries found</p>
      </div>
    );
  }

  const headCls = 'sticky top-0 z-10 bg-emerald-50 text-emerald-800 border-b border-r border-emerald-200 px-2 py-2.5 font-semibold';
  const cellCls = 'border-b border-r border-gray-200 px-2 py-2 align-middle';

  return (
    <>
      {/* Desktop: fixed-layout table, fits the page width */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto overflow-x-hidden max-h-[70vh]">
          <table className="w-full table-fixed text-xs border-separate border-spacing-0">
            <colgroup>
              {COLS.map((w, i) => <col key={i} style={{ width: w }} />)}
              {showActions && <col style={{ width: '5%' }} />}
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide">
                <th className={headCls}>User</th>
                <th className={headCls}>Item</th>
                <th className={headCls}>Location</th>
                <th className={headCls}>Supplier</th>
                <th className={headCls}>Date</th>
                <th className={`${headCls} text-center`}>Qty</th>
                <th className={`${headCls} text-right`}>Price</th>
                <th className={`${headCls} text-right`}>Total</th>
                <th className={`${headCls} text-center`} title="Dispatched">Disp.</th>
                <th className={`${headCls} text-center`} title="Returned">Ret.</th>
                <th className={`${headCls} text-center`} title="Available Stock">Avail.</th>
                {showActions && <th className={`${headCls} text-center`}>Record</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const st = stockStatus(e.availableStock);
                const locked = manage && !canModifyEntry(currentUser, e);
                const branch = creatorBranch(e);
                return (
                  <tr key={e._id} className="even:bg-slate-50/70 hover:bg-emerald-50/50 transition-colors">
                    {/* User: full name + branch below */}
                    <td className={cellCls}>
                      <p className="text-xs font-medium text-gray-800 truncate" title={creatorName(e)}>{creatorName(e)}</p>
                      {branch && <p className="text-[10px] text-gray-400 truncate" title={branch}>{branch}</p>}
                    </td>
                    <td className={`${cellCls} font-medium text-gray-800 truncate`} title={e.itemName}>{e.itemName}</td>
                    <td className={`${cellCls} text-gray-600 truncate`} title={e.storageLocation}>{e.storageLocation || '—'}</td>
                    <td className={`${cellCls} text-gray-600 truncate`} title={e.supplier}>{e.supplier || '—'}</td>
                    <td className={`${cellCls} text-gray-500 tabular-nums whitespace-nowrap`}>{fmtDate(e.purchaseDate)}</td>
                    <td className={`${cellCls} text-center font-medium text-gray-800 truncate`} title={formatQuantity(e.quantityPurchased, e.unit)}>
                      {formatQuantity(e.quantityPurchased, e.unit)}
                    </td>
                    <td className={`${cellCls} text-right text-gray-600 tabular-nums truncate`}>{inr(e.unitPrice)}</td>
                    <td className={`${cellCls} text-right font-semibold text-gray-800 tabular-nums truncate`}>{inr(e.totalAmount)}</td>
                    <td className={`${cellCls} text-center text-blue-600 tabular-nums`}>{e.totalDispatched}</td>
                    <td className={`${cellCls} text-center text-amber-600 tabular-nums`}>{e.totalReturned}</td>
                    <td className={`${cellCls} text-center`}>
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{e.availableStock}</span>
                    </td>
                    {showActions && (
                      <td className={`${cellCls} text-center`}>
                        <RecordButton onClick={() => onOpenDetails(e)} locked={locked} />
                      </td>
                    )}
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
          const locked = manage && !canModifyEntry(currentUser, e);
          const branch = creatorBranch(e);
          return (
            <div key={e._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{e.itemName}</p>
                  <p className="text-xs text-gray-500 truncate">{e.storageLocation || 'No location'} · {e.supplier || 'No supplier'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{st.label}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-gray-600">
                <span className="font-medium text-gray-800">{formatQuantity(e.quantityPurchased, e.unit)}</span> purchased · {inr(e.totalAmount)}
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">
                <span className="font-medium text-gray-700">{creatorName(e)}</span>
                {branch && <span className="text-gray-400"> · {branch}</span>}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-gray-800">{e.quantityPurchased}</p><p className="text-[9px] text-gray-500">Purchased</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-blue-600">{e.totalDispatched}</p><p className="text-[9px] text-gray-500">Dispatched</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-amber-600">{e.totalReturned}</p><p className="text-[9px] text-gray-500">Returned</p></div>
                <div className="bg-gray-50 rounded py-1"><p className="text-[13px] font-bold text-green-600">{e.availableStock}</p><p className="text-[9px] text-gray-500">Available</p></div>
              </div>
              {showActions && (
                <div className="mt-2.5 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => onOpenDetails(e)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md py-2 hover:bg-emerald-100"
                  >
                    {locked && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    View Record
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PurchaseTable;
