import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import useBusinessAction from '../../hooks/useBusinessAction';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';
import FollowUpModal from '../../components/Common/FollowUpModal';
import PullToRefresh from '../../components/Common/PullToRefresh';

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
  const entriesPerPage = 15;

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFilter, setDownloadFilter] = useState('Total');

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
  const uniqueStatuses = useMemo(() => {
    // Normalize status values: capitalize first letter, lowercase rest
    const normalizedStatuses = myEntries
      .map(e => e.queryStatus)
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
    return [...new Set(normalizedStatuses)].sort();
  }, [myEntries]);

  // Filtered entries with useMemo for performance
  const filteredEntries = useMemo(() => {
    return myEntries.filter((entry) => {
      const matchesSearch = searchTerm === '' ||
        entry.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || entry.queryStatus?.toLowerCase() === statusFilter.toLowerCase();
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
    active: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'active').length,
  }), [myEntries]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setBranchFilter('');
    setRequirementFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || branchFilter || requirementFilter;

  const runBusinessAction = useBusinessAction();
  // ₹ action: HR leads create a requirement (shows a toast); other leads
  // navigate to the Business form, so no toast is needed here.
  const handleBusinessAction = async (entry) => {
    const res = await runBusinessAction(entry);
    if (res.kind === 'hr' && res.message) {
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

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

  const handleDownloadExcel = () => {
    const entriesToExport =
      downloadFilter === 'Total'
        ? myEntries
        : myEntries.filter(
            (e) => e.queryStatus?.toLowerCase() === downloadFilter.toLowerCase()
          );

    if (!entriesToExport.length) {
      setSuccessMessage(`No ${downloadFilter} entries available to download.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}-${month}-${d.getFullYear()}`;
    };

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };

    const headers = [
      'S.No',
      'Company Name',
      'Contact Person',
      'Designation',
      'Contact Number',
      'Email',
      'Requirement',
      'Location',
      'Branch',
      'Query Status',
      'Remark',
      'Next Follow-Up Date',
      'Follow-Ups Count',
      'Created Date',
    ];

    const rows = entriesToExport.map((entry, idx) => [
      idx + 1,
      entry.companyName,
      entry.contactPerson,
      entry.designation,
      entry.contactNumber,
      entry.contactEmail,
      entry.requirement,
      entry.location,
      entry.branch,
      entry.queryStatus
        ? entry.queryStatus.charAt(0).toUpperCase() + entry.queryStatus.slice(1).toLowerCase()
        : '',
      entry.remark,
      formatDate(entry.nextFollowUpDate),
      entry.followUpHistory?.length || entry.followUps?.length || 0,
      formatDate(entry.createdAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    // UTF-8 BOM so Excel renders unicode characters correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const safeName = (user?.name || 'salesperson').replace(/[^a-zA-Z0-9]+/g, '_');
    link.href = url;
    link.download = `MyEntries_${safeName}_${downloadFilter}_${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMessage(
      `Downloaded ${entriesToExport.length} ${downloadFilter} ${entriesToExport.length === 1 ? 'entry' : 'entries'} successfully!`
    );
    setTimeout(() => setSuccessMessage(''), 3000);
    setShowDownloadModal(false);
  };

  // Per-status counts for the download modal
  const downloadCounts = useMemo(() => ({
    Total: myEntries.length,
    Hot: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'hot').length,
    Warm: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'warm').length,
    Cold: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'cold').length,
    Closed: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'closed').length,
    Active: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'active').length,
  }), [myEntries]);

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Entries</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">View and manage your sales entries</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setDownloadFilter('Total');
                setShowDownloadModal(true);
              }}
              disabled={!myEntries.length}
              title="Download your sales entries as Excel"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Excel Sheet
            </button>
            <a
              href="/sales/new-entry"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Entry
            </a>
          </div>
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
          <button
            onClick={() => setStatusFilter('')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === '' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Total</p>
          </button>
          <button
            onClick={() => setStatusFilter('Hot')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Hot' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.hot}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Hot</p>
          </button>
          <button
            onClick={() => setStatusFilter('Warm')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Warm' ? 'bg-yellow-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.warm}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Warm</p>
          </button>
          <button
            onClick={() => setStatusFilter('Cold')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Cold' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.cold}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Cold</p>
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Closed' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.closed}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Closed</p>
          </button>
          <button
            onClick={() => setStatusFilter('Active')}
            className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
              statusFilter === 'Active' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-lg sm:text-2xl font-bold">{stats.active}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Active</p>
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
          onBusinessAction={handleBusinessAction}
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

        {/* Download Excel Modal */}
        {showDownloadModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDownloadModal(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Download Excel Sheet</h3>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Select which leads you want to export.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                {[
                  { key: 'Total', color: 'blue' },
                  { key: 'Hot', color: 'red' },
                  { key: 'Warm', color: 'amber' },
                  { key: 'Cold', color: 'indigo' },
                  { key: 'Closed', color: 'green' },
                  { key: 'Active', color: 'teal' },
                ].map((opt) => {
                  const selected = downloadFilter === opt.key;
                  const selectedClasses = {
                    blue: 'bg-blue-600 text-white border-blue-600',
                    red: 'bg-red-600 text-white border-red-600',
                    amber: 'bg-amber-500 text-white border-amber-500',
                    indigo: 'bg-indigo-600 text-white border-indigo-600',
                    green: 'bg-green-600 text-white border-green-600',
                    teal: 'bg-teal-600 text-white border-teal-600',
                  }[opt.color];
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setDownloadFilter(opt.key)}
                      className={`px-3 py-3 rounded-lg border text-center transition-all ${
                        selected
                          ? `${selectedClasses} shadow`
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-lg font-bold leading-none">{downloadCounts[opt.key]}</p>
                      <p className="text-xs font-medium mt-1">{opt.key}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadExcel}
                  disabled={!downloadCounts[downloadFilter]}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download ({downloadCounts[downloadFilter]})
                </button>
              </div>
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
      </PullToRefresh>
    </MainLayout>
  );
};

export default MyEntries;
