import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';

const MyEntries = () => {
  const { user } = useAuth();
  const { getSalesEntriesByUser, updateSalesEntry } = useSales();
  const myEntries = getSalesEntriesByUser(user.id);

  const [filter, setFilter] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const filteredEntries = filter
    ? myEntries.filter((e) => e.queryStatus === filter)
    : myEntries;

  const stats = {
    total: myEntries.length,
    hot: myEntries.filter((e) => e.queryStatus === 'Hot').length,
    warm: myEntries.filter((e) => e.queryStatus === 'Warm').length,
    cold: myEntries.filter((e) => e.queryStatus === 'Cold').length,
    closed: myEntries.filter((e) => e.queryStatus === 'Closed').length,
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      companyName: entry.companyName,
      contactPerson: entry.contactPerson,
      contactNumber: entry.contactNumber,
      contactEmail: entry.contactEmail,
      designation: entry.designation,
      requirement: entry.requirement,
      location: entry.location,
      remark: entry.remark,
      nextFollowUpDate: entry.nextFollowUpDate,
      queryStatus: entry.queryStatus,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    updateSalesEntry(editingEntry.id, editFormData);
    setEditingEntry(null);
    setSuccessMessage('Entry updated successfully!');
    setIsSubmitting(false);
    
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCloseModal = () => {
    setEditingEntry(null);
    setEditFormData({});
  };

  const inputClasses = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Entries</h1>
            <p className="text-gray-500 text-sm mt-1">View and manage your sales entries</p>
          </div>
          <a
            href="/sales/new-entry"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </a>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <button
            onClick={() => setFilter('')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === '' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs font-medium mt-1">Total</p>
          </button>
          <button
            onClick={() => setFilter('Hot')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'Hot' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.hot}</p>
            <p className="text-xs font-medium mt-1">Hot</p>
          </button>
          <button
            onClick={() => setFilter('Warm')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'Warm' ? 'bg-yellow-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.warm}</p>
            <p className="text-xs font-medium mt-1">Warm</p>
          </button>
          <button
            onClick={() => setFilter('Cold')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'Cold' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.cold}</p>
            <p className="text-xs font-medium mt-1">Cold</p>
          </button>
          <button
            onClick={() => setFilter('Closed')}
            className={`p-4 rounded-xl text-center transition-all ${
              filter === 'Closed' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.closed}</p>
            <p className="text-xs font-medium mt-1">Closed</p>
          </button>
        </div>

        {/* Entries Table */}
        <SalesTable entries={filteredEntries} showSalesPerson={false} onEdit={handleEdit} />

        {/* Edit Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Edit Sales Entry</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={editFormData.companyName}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={editFormData.contactPerson}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={editFormData.contactNumber}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={editFormData.contactEmail}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      name="designation"
                      value={editFormData.designation}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={editFormData.location}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requirement</label>
                    <select
                      name="requirement"
                      value={editFormData.requirement}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    >
                      <option value="Relocation">Relocation</option>
                      <option value="HR">HR</option>
                      <option value="Real Estate">Real Estate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Query Status</label>
                    <select
                      name="queryStatus"
                      value={editFormData.queryStatus}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    >
                      <option value="Cold">Cold</option>
                      <option value="Warm">Warm</option>
                      <option value="Hot">Hot</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-Up Date</label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={editFormData.nextFollowUpDate}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                    <textarea
                      name="remark"
                      value={editFormData.remark}
                      onChange={handleEditChange}
                      rows={3}
                      className={`${inputClasses} resize-none`}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Update Entry'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyEntries;
