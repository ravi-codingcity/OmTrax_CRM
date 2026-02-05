import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';
import FollowUpModal from '../../components/Common/FollowUpModal';

const MyEntries = () => {
  const { user } = useAuth();
  const { getSalesEntriesByUser, addFollowUp } = useSales();
  const myEntries = getSalesEntriesByUser(user.id);

  const [filter, setFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [followUpEntry, setFollowUpEntry] = useState(null);
  const [followUpMode, setFollowUpMode] = useState('view');

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

  const handleViewFollowUp = (entry) => {
    setFollowUpEntry(entry);
    setFollowUpMode('view');
  };

  const handleAddFollowUp = (entry) => {
    setFollowUpEntry(entry);
    setFollowUpMode('both');
  };

  const handleFollowUpSubmit = (entryId, followUpData, addedBy) => {
    addFollowUp(entryId, followUpData, addedBy, 'salesperson');
    setSuccessMessage('Follow-up added successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const closeFollowUpModal = () => {
    setFollowUpEntry(null);
  };

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
        <SalesTable 
          entries={filteredEntries} 
          showSalesPerson={false} 
          onViewFollowUp={handleViewFollowUp}
          onAddFollowUp={handleAddFollowUp}
        />

        {/* Follow-Up Modal */}
        {followUpEntry && (
          <FollowUpModal
            entry={followUpEntry}
            onClose={closeFollowUpModal}
            onAddFollowUp={handleFollowUpSubmit}
            mode={followUpMode}
            currentUser={user}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default MyEntries;
