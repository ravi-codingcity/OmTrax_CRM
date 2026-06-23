import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import BusinessTable from '../../components/Business/BusinessTable';
import BusinessModal from '../../components/Business/BusinessModal';
import PullToRefresh from '../../components/Common/PullToRefresh';

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const MyBusiness = () => {
  const { businessEntries, loading, fetchBusinessEntries, addBusinessEntry, updateBusinessEntry } = useBusiness();
  const { salesEntries, fetchSalesEntries } = useSales();

  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'add', entry: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 20;

  const loadData = useCallback(async () => {
    await Promise.all([fetchBusinessEntries(), fetchSalesEntries()]);
  }, [fetchBusinessEntries, fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client suggestions: company names from Sales CRM + existing business clients
  const clientSuggestions = useMemo(() => {
    const fromSales = salesEntries.map((e) => e.companyName).filter(Boolean);
    const fromBusiness = businessEntries.map((e) => e.client).filter(Boolean);
    return [...new Set([...fromSales, ...fromBusiness])].sort();
  }, [salesEntries, businessEntries]);

  // Dashboard metrics (own data)
  const stats = useMemo(() => {
    const totalValue = businessEntries.reduce((sum, e) => sum + Number(e.estimateAmount || 0), 0);
    const uniqueClients = new Set(businessEntries.map((e) => e.client).filter(Boolean)).size;
    const avgValue = businessEntries.length ? totalValue / businessEntries.length : 0;
    return {
      totalEntries: businessEntries.length,
      totalValue,
      uniqueClients,
      avgValue,
    };
  }, [businessEntries]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return businessEntries;
    const term = searchTerm.toLowerCase();
    return businessEntries.filter(
      (e) =>
        e.client?.toLowerCase().includes(term) ||
        e.jobNumber?.toLowerCase().includes(term)
    );
  }, [businessEntries, searchTerm]);

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddSubmit = async (payload) => {
    const result = await addBusinessEntry(payload);
    if (result.success) {
      setSuccessMessage('Business entry added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    return result;
  };

  const handleEditSubmit = async (payload) => {
    const result = await updateBusinessEntry(modal.entry._id, payload);
    if (result.success) {
      setSuccessMessage('Business entry updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    return result;
  };

  const openAdd = () => setModal({ open: true, mode: 'add', entry: null });
  const openEdit = (entry) => setModal({ open: true, mode: 'edit', entry });
  const closeModal = () => setModal({ open: false, mode: 'add', entry: null });

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Business</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Track the business you generate and your top clients</p>
            </div>
            <button
              onClick={openAdd}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Entry
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Dashboard Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Total Business</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalEntries}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Entries generated</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Total Estimate Value</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalValue)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Across all entries</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Clients</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.uniqueClients}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Unique clients</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Avg. Estimate</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(stats.avgValue)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Per entry</p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by client or job number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing {filteredEntries.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
            </p>
          </div>

          {/* Table */}
          <BusinessTable entries={paginatedEntries} showSalesPerson={false} onEdit={openEdit} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-3 sm:px-4 py-3 border border-gray-100">
              <div className="text-xs sm:text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">First</button>
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-700">{currentPage}/{totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Last</button>
              </div>
            </div>
          )}

          {/* Add/Edit Modal */}
          {modal.open && (
            <BusinessModal
              mode={modal.mode}
              entry={modal.entry}
              clientSuggestions={clientSuggestions}
              onClose={closeModal}
              onSubmit={modal.mode === 'add' ? handleAddSubmit : handleEditSubmit}
            />
          )}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default MyBusiness;
