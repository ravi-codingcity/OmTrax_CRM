import { useState } from 'react';

const FollowUpModal = ({ entry, onClose, onAddFollowUp, mode = 'view', currentUser = null }) => {
  const [newFollowUp, setNewFollowUp] = useState({
    remark: '',
    nextFollowUpDate: '',
    status: entry?.queryStatus || 'Warm',
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newFollowUp.remark && newFollowUp.nextFollowUpDate) {
      onAddFollowUp(entry.id, newFollowUp, currentUser?.name || 'Admin');
      onClose();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Hot: 'bg-red-100 text-red-700',
      Warm: 'bg-amber-100 text-amber-700',
      Cold: 'bg-blue-100 text-blue-700',
      Closed: 'bg-green-100 text-green-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {mode === 'add' ? 'Add Follow-Up' : 'Follow-Up History'}
              </h2>
              <p className="text-indigo-100 text-sm">{entry?.companyName} - {entry?.contactPerson}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-gray-500">Current Status:</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(entry?.queryStatus)}`}>
                {entry?.queryStatus}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Next Follow-up:</span>
              <span className="ml-2 font-medium text-gray-800">{formatDate(entry?.nextFollowUpDate)}</span>
            </div>
          </div>

          {/* Add New Follow-Up Form */}
          {(mode === 'add' || mode === 'both') && (
            <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Follow-Up
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Next Follow-Up Date *</label>
                  <input
                    type="date"
                    value={newFollowUp.nextFollowUpDate}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, nextFollowUpDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Update Status</label>
                  <select
                    value={newFollowUp.status}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Closed">Live</option>
                    <option value="Closed">Closed</option>

                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Remark *</label>
                <textarea
                  value={newFollowUp.remark}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, remark: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter follow-up notes..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add Follow-Up
              </button>
            </form>
          )}

          {/* Follow-Up History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({entry?.followUpHistory?.length || 0} entries)
            </h3>

            {(!entry?.followUpHistory || entry.followUpHistory.length === 0) ? (
              <div className="text-center py-6 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No follow-up history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...entry.followUpHistory].reverse().map((followUp, index) => (
                  <div key={followUp.id || index} className="bg-white border border-gray-200 rounded-lg p-3 relative">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{formatDate(followUp.date)}</span>
                        {followUp.status && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(followUp.status)}`}>
                            {followUp.status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">by {followUp.addedBy}</span>
                    </div>
                    <p className="text-sm text-gray-600">{followUp.remark}</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Next follow-up: {formatDate(followUp.nextFollowUpDate)}
                    </div>
                    {index === 0 && (
                      <div className="absolute -left-1 top-3 w-2 h-2 bg-indigo-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpModal;
