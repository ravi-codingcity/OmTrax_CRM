import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSales } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/Layout/MainLayout';
import StatCard from '../../components/Common/StatCard';
import SalesTable from '../../components/Common/SalesTable';
import FollowUpModal from '../../components/Common/FollowUpModal';

const Dashboard = () => {
  const { salesEntries, stats, loading, fetchSalesEntries, getStats, addFollowUp, updateSalesEntry } = useSales();
  const { user } = useAuth();
  
  // Local state for entries
  const [entries, setEntries] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;

  // Follow-up modal state
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load data on mount
  const loadData = useCallback(async () => {
    await fetchSalesEntries();
    await getStats();
  }, [fetchSalesEntries, getStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update local entries when salesEntries changes
  useEffect(() => {
    setEntries(salesEntries);
  }, [salesEntries]);

  // Get unique values for filters - memoized for performance
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
  const uniqueStatuses = useMemo(() => 
    [...new Set(entries.map(e => e.queryStatus).filter(Boolean))].sort(),
    [entries]
  );

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const salesPersonName = entry.salesPersonName || entry.salesPerson?.name || '';
      const matchesSearch = searchTerm === '' || 
        entry.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSalesPerson = salesPersonFilter === '' || salesPersonName === salesPersonFilter;
      const matchesBranch = branchFilter === '' || entry.branch === branchFilter;
      const matchesRequirement = requirementFilter === '' || entry.requirement === requirementFilter;
      const matchesStatus = statusFilter === '' || entry.queryStatus === statusFilter;
      return matchesSearch && matchesSalesPerson && matchesBranch && matchesRequirement && matchesStatus;
    });
  }, [entries, searchTerm, salesPersonFilter, branchFilter, requirementFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, salesPersonFilter, branchFilter, requirementFilter, statusFilter]);

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
  };

  const handleAddFollowUp = async (entryId, followUpData, addedBy) => {
    await addFollowUp(entryId, followUpData);
    await fetchSalesEntries(); // Refresh data after adding follow-up
  };

  const closeModal = () => {
    setSelectedEntry(null);
  };

  // Edit handlers
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
      nextFollowUpDate: entry.nextFollowUpDate ? entry.nextFollowUpDate.split('T')[0] : '',
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
    try {
      await updateSalesEntry(editingEntry._id, editFormData);
      setEditingEntry(null);
      setSuccessMessage('Entry updated successfully!');
      await fetchSalesEntries(); // Refresh data
    } catch (error) {
      console.error('Error updating entry:', error);
      setSuccessMessage('Failed to update entry. Please try again.');
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCloseEditModal = () => {
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
            <h1 className="text-2xl font-bold text-gray-800">Sales Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Overview of all sales activities across branches</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today's Date</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading data...
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Leads"
            value={stats?.total || 0}
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            color="blue"
          />
          <StatCard
            title="Hot Leads"
            value={stats?.hot || 0}
            icon="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            color="red"
            subtext="High priority"
          />
          <StatCard
            title="Warm Leads"
            value={stats?.warm || 0}
            icon="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
            color="yellow"
            subtext="In progress"
          />
          <StatCard
            title="Cold Leads"
            value={stats?.cold || 0}
            icon="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            color="indigo"
            subtext="Need attention"
          />
          <StatCard
            title="Closed Deals"
            value={stats?.closed || 0}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            color="green"
            subtext="Completed"
          />
          <StatCard
            title="Active Leads"
            value={stats?.active || 0}
            icon="M13 10V3L4 14h7v7l9-11h-7z"
            color="teal"
            subtext="In pipeline"
          />
        </div>

        {/* Branch & Requirement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Branch Wise */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Branch Performance
            </h3>
            <div className="space-y-3">
              {stats?.byBranch && Object.keys(stats.byBranch).length > 0 ? (
                Object.entries(stats.byBranch).map(([branch, count]) => (
                  <div key={branch} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{branch}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No branch data available</p>
              )}
            </div>
          </div>

          {/* Requirement Wise */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              By Service Type
            </h3>
            <div className="space-y-3">
              {stats?.byRequirement && Object.keys(stats.byRequirement).length > 0 ? (
                Object.entries(stats.byRequirement).map(([req, count]) => {
                  const colors = {
                    Relocation: 'bg-purple-600',
                    HR: 'bg-indigo-600',
                    'Real Estate': 'bg-teal-600',
                  };
                  return (
                    <div key={req} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{req}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`${colors[req] || 'bg-gray-600'} h-2 rounded-full`}
                            style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No service type data available</p>
              )}
            </div>
          </div>

          {/* Sales Person Wise */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Top Performers
            </h3>
            <div className="space-y-3">
              {stats?.bySalesPerson && Object.keys(stats.bySalesPerson).length > 0 ? (
                Object.entries(stats.bySalesPerson)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No performer data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Recent Sales Entries</h2>
            <a href="/admin/sales" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </a>
          </div>

          {/* Filter Controls */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-gray-100">
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
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[130px]"
              >
                <option value="">All Sales Persons</option>
                {uniqueSalesPersons.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[110px]"
              >
                <option value="">All Branches</option>
                {uniqueBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>

              {/* Requirement Filter */}
              <select
                value={requirementFilter}
                onChange={(e) => setRequirementFilter(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
              >
                <option value="">All Services</option>
                {uniqueRequirements.map(req => (
                  <option key={req} value={req}>{req}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[110px]"
              >
                <option value="">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}

              {/* Results Count */}
              <span className="text-xs text-gray-500 ml-auto">
                {filteredEntries.length} of {entries.length} entries
              </span>
            </div>
          </div>

          <SalesTable entries={paginatedEntries} onViewFollowUp={handleViewFollowUp} onEdit={handleEdit} />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-3 border border-gray-100 mt-4">
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
        </div>

        {/* Follow-Up Modal */}
        {selectedEntry && (
          <FollowUpModal
            entry={selectedEntry}
            onClose={closeModal}
            onAddFollowUp={handleAddFollowUp}
            mode="both"
            currentUser={user}
          />
        )}

        {/* Edit Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Edit Sales Entry</h2>
                  <p className="text-xs text-gray-500">Editing: {editingEntry.companyName} (by {editingEntry.salesPersonName})</p>
                </div>
                <button
                  onClick={handleCloseEditModal}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requirement</label>
                    <select
                      name="requirement"
                      value={editFormData.requirement}
                      onChange={handleEditChange}
                      className={inputClasses}
                      required
                    >
                      <option value="HHG Relocation">HHG Relocation</option>
                  <option value="Office Relocation">Office Relocation</option>
                  <option value="Demo Relocation">Demo Relocation</option>
                  <option value="Lab Movements">Lab Movements</option>
                  <option value="Furniture Movements">Furniture Movements</option>
                  <option value="Car Movements">Car Movements</option>
                  <option value="Data Center Movements">Data Center Movements</option>
                  <option value="IT Assets Movements">IT Assets Movements</option>
                  <option value="HR & Recruitment">HR & Recruitment</option>
                  <option value="Real Estate">Real Estate</option>
                    </select>
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
                  <option value="Active">Active</option>
                    </select>
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
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
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
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
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

export default Dashboard;
