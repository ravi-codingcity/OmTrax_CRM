import { useState } from 'react';
import { feedbackTextColor, canManageHr, isHrAdmin } from '../../config/hr';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const feedbackText = (v) => (
  <span className={`font-semibold ${feedbackTextColor(v)}`}>{v || 'Feedback Pending'}</span>
);

// Column definitions drive the fixed-layout table so it always fits the width.
const COLUMNS = [
  { key: 'salesPersonName', label: 'Sales', width: '9%', cls: 'text-gray-700 truncate', render: (e) => e.salesPersonName || '—', title: true },
  { key: 'positionReceivedDate', label: 'Pos. Recvd', width: '8%', cls: 'text-gray-500 tabular-nums', render: (e) => fmtDate(e.positionReceivedDate) },
  { key: 'assignDate', label: 'Assigned', width: '8%', cls: 'text-gray-500 tabular-nums', render: (e) => fmtDate(e.assignDate) },
  { key: 'recruiterName', label: 'Recruiter', width: '9%', cls: 'font-medium text-gray-800 truncate', render: (e) => e.recruiterName || '—', title: true },
  { key: 'clientName', label: 'Client', width: '12%', cls: 'text-gray-700 truncate', render: (e) => e.clientName, title: true },
  { key: 'position', label: 'Position', width: '12%', cls: 'font-medium text-gray-800 truncate', render: (e) => e.position, title: true },
  { key: 'cvSubmissionDate', label: 'CV Date', width: '8%', cls: 'text-gray-500 tabular-nums', render: (e) => fmtDate(e.cvSubmissionDate) },
  { key: 'cvsSubmitted', label: 'CVs', width: '5%', align: 'center', cls: 'text-center font-semibold text-gray-800 tabular-nums', render: (e) => e.cvsSubmitted ?? 0 },
  { key: 'feedback', label: 'Feedback', width: '11%', render: (e) => feedbackText(e.feedback) },
];

const RecruitmentTable = ({ entries, currentUser, onEdit, onReassign, onDelete }) => {
  const manage = canManageHr(currentUser);
  const admin = isHrAdmin(currentUser);
  const showActions = !!(onEdit || onReassign || onDelete);
  const [viewRemark, setViewRemark] = useState(null);

  if (!entries.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <p className="text-sm text-gray-500">No positions found</p>
      </div>
    );
  }

  const headCls = 'sticky top-0 z-10 bg-blue-50 text-blue-700 border-b border-r border-blue-200 px-3 py-2.5 font-semibold';
  const cellCls = 'border-b border-r border-gray-200 px-3 py-2.5 align-middle';

  const EyeBtn = ({ entry }) => (
    <button
      type="button"
      onClick={() => setViewRemark(entry)}
      title="View full remark"
      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex-shrink-0 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
  );

  return (
    <>
      {/* Desktop / tablet: fixed-layout grid table (no horizontal scroll) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto overflow-x-hidden max-h-[70vh]">
          <table className="w-full table-fixed text-xs border-separate border-spacing-0">
            <colgroup>
              {COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
              <col style={{ width: '10%' }} />
              {showActions && <col style={{ width: '8%' }} />}
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`${headCls} ${c.align === 'center' ? 'text-center' : ''}`}>{c.label}</th>
                ))}
                <th className={headCls}>Remarks</th>
                {showActions && <th className={`${headCls} text-center`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} className="even:bg-slate-50/70 hover:bg-blue-50/60 transition-colors">
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`${cellCls} ${c.cls || ''}`}
                      title={c.title ? (c.render(e) === '—' ? '' : String(c.render(e))) : undefined}
                    >
                      {c.render(e)}
                    </td>
                  ))}
                  {/* Remarks */}
                  <td className={cellCls}>
                    {e.remarks ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate text-gray-500">{e.remarks}</span>
                        <EyeBtn entry={e} />
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {showActions && (
                    <td className={`${cellCls} text-center`}>
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <button onClick={() => onEdit(e)} title="Edit" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {manage && onReassign && (
                          <button onClick={() => onReassign(e)} title="Reassign recruiter" className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </button>
                        )}
                        {admin && onDelete && (
                          <button onClick={() => onDelete(e)} title="Delete" className="p-1.5 rounded-md text-red-600 hover:bg-red-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: compact cards */}
      <div className="md:hidden space-y-2.5">
        {entries.map((e) => (
          <div key={e._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{e.position}</p>
                <p className="text-xs text-gray-500 truncate">{e.clientName}</p>
              </div>
              {feedbackText(e.feedback)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span>Recruiter: <span className="font-medium text-gray-700">{e.recruiterName || '—'}</span></span>
              <span>Sales: <span className="font-medium text-gray-700">{e.salesPersonName || '—'}</span></span>
              <span>Assigned: <span className="font-medium text-gray-700">{fmtDate(e.assignDate)}</span></span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span>Pos. Received: <span className="font-medium text-gray-700">{fmtDate(e.positionReceivedDate)}</span></span>
              <span>CV Date: <span className="font-medium text-gray-700">{fmtDate(e.cvSubmissionDate)}</span></span>
              <span>CVs: <span className="font-medium text-gray-700">{e.cvsSubmitted ?? 0}</span></span>
            </div>
            {e.remarks && (
              <div className="mt-2 flex items-start gap-1.5">
                <p className="text-[11px] text-gray-500 line-clamp-2 flex-1"><span className="text-gray-400">Remarks:</span> {e.remarks}</p>
                <button onClick={() => setViewRemark(e)} className="text-[11px] font-medium text-blue-600 flex-shrink-0 whitespace-nowrap">View</button>
              </div>
            )}
            {showActions && (
              <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
                {onEdit && (
                  <button onClick={() => onEdit(e)} className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md py-1.5 hover:bg-blue-100">Edit</button>
                )}
                {manage && onReassign && (
                  <button onClick={() => onReassign(e)} className="flex-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md py-1.5 hover:bg-indigo-100">Reassign</button>
                )}
                {admin && onDelete && (
                  <button onClick={() => onDelete(e)} className="flex-1 text-xs font-medium text-red-600 bg-red-50 rounded-md py-1.5 hover:bg-red-100">Delete</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Remark view modal */}
      {viewRemark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewRemark(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate">Remark</h3>
                <p className="text-[11px] text-gray-500 truncate">{viewRemark.position} @ {viewRemark.clientName}</p>
              </div>
              <button onClick={() => setViewRemark(null)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{viewRemark.remarks}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecruitmentTable;
