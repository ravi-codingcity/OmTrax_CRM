import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSalesVisit } from '../context/SalesVisitContext';
import MainLayout from '../components/Layout/MainLayout';
import PullToRefresh from '../components/Common/PullToRefresh';
import AddSalesVisitModal from '../components/Common/AddSalesVisitModal';
import { isNative } from '../utils/capacitor';

const SalesVisit = () => {
  const { user, isAdmin } = useAuth();
  const { salesVisits, loading, fetchSalesVisits, createSalesVisit, deleteSalesVisit } = useSalesVisit();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;

  // Load data on mount
  const loadData = useCallback(async () => {
    await fetchSalesVisits();
  }, [fetchSalesVisits]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter visits based on user role
  const userVisits = useMemo(() => {
    if (!salesVisits.length) return [];
    
    // Admin sees all, salesperson sees only their own
    if (isAdmin()) {
      return salesVisits;
    }
    
    return salesVisits.filter(visit => 
      visit.salesPerson === user?._id || 
      visit.salesPerson?._id === user?._id ||
      visit.salesPersonId === user?._id
    );
  }, [salesVisits, user, isAdmin]);

  // Get unique salespersons for filter (admin only)
  const uniqueSalesPersons = useMemo(() => {
    if (!isAdmin()) return [];
    return [...new Set(userVisits.map(v => v.salesPersonName || v.salesPerson?.name).filter(Boolean))].sort();
  }, [userVisits, isAdmin]);

  // Filtered entries
  const filteredVisits = useMemo(() => {
    return userVisits.filter((visit) => {
      const salesPersonName = visit.salesPersonName || visit.salesPerson?.name || '';
      
      const matchesSearch = searchTerm === '' ||
        visit.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesPersonName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSalesPerson = salesPersonFilter === '' || salesPersonName === salesPersonFilter;
      
      // Date filter logic
      let matchesDate = true;
      if (dateFilter) {
        if (dateFilter === 'today') {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          matchesDate = visit.date === todayStr;
        } else {
          // Specific date selected from calendar (YYYY-MM-DD format)
          matchesDate = visit.date === dateFilter;
        }
      }

      return matchesSearch && matchesSalesPerson && matchesDate;
    });
  }, [userVisits, searchTerm, salesPersonFilter, dateFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVisits.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, startIndex + entriesPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, salesPersonFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSalesPersonFilter('');
    setDateFilter('');
  };

  const hasActiveFilters = searchTerm || salesPersonFilter || dateFilter;

  // Handle add button click
  const handleAddClick = () => {
    if (isNative()) {
      setShowAddModal(true);
    } else {
      // Check if mobile browser (not native app but mobile device)
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileBrowser) {
        setShowAddModal(true);
      } else {
        setShowDesktopWarning(true);
      }
    }
  };

  const handleSubmitVisit = async (visitData) => {
    const result = await createSalesVisit(visitData);
    if (result.success) {
      setSuccessMessage('Sales visit added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowAddModal(false);
    }
    return result;
  };

  const handleDelete = async (visit) => {
    const result = await deleteSalesVisit(visit._id || visit.id);
    if (result.success) {
      setSuccessMessage('Visit deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Success Toast */}
          {successMessage && (
            <div className="fixed top-16 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-[slideDown_0.3s_ease-out]">
              <div className="bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{successMessage}</span>
                </div>
                <button onClick={() => setSuccessMessage('')} className="ml-2 p-1 hover:bg-white/20 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="hidden sm:flex text-xl sm:text-2xl font-bold text-gray-800">Sales Visits</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {isAdmin() ? 'View all sales visits' : 'Your sales visits'}
              </p>
            </div>
            <button
              onClick={handleAddClick}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Sales Visit
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{userVisits.length}</div>
              <div className="text-sm text-gray-500">Total Visits</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {userVisits.filter(v => v.date === new Date().toISOString().split('T')[0]).length}
              </div>
              <div className="text-sm text-gray-500">Today</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {userVisits.filter(v => {
                  const visitDate = new Date(v.date);
                  const today = new Date();
                  const weekAgo = new Date(today.setDate(today.getDate() - 7));
                  return visitDate >= weekAgo;
                }).length}
              </div>
              <div className="text-sm text-gray-500">This Week</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {[...new Set(userVisits.map(v => v.companyName))].length}
              </div>
              <div className="text-sm text-gray-500">Companies</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Sales Person Filter (Admin only) */}
              {isAdmin() && (
                <select
                  value={salesPersonFilter}
                  onChange={(e) => setSalesPersonFilter(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Sales Persons</option>
                  {uniqueSalesPersons.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}

              {/* Date Filter - Today Button & Calendar */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter(dateFilter === 'today' ? '' : 'today')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl border transition-all flex-shrink-0 ${
                    dateFilter === 'today'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Today
                </button>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dateFilter === 'today' ? '' : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    style={{ minHeight: '42px' }}
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 mt-2">No sales visits found</p>
                <button
                  onClick={handleAddClick}
                  className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first visit
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sales Person</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                        {isAdmin() && (
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedVisits.map((visit) => {
                        const imageUrl = visit.imageUrl || visit.image || visit.photo;
                        return (
                        <tr key={visit._id || visit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt="Visit" 
                                className="w-14 h-14 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(imageUrl, '_blank')}
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700 font-medium">{visit.salesPersonName || visit.salesPerson?.name || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{visit.companyName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="text-sm text-gray-600">{visit.location}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(visit.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatTime(visit.time)}</td>
                          {isAdmin() && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setDeleteConfirm(visit)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginatedVisits.map((visit) => {
                    const imageUrl = visit.imageUrl || visit.image || visit.photo;
                    return (
                    <div key={visit._id || visit.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt="Visit" 
                              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-800">{visit.companyName}</h3>
                            <div className="text-sm text-blue-600 font-medium mt-0.5">
                              {visit.salesPersonName || visit.salesPerson?.name || '-'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                              <span>{formatDate(visit.date)}</span>
                              <span>•</span>
                              <span>{formatTime(visit.time)}</span>
                            </div>
                          </div>
                        </div>
                        {isAdmin() && (
                          <button
                            onClick={() => setDeleteConfirm(visit)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{visit.location}</span>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + entriesPerPage, filteredVisits.length)} of {filteredVisits.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-700 px-3">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Add Sales Visit Modal */}
      <AddSalesVisitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitVisit}
        loading={loading}
      />

      {/* Desktop Warning Modal */}
      {showDesktopWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDesktopWarning(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-[scaleIn_0.2s_ease-out]">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Mobile Only Feature</h3>
            <p className="text-gray-600 text-sm mb-6">
              This feature is available only on mobile devices. Please use the OmTrax mobile app on Android or iOS to add sales visits.
            </p>
            <button
              onClick={() => setShowDesktopWarning(false)}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-[scaleIn_0.2s_ease-out]">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Visit?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete the visit to "{deleteConfirm.companyName}"? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default SalesVisit;
