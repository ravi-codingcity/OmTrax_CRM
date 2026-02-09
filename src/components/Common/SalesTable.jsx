const SalesTable = ({ entries, showSalesPerson = true, onEdit = null, onViewFollowUp = null, onAddFollowUp = null }) => {
  // Format date from ISO or YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Handle ISO date format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    // Fallback for YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Get salesperson name from entry (handles both populated and non-populated)
  const getSalesPersonName = (entry) => {
    if (entry.salesPersonName) return entry.salesPersonName;
    if (entry.salesPerson?.name) return entry.salesPerson.name;
    return 'Unknown';
  };

  // Get follow-up count
  const getFollowUpCount = (entry) => {
    if (entry.followUpHistory?.length) return entry.followUpHistory.length;
    if (entry.followUps?.length) return entry.followUps.length;
    return 0;
  };

  // Capitalize first letter for status display
  const capitalizeStatus = (status) => {
    if (!status) return '-';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = capitalizeStatus(status);
    const badges = {
      Hot: 'bg-red-100 text-red-700',
      Warm: 'bg-amber-100 text-amber-700',
      Cold: 'bg-blue-100 text-blue-700',
      Closed: 'bg-green-100 text-green-700',
      New: 'bg-purple-100 text-purple-700',
      Active: 'bg-teal-100 text-teal-700',
      Live: 'bg-emerald-100 text-emerald-700',
    };
    return badges[normalizedStatus] || 'bg-gray-100 text-gray-700';
  };

  const getRequirementBadge = (req) => {
    const badges = {
      Relocation: 'bg-purple-100 text-purple-700',
      HR: 'bg-indigo-100 text-indigo-700',
      'Real Estate': 'bg-teal-100 text-teal-700',
    };
    return badges[req] || 'bg-gray-100 text-gray-700';
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-500 mt-3">No sales entries found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Date</th>
            {showSalesPerson && (
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Sales Rep</th>
            )}
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Company</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Contact Person</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Requirement</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Remark</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Next Follow-up</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Status</th>
            {(onEdit || onViewFollowUp || onAddFollowUp) && (
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 w-28">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry._id || entry.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle whitespace-nowrap">{formatDate(entry.createdAt || entry.date)}</td>
              {showSalesPerson && (
                <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                  <p className="text-xs font-medium text-red-600">{getSalesPersonName(entry)}</p>
                  <p className="text-xs text-gray-500">{entry.branch}</p>
                </td>
              )}
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs font-semibold text-gray-900">{entry.companyName}</p>
                <p className="text-xs text-gray-500">{entry.location}</p>
              </td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs font-medium text-gray-800">{entry.contactPerson}</p>
                <p className="text-xs text-gray-500">{entry.designation}</p>
                <p className="text-xs text-blue-600">{entry.contactEmail}</p>
                 <p className="text-xs text-blue-600">{entry.contactNumber}</p>
              </td>
          
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRequirementBadge(entry.requirement)}`}>
                  {entry.requirement}
                </span>
              </td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs text-gray-600 line-clamp-2 max-w-[160px]" title={entry.remark}>{entry.remark || '-'}</p>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle whitespace-nowrap">{formatDate(entry.nextFollowUpDate)}</td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(entry.queryStatus)}`}>
                  {capitalizeStatus(entry.queryStatus)}
                </span>
              </td>
              {(onEdit || onViewFollowUp || onAddFollowUp) && (
                <td className="px-3 py-2.5 border-b border-gray-200 align-middle text-center">
                  <div className="flex items-center justify-center gap-1">
                    {onViewFollowUp && (
                      <button
                        onClick={() => onViewFollowUp(entry)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors relative"
                        title="View Follow-ups"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {getFollowUpCount(entry) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] rounded-full h-3.5 w-3.5 flex items-center justify-center">
                            {getFollowUpCount(entry)}
                          </span>
                        )}
                      </button>
                    )}
                    {onAddFollowUp && (
                      <button
                        onClick={() => onAddFollowUp(entry)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Add Follow-up"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(entry)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
  );
};

export default SalesTable;
