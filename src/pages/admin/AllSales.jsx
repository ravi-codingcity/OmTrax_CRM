import { useState } from 'react';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import SalesTable from '../../components/Common/SalesTable';

const AllSales = () => {
  const { getAllSalesEntries } = useSales();
  const allEntries = getAllSalesEntries();
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    requirement: '',
    branch: '',
  });

  const filteredEntries = allEntries.filter((entry) => {
    const matchesSearch =
      entry.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      entry.contactPerson.toLowerCase().includes(filters.search.toLowerCase()) ||
      entry.salesPersonName.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = !filters.status || entry.queryStatus === filters.status;
    const matchesRequirement = !filters.requirement || entry.requirement === filters.requirement;
    const matchesBranch = !filters.branch || entry.branch === filters.branch;

    return matchesSearch && matchesStatus && matchesRequirement && matchesBranch;
  });

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', requirement: '', branch: '' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">All Sales Entries</h1>
            <p className="text-gray-500 text-sm mt-1">
              Showing {filteredEntries.length} of {allEntries.length} entries
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search company, contact, or sales person..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Requirement</label>
              <select
                value={filters.requirement}
                onChange={(e) => handleFilterChange('requirement', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="Relocation">Relocation</option>
                <option value="HR">HR</option>
                <option value="Real Estate">Real Estate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <select
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Branches</option>
                <option value="Branch A">Branch A</option>
                <option value="Branch B">Branch B</option>
              </select>
            </div>
          </div>
          {(filters.search || filters.status || filters.requirement || filters.branch) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <SalesTable entries={filteredEntries} />
      </div>
    </MainLayout>
  );
};

export default AllSales;
