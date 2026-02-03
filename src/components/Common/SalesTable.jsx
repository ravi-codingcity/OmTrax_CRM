const SalesTable = ({ entries, showSalesPerson = true, onEdit = null }) => {
  const getStatusBadge = (status) => {
    const badges = {
      Hot: 'bg-red-100 text-red-700',
      Warm: 'bg-amber-100 text-amber-700',
      Cold: 'bg-blue-100 text-blue-700',
      Closed: 'bg-green-100 text-green-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
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
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Phone</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Location</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Type</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Remark</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Follow-up</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b-2 border-r border-gray-300">Status</th>
            {onEdit && (
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b-2 border-gray-300 w-16">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle whitespace-nowrap">{entry.date}</td>
              {showSalesPerson && (
                <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                  <p className="text-xs font-medium text-gray-800">{entry.salesPersonName}</p>
                  <p className="text-xs text-gray-500">{entry.branch}</p>
                </td>
              )}
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs font-semibold text-gray-900">{entry.companyName}</p>
              </td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs font-medium text-gray-800">{entry.contactPerson}</p>
                <p className="text-xs text-gray-500">{entry.designation}</p>
                <p className="text-xs text-blue-600">{entry.contactEmail}</p>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle whitespace-nowrap">{entry.contactNumber}</td>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle">{entry.location}</td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRequirementBadge(entry.requirement)}`}>
                  {entry.requirement === 'Real Estate' ? 'RE' : entry.requirement}
                </span>
              </td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle">
                <p className="text-xs text-gray-600 line-clamp-2 max-w-[160px]" title={entry.remark}>{entry.remark || '-'}</p>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-r border-gray-200 align-middle whitespace-nowrap">{entry.nextFollowUpDate}</td>
              <td className="px-3 py-2.5 border-b border-r border-gray-200 align-middle text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(entry.queryStatus)}`}>
                  {entry.queryStatus}
                </span>
              </td>
              {onEdit && (
                <td className="px-3 py-2.5 border-b border-gray-200 align-middle text-center">
                  <button
                    onClick={() => onEdit(entry)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit Entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
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
