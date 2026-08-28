import { kycStatusMeta, kycDepartmentShort, isAwaitingFinance, fmtDate } from '../../config/finance';

/**
 * Shared vendor register table, used by both Purchase and Finance.
 *
 * Callbacks double as permission switches, matching the convention in
 * SalesTable/PurchaseTable: a page passes only the actions its user may perform.
 */
const VendorTable = ({
  vendors,
  onView = null,
  onEdit = null,
  onReview = null,
  onDelete = null,
  emptyMessage = 'No vendors found',
}) => {
  const showActions = !!(onView || onEdit || onReview || onDelete);

  if (!vendors.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-500 mt-3 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const headCls = 'sticky top-0 z-10 bg-amber-50 text-amber-900 border-b border-r border-amber-200 px-3 py-2.5 font-semibold text-left';
  const cellCls = 'border-b border-r border-gray-200 px-3 py-2.5 align-middle';

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1020px] text-xs">
            <thead>
              <tr>
                <th className={headCls}>Vendor</th>
                <th className={headCls}>Contact</th>
                <th className={headCls}>GST / PAN</th>
                <th className={`${headCls} text-center`}>Items</th>
                <th className={`${headCls} text-center`}>Docs</th>
                <th className={headCls}>KYC Status</th>
                <th className={headCls}>KYC Department</th>
                <th className={headCls}>Submitted</th>
                <th className={headCls}>Finance Review</th>
                {showActions && <th className={`${headCls} text-center`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const meta = kycStatusMeta(v.kycStatus);
                const pending = isAwaitingFinance(v);
                return (
                  <tr
                    key={v._id}
                    // Vendors waiting on Finance are highlighted so Purchase can spot them
                    className={pending ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50'}
                  >
                    <td className={cellCls}>
                      <div className="flex items-start gap-2">
                        {pending && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Awaiting Finance approval" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{v.vendorName}</p>
                          {v.companyName && <p className="text-gray-500 truncate">{v.companyName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={cellCls}>
                      <p className="text-gray-700 truncate">{v.contactPerson || '—'}</p>
                      <p className="text-gray-500 truncate">{v.phone || v.email || ''}</p>
                    </td>
                    <td className={`${cellCls} font-mono text-[11px]`}>
                      <p className="text-gray-700">{v.gstNumber || '—'}</p>
                      <p className="text-gray-500">{v.panNumber || ''}</p>
                    </td>
                    <td className={`${cellCls} text-center text-gray-700`}>{(v.materials || []).length + (v.services || []).length}</td>
                    <td className={`${cellCls} text-center text-gray-700`}>{(v.kycDocuments || []).length}</td>
                    <td className={cellCls}>
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className={cellCls}>{kycDepartmentShort(v.kycType)}</td>
                    <td className={cellCls}>{fmtDate(v.kycSubmittedAt)}</td>
                    <td className={cellCls}>
                      {v.financeReview?.decision ? (
                        <>
                          <p className={`font-medium ${v.financeReview.decision === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                            {v.financeReview.decision === 'approved' ? 'Approved' : 'Rejected'}
                          </p>
                          <p className="text-gray-500">{fmtDate(v.financeReview.reviewedAt)}</p>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {showActions && (
                      <td className={`${cellCls} text-center whitespace-nowrap`}>
                        <div className="flex items-center justify-center gap-1">
                          {onView && (
                            <button onClick={() => onView(v)} title="View details"
                              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          {onReview && ['submitted', 'under_review'].includes(v.kycStatus) && (
                            <button onClick={() => onReview(v)} title="Review KYC"
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700">
                              Review
                            </button>
                          )}
                          {onEdit && (
                            <button onClick={() => onEdit(v)} title="Edit vendor"
                              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(v)} title="Delete vendor"
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
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
      <div className="md:hidden space-y-2">
        {vendors.map((v) => {
          const meta = kycStatusMeta(v.kycStatus);
          const pending = isAwaitingFinance(v);
          return (
            <div key={v._id}
              className={`bg-white rounded-xl shadow-sm border p-3 ${pending ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{v.vendorName}</p>
                  {v.companyName && <p className="text-xs text-gray-500 truncate">{v.companyName}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${meta.badge}`}>
                  {meta.label}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <div><span className="text-gray-400">Contact:</span> {v.contactPerson || '—'}</div>
                <div><span className="text-gray-400">Department:</span> {kycDepartmentShort(v.kycType)}</div>
                <div><span className="text-gray-400">GST:</span> <span className="font-mono">{v.gstNumber || '—'}</span></div>
                <div><span className="text-gray-400">Submitted:</span> {fmtDate(v.kycSubmittedAt)}</div>
                <div><span className="text-gray-400">Materials:</span> {(v.materials || []).length + (v.services || []).length}</div>
                <div><span className="text-gray-400">Docs:</span> {(v.kycDocuments || []).length}</div>
              </div>
              {showActions && (
                <div className="mt-2.5 flex gap-1.5">
                  {onView && (
                    <button onClick={() => onView(v)} className="flex-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md py-1.5">View</button>
                  )}
                  {onReview && ['submitted', 'under_review'].includes(v.kycStatus) && (
                    <button onClick={() => onReview(v)} className="flex-1 text-xs font-semibold text-white bg-amber-600 rounded-md py-1.5">Review</button>
                  )}
                  {onEdit && (
                    <button onClick={() => onEdit(v)} className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md py-1.5">Edit</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default VendorTable;
