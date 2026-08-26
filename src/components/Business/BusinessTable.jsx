import { useState } from 'react';

const BusinessTable = ({
  entries,
  showSalesPerson = true,
  onEdit = null,
  onDelete = null,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, entry: null });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const getSalesPersonName = (entry) =>
    entry.salesPersonName || entry.salesPerson?.name || 'Unknown';

  const handleDeleteClick = (entry) => setDeleteConfirm({ show: true, entry });
  const handleDeleteCancel = () => setDeleteConfirm({ show: false, entry: null });
  const handleDeleteConfirm = async () => {
    if (deleteConfirm.entry && onDelete) await onDelete(deleteConfirm.entry);
    setDeleteConfirm({ show: false, entry: null });
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-500">No Business Entries Found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Job Number</th>
                <th className="px-4 py-3 text-right">Estimate (₹)</th>
                {showSalesPerson && <th className="px-4 py-3">Salesperson</th>}
                <th className="px-4 py-3">Remarks</th>
                {(onEdit || onDelete) && <th className="px-4 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(entry.entryDate || entry.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{entry.client}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                      {entry.jobNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(entry.estimateAmount)}</td>
                  {showSalesPerson && <td className="px-4 py-3 text-gray-600">{getSalesPersonName(entry)}</td>}
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={entry.remarks}>{entry.remarks || '-'}</td>
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(entry)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <div key={entry._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{entry.client}</p>
                <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                  {entry.jobNumber}
                </span>
              </div>
              <p className="font-bold text-gray-800 whitespace-nowrap">{formatCurrency(entry.estimateAmount)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{formatDate(entry.entryDate || entry.createdAt)}</span>
              {showSalesPerson && <span className="font-medium text-gray-600">{getSalesPersonName(entry)}</span>}
            </div>
            {entry.remarks && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{entry.remarks}</p>}
            {(onEdit || onDelete) && (
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(entry)}
                    className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg py-1.5 hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDeleteClick(entry)}
                    className="flex-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg py-1.5 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleDeleteCancel}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Business Entry</h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete the entry for <span className="font-semibold">{deleteConfirm.entry?.client}</span> (Job #{deleteConfirm.entry?.jobNumber})? This cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={handleDeleteCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessTable;
