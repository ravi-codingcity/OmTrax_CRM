import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBusiness } from '../../context/BusinessContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import BusinessTable from '../../components/Business/BusinessTable';
import BusinessModal from '../../components/Business/BusinessModal';
import PullToRefresh from '../../components/Common/PullToRefresh';

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const getSalesPersonName = (entry) =>
  entry.salesPersonName || entry.salesPerson?.name || 'Unknown';

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// Returns { start, end } Date bounds for a given preset, or null for "all"
const getDateRange = (filter, customStart, customEnd) => {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': {
      const day = now.getDay(); // 0 Sun .. 6 Sat
      const diff = day === 0 ? 6 : day - 1; // days since Monday
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      return { start: startOfDay(monday), end: endOfDay(now) };
    }
    case 'month':
      return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
    case 'custom':
      if (!customStart && !customEnd) return null;
      return {
        start: customStart ? startOfDay(new Date(customStart)) : new Date(0),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      };
    default:
      return null;
  }
};

const DATE_PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const BusinessOverview = () => {
  const { businessEntries, loading, fetchBusinessEntries, addBusinessEntry, updateBusinessEntry, deleteBusinessEntry } = useBusiness();
  const { salesEntries, fetchSalesEntries } = useSales();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'add', entry: null });

  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 20;

  const loadData = useCallback(async () => {
    await Promise.all([fetchBusinessEntries(), fetchSalesEntries()]);
  }, [fetchBusinessEntries, fetchSalesEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open the Add form pre-filled when arriving from a Sales Entry's ₹ action
  useEffect(() => {
    const pf = location.state?.prefillBusiness;
    if (pf) {
      setModal({ open: true, mode: 'add', entry: { client: pf.client || '', remarks: pf.remarks || '' } });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const clientSuggestions = useMemo(() => {
    const fromSales = salesEntries.map((e) => e.companyName).filter(Boolean);
    const fromBusiness = businessEntries.map((e) => e.client).filter(Boolean);
    return [...new Set([...fromSales, ...fromBusiness])].sort();
  }, [salesEntries, businessEntries]);

  const uniqueSalesPersons = useMemo(
    () => [...new Set(businessEntries.map(getSalesPersonName).filter(Boolean))].sort(),
    [businessEntries]
  );

  // Apply the date-range filter first — drives both the metrics and the table
  const dateFilteredEntries = useMemo(() => {
    const range = getDateRange(dateFilter, customStart, customEnd);
    if (!range) return businessEntries;
    return businessEntries.filter((e) => {
      const t = new Date(e.entryDate || e.createdAt);
      return !isNaN(t.getTime()) && t >= range.start && t <= range.end;
    });
  }, [businessEntries, dateFilter, customStart, customEnd]);

  // Overview metrics (respect the active date range)
  const stats = useMemo(() => {
    const totalValue = dateFilteredEntries.reduce((sum, e) => sum + Number(e.estimateAmount || 0), 0);
    const uniqueClients = new Set(dateFilteredEntries.map((e) => e.client).filter(Boolean)).size;

    const bySalesPerson = {};
    const byClient = {};
    dateFilteredEntries.forEach((e) => {
      const sp = getSalesPersonName(e);
      const amt = Number(e.estimateAmount || 0);
      if (!bySalesPerson[sp]) bySalesPerson[sp] = { count: 0, value: 0 };
      bySalesPerson[sp].count += 1;
      bySalesPerson[sp].value += amt;

      const client = e.client || 'Unknown';
      if (!byClient[client]) byClient[client] = { count: 0, value: 0 };
      byClient[client].count += 1;
      byClient[client].value += amt;
    });

    const topSalesPersons = Object.entries(bySalesPerson).sort((a, b) => b[1].value - a[1].value);
    const topClients = Object.entries(byClient).sort((a, b) => b[1].value - a[1].value).slice(0, 5);

    return {
      totalEntries: dateFilteredEntries.length,
      totalValue,
      uniqueClients,
      topSalesPersons,
      topClients,
      maxSalesPersonValue: topSalesPersons[0]?.[1].value || 0,
    };
  }, [dateFilteredEntries]);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return dateFilteredEntries.filter((e) => {
      const matchesSearch =
        !term ||
        e.client?.toLowerCase().includes(term) ||
        e.jobNumber?.toLowerCase().includes(term);
      const matchesSalesPerson = !salesPersonFilter || getSalesPersonName(e) === salesPersonFilter;
      return matchesSearch && matchesSalesPerson;
    });
  }, [dateFilteredEntries, searchTerm, salesPersonFilter]);

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, salesPersonFilter, dateFilter, customStart, customEnd]);

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

  const handleDelete = async (entry) => {
    const result = await deleteBusinessEntry(entry._id);
    setSuccessMessage(result.success ? 'Business entry deleted.' : (result.message || 'Failed to delete.'));
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openAdd = () => setModal({ open: true, mode: 'add', entry: null });
  const openEdit = (entry) => setModal({ open: true, mode: 'edit', entry });
  const closeModal = () => setModal({ open: false, mode: 'add', entry: null });

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Business Overview</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">All business generated across salespersons and clients</p>
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

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Period:
              </span>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setDateFilter(preset.key)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    dateFilter === preset.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {dateFilter === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 sm:ml-2">
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || undefined}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart || undefined}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <span className="text-xs text-gray-500 ml-auto">
                {stats.totalEntries} entr{stats.totalEntries === 1 ? 'y' : 'ies'} in range
              </span>
            </div>
          </div>

          {/* Summary Stats */}
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
              <p className="text-xs font-medium text-gray-500">Salespersons</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.topSalesPersons.length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Contributing</p>
            </div>
          </div>

          {/* Business by Salesperson + Top Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Salesperson */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Business by Salesperson
              </h3>
              <div className="space-y-3">
                {stats.topSalesPersons.length > 0 ? (
                  stats.topSalesPersons.map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 truncate flex-1">{name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 sm:w-28 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${stats.maxSalesPersonValue ? (data.value / stats.maxSalesPersonValue) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-800 w-24 text-right">{formatCurrency(data.value)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No business data available</p>
                )}
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Top Clients by Value
              </h3>
              <div className="space-y-3">
                {stats.topClients.length > 0 ? (
                  stats.topClients.map(([client, data]) => (
                    <div key={client} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 truncate flex-1">{client}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">{data.count} job{data.count > 1 ? 's' : ''}</span>
                        <span className="text-xs font-semibold text-gray-800 w-24 text-right">{formatCurrency(data.value)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No client data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
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
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
              >
                <option value="">All Salespersons</option>
                {uniqueSalesPersons.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500 ml-auto">
                {filteredEntries.length} of {businessEntries.length} entries
              </span>
            </div>
          </div>

          {/* Table */}
          <BusinessTable entries={paginatedEntries} showSalesPerson={true} onEdit={openEdit} onDelete={handleDelete} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-3 sm:px-4 py-3 border border-gray-100">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
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

export default BusinessOverview;
