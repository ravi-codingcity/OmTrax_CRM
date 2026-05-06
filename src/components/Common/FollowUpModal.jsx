import { useState, useEffect } from 'react';
import { followUpAPI } from '../../services/api';

const FollowUpModal = ({ entry, onClose, onAddFollowUp, mode = 'view', currentUser = null }) => {
  const [newFollowUp, setNewFollowUp] = useState({
    remark: '',
    nextFollowUpDate: '',
    status: entry?.queryStatus || 'Warm',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Format date from ISO or YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
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

  // Capitalize first letter for status display
  const capitalizeStatus = (status) => {
    if (!status) return '-';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Get the name of who added the follow-up
  const getAddedByName = (followUp) => {
    if (followUp.addedByName) return followUp.addedByName;
    if (typeof followUp.addedBy === 'object' && followUp.addedBy?.name) return followUp.addedBy.name;
    if (typeof followUp.addedBy === 'string' && followUp.addedBy.length > 20) return 'User'; // It's an ObjectId
    return followUp.addedBy || 'Unknown';
  };

  // Check if followUpHistory contains actual objects or just IDs
  const isPopulatedArray = (arr) => {
    if (!arr || arr.length === 0) return false;
    // If first item is a string (ObjectId), it's not populated
    return typeof arr[0] === 'object' && arr[0] !== null;
  };

  // Fetch follow-up history when modal opens
  useEffect(() => {
    const fetchFollowUpHistory = async () => {
      const entryId = entry?._id || entry?.id;
      console.log('Fetching follow-ups for entry:', entryId);
      
      if (!entryId) {
        console.log('No entry ID found');
        return;
      }

      let historyData = [];

      // Check if entry already has POPULATED follow-up history (not just IDs)
      if (isPopulatedArray(entry?.followUpHistory)) {
        console.log('Using populated followUpHistory:', entry.followUpHistory);
        historyData = [...entry.followUpHistory];
      } else if (isPopulatedArray(entry?.followUps)) {
        console.log('Using populated followUps:', entry.followUps);
        historyData = [...entry.followUps];
      } else {
        // followUpHistory contains only IDs or is empty - fetch from API
        setLoadingHistory(true);
        try {
          console.log('Calling API: /follow-ups/sales/' + entryId);
          const response = await followUpAPI.getBySalesEntry(entryId);
          console.log('API Response:', response);
          const data = response.data?.data || response.data || [];
          console.log('Parsed follow-up data:', data);
          historyData = Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Error fetching follow-up history:', error);
          console.error('Error response:', error.response?.data);
          historyData = [];
        }
        setLoadingHistory(false);
      }

      setFollowUpHistory(historyData);
    };

    fetchFollowUpHistory();
  }, [entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newFollowUp.remark && newFollowUp.nextFollowUpDate) {
      setIsSubmitting(true);
      try {
        const followUpPayload = {
          ...newFollowUp,
          status: newFollowUp.status?.toLowerCase(), // Convert to lowercase for backend
          addedBy: currentUser?._id || currentUser?.id,
          addedByName: currentUser?.name || currentUser?.username,
        };
        console.log('Follow-up payload:', followUpPayload);
        console.log('Current user:', currentUser);
        console.log('Entry ID:', entry._id || entry.id);
        await onAddFollowUp(entry._id || entry.id, followUpPayload);
        onClose();
      } catch (error) {
        console.error('Error adding follow-up:', error);
        console.error('Error response:', error.response?.data);
      }
      setIsSubmitting(false);
    }
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
    };
    return badges[normalizedStatus] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-3 sm:px-5 py-3 sm:py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <h2 className="text-base sm:text-lg font-semibold">
                {mode === 'add' ? 'Add Follow-Up' : 'Follow-Up History'}
              </h2>
              <p className="text-indigo-100 text-xs sm:text-sm truncate">{entry?.companyName} - {entry?.contactPerson}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs sm:text-sm">
              <span className="text-gray-500">Current Status:</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(entry?.queryStatus)}`}>
                {capitalizeStatus(entry?.queryStatus)}
              </span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="text-gray-500">Next Follow-up:</span>
              <span className="ml-2 font-medium text-gray-800">{formatDate(entry?.nextFollowUpDate)}</span>
            </div>
          </div>

          {/* Add New Follow-Up Form */}
          {(mode === 'add' || mode === 'both') && (
            <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 border border-blue-100">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Follow-Up
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Next Follow-Up Date *</label>
                  <input
                    type="date"
                    value={newFollowUp.nextFollowUpDate}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, nextFollowUpDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Update Status</label>
                  <select
                    value={newFollowUp.status}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, status: e.target.value })}
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>

                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Remark *</label>
                <textarea
                  value={newFollowUp.remark}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, remark: e.target.value })}
                  rows={2}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter follow-up notes..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Follow-Up'
                )}
              </button>
            </form>
          )}

          {/* Follow-Up History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({followUpHistory.length + (entry?.remark ? 1 : 0)} entries)
            </h3>

            {loadingHistory ? (
              <div className="text-center py-6 text-gray-400">
                <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm">Loading history...</p>
              </div>
            ) : followUpHistory.length === 0 && !entry?.remark ? (
              <div className="text-center py-6 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No follow-up history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Actual follow-ups from API, sorted newest first */}
                {[...followUpHistory]
                  .sort((a, b) => {
                    const dateA = new Date(a.followUpDate || a.createdAt || a.date || 0);
                    const dateB = new Date(b.followUpDate || b.createdAt || b.date || 0);
                    return dateB - dateA;
                  })
                  .map((followUp, index) => {
                    const isLatest = index === 0;
                    return (
                      <div
                        key={followUp._id || followUp.id || index}
                        className={`bg-white border rounded-lg p-3 relative ${
                          isLatest
                            ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200'
                            : 'border-gray-200'
                        }`}
                      >
                        {isLatest && (
                          <div className="absolute -top-2 left-3 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-semibold rounded-full">
                            Latest
                          </div>
                        )}
                        <div className={`flex items-start justify-between mb-2 ${isLatest ? 'mt-1' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-800">{formatDate(followUp.followUpDate || followUp.createdAt || followUp.date)}</span>
                            {followUp.status && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(followUp.status)}`}>
                                {capitalizeStatus(followUp.status)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">by {getAddedByName(followUp)}</span>
                        </div>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {followUp.remark || '-'}
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          Next follow-up: {formatDate(followUp.nextFollowUpDate)}
                        </div>
                        {isLatest && (
                          <div className="absolute -left-1 top-6 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}

                {/* Initial Entry — always shown at the bottom from entry.remark */}
                {entry?.remark && (
                  <div className="bg-white border border-green-300 rounded-lg p-3 relative" style={{backgroundColor: 'rgb(240 253 244 / 0.5)'}}>
                    <div className="absolute -top-2 left-3 px-2 py-0.5 bg-green-600 text-white text-[10px] font-semibold rounded-full">
                      Initial Entry
                    </div>
                    <div className="flex items-start justify-between mb-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{formatDate(entry.createdAt || entry.date)}</span>
                        {entry.queryStatus && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(entry.queryStatus)}`}>
                            {capitalizeStatus(entry.queryStatus)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">by {entry.salesPersonName || entry.salesPerson?.name || 'Sales Person'}</span>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {entry.remark}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Next follow-up: {formatDate(entry.nextFollowUpDate)}
                    </div>
                  </div>
                )}
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
