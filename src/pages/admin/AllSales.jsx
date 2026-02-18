import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';
import FollowUpModal from '../../components/Common/FollowUpModal';

const AllSales = () => {
  const { salesEntries, loading, fetchSalesEntries, addFollowUp, deleteSalesEntry } = useSales();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');
  
  // Filter states (consistent with Dashboard)
  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalMode, setModalMode] = useState('both');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;

  // Load data on mount
  const loadData = useCallback(async () => {
    await fetchSalesEntries();
  }, [fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update local entries when salesEntries changes
  useEffect(() => {
    setEntries(salesEntries);
  }, [salesEntries]);

  // Get unique values for dynamic filters (like Dashboard)
  const uniqueSalesPersons = useMemo(() => 
    [...new Set(entries.map(e => e.salesPersonName || e.salesPerson?.name).filter(Boolean))].sort(),
    [entries]
  );
  const uniqueBranches = useMemo(() => 
    [...new Set(entries.map(e => e.branch).filter(Boolean))].sort(),
    [entries]
  );
  const uniqueRequirements = useMemo(() => 
    [...new Set(entries.map(e => e.requirement).filter(Boolean))].sort(),
    [entries]
  );
  const uniqueStatuses = useMemo(() => {
    // Normalize status values: capitalize first letter, lowercase rest
    const normalizedStatuses = entries
      .map(e => e.queryStatus)
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
    return [...new Set(normalizedStatuses)].sort();
  }, [entries]);

  // Filtered entries with useMemo for performance
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const salesPersonName = entry.salesPersonName || entry.salesPerson?.name || '';
      const matchesSearch = searchTerm === '' ||
        entry.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesPersonName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSalesPerson = salesPersonFilter === '' || salesPersonName === salesPersonFilter;
      const matchesStatus = statusFilter === '' || entry.queryStatus?.toLowerCase() === statusFilter.toLowerCase();
      const matchesRequirement = requirementFilter === '' || entry.requirement === requirementFilter;
      const matchesBranch = branchFilter === '' || entry.branch === branchFilter;

      return matchesSearch && matchesSalesPerson && matchesStatus && matchesRequirement && matchesBranch;
    });
  }, [entries, searchTerm, salesPersonFilter, statusFilter, requirementFilter, branchFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, salesPersonFilter, statusFilter, requirementFilter, branchFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSalesPersonFilter('');
    setBranchFilter('');
    setRequirementFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = searchTerm || salesPersonFilter || branchFilter || requirementFilter || statusFilter;

  const handleViewFollowUp = (entry) => {
    setSelectedEntry(entry);
    setModalMode('both');
  };

  const handleAddFollowUp = async (entryId, followUpData) => {
    await addFollowUp(entryId, followUpData);
    await fetchSalesEntries(); // Refresh data after adding follow-up
  };

  const closeModal = () => {
    setSelectedEntry(null);
  };

  const handleDelete = async (entry) => {
    const result = await deleteSalesEntry(entry._id || entry.id);
    if (result.success) {
      setDeleteSuccessMessage(`"${entry.companyName}" deleted successfully`);
      await fetchSalesEntries();
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setDeleteSuccessMessage('');
      }, 3000);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Mobile Delete Success Toast */}
        {deleteSuccessMessage && (
          <div className="md:hidden fixed top-16 left-3 right-3 z-50 animate-[slideDown_0.3s_ease-out]">
            <div className="bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{deleteSuccessMessage}</span>
              </div>
              <button
                onClick={() => setDeleteSuccessMessage('')}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">All Sales Entries</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              {loading ? 'Loading...' : `Showing ${filteredEntries.length} of ${entries.length} entries`}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/new-entry')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </button>
        </div>

        {/* Filter Controls - Consistent with Dashboard */}
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

            {/* Sales Person Filter */}
            <select
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
            >
              <option value="">All Sales Persons</option>
              {uniqueSalesPersons.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>

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

            {/* Status Filter */}
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
        </div>

        {/* Sales Table */}
        <SalesTable 
          entries={paginatedEntries} 
          onViewFollowUp={handleViewFollowUp}
          onDelete={handleDelete}
          isAdmin={true}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-3 sm:px-4 py-3 border border-gray-100">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-700">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Follow-Up Modal */}
        {selectedEntry && (
          <FollowUpModal
            entry={selectedEntry}
            onClose={closeModal}
            onAddFollowUp={handleAddFollowUp}
            mode={modalMode}
            currentUser={user}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AllSales;
