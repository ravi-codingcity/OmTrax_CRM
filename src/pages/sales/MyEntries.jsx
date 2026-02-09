import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';
import FollowUpModal from '../../components/Common/FollowUpModal';

const MyEntries = () => {
  const { user } = useAuth();
  const { salesEntries, loading, fetchSalesEntries, addFollowUp } = useSales();
  const [myEntries, setMyEntries] = useState([]);

  // Filter states (similar to AllSales)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');
  
  const [successMessage, setSuccessMessage] = useState('');
  const [followUpEntry, setFollowUpEntry] = useState(null);
  const [followUpMode, setFollowUpMode] = useState('view');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 30;

  // Load data on mount
  const loadData = useCallback(async () => {
    await fetchSalesEntries();
  }, [fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter entries for current user
  useEffect(() => {
    if (user && salesEntries.length > 0) {
      const userEntries = salesEntries.filter(
        entry => entry.salesPerson === user._id || entry.salesPerson?._id === user._id
      );
      setMyEntries(userEntries);
    }
  }, [salesEntries, user]);

  // Get unique values for dynamic filters
  const uniqueBranches = useMemo(() => 
    [...new Set(myEntries.map(e => e.branch).filter(Boolean))].sort(),
    [myEntries]
  );
  const uniqueRequirements = useMemo(() => 
    [...new Set(myEntries.map(e => e.requirement).filter(Boolean))].sort(),
    [myEntries]
  );
  const uniqueStatuses = useMemo(() => 
    [...new Set(myEntries.map(e => e.queryStatus).filter(Boolean))].sort(),
    [myEntries]
  );

  // Filtered entries with useMemo for performance
  const filteredEntries = useMemo(() => {
    return myEntries.filter((entry) => {
      const matchesSearch = searchTerm === '' ||
        entry.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || entry.queryStatus === statusFilter;
      const matchesRequirement = requirementFilter === '' || entry.requirement === requirementFilter;
      const matchesBranch = branchFilter === '' || entry.branch === branchFilter;

      return matchesSearch && matchesStatus && matchesRequirement && matchesBranch;
    });
  }, [myEntries, searchTerm, statusFilter, requirementFilter, branchFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, requirementFilter, branchFilter]);

  const stats = useMemo(() => ({
    total: myEntries.length,
    hot: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'hot').length,
    warm: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'warm').length,
    cold: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'cold').length,
    closed: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'closed').length,
  }), [myEntries]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setBranchFilter('');
    setRequirementFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || branchFilter || requirementFilter;

  const handleViewFollowUp = (entry) => {
    setFollowUpEntry(entry);
    setFollowUpMode('view');
  };

  const handleAddFollowUp = (entry) => {
    setFollowUpEntry(entry);
    setFollowUpMode('add');
  };

  const handleFollowUpSubmit = async (entryId, followUpData) => {
    await addFollowUp(entryId, followUpData);
    await fetchSalesEntries(); // Refresh data after adding follow-up
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
            onClick={() => setStatusFilter('')}
            className={`p-4 rounded-xl text-center transition-all ${
              statusFilter === '' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs font-medium mt-1">Total</p>
          </button>
          <button
            onClick={() => setStatusFilter('Hot')}
            className={`p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Hot' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.hot}</p>
            <p className="text-xs font-medium mt-1">Hot</p>
          </button>
          <button
            onClick={() => setStatusFilter('Warm')}
            className={`p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Warm' ? 'bg-yellow-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.warm}</p>
            <p className="text-xs font-medium mt-1">Warm</p>
          </button>
          <button
            onClick={() => setStatusFilter('Cold')}
            className={`p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Cold' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.cold}</p>
            <p className="text-xs font-medium mt-1">Cold</p>
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Closed' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-2xl font-bold">{stats.closed}</p>
            <p className="text-xs font-medium mt-1">Closed</p>
          </button>
        </div>

        {/* Filter Controls - Similar to AllSales */}
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search company, contact, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[110px]"
            >
              <option value="">All Branches</option>
              {uniqueBranches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            {/* Requirement Filter */}
            <select
              value={requirementFilter}
              onChange={(e) => setRequirementFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[110px]"
            >
              <option value="">All Services</option>
              {uniqueRequirements.map((req) => (
                <option key={req} value={req}>{req}</option>
              ))}
            </select>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[100px]"
            >
              <option value="">All Status</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
          {/* Results count */}
          <p className="text-xs text-gray-500 mt-2">
            Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
          </p>
        </div>

        {/* Entries Table */}
        <SalesTable 
          entries={paginatedEntries} 
          showSalesPerson={false} 
          onViewFollowUp={handleViewFollowUp}
          onAddFollowUp={handleAddFollowUp}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-3 border border-gray-100">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}

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
