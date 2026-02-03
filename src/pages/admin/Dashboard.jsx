import { useState, useMemo } from 'react';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';
import StatCard from '../../components/Common/StatCard';
import SalesTable from '../../components/Common/SalesTable';

const Dashboard = () => {
  const { getAllSalesEntries, getStats } = useSales();
  const entries = getAllSalesEntries();
  const stats = getStats();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');

  // Get unique values for filters
  const uniqueSalesPersons = [...new Set(entries.map(e => e.salesPersonName))];
  const uniqueBranches = [...new Set(entries.map(e => e.branch))];
  const uniqueRequirements = [...new Set(entries.map(e => e.requirement))];

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchTerm === '' || 
        entry.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSalesPerson = salesPersonFilter === '' || entry.salesPersonName === salesPersonFilter;
      const matchesBranch = branchFilter === '' || entry.branch === branchFilter;
      const matchesRequirement = requirementFilter === '' || entry.requirement === requirementFilter;
      return matchesSearch && matchesSalesPerson && matchesBranch && matchesRequirement;
    });
  }, [entries, searchTerm, salesPersonFilter, branchFilter, requirementFilter]);

  const recentEntries = filteredEntries.slice(0, 10);

  const clearFilters = () => {
    setSearchTerm('');
    setSalesPersonFilter('');
    setBranchFilter('');
    setRequirementFilter('');
  };

  const hasActiveFilters = searchTerm || salesPersonFilter || branchFilter || requirementFilter;

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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Leads"
            value={stats.total}
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            color="blue"
          />
          <StatCard
            title="Hot Leads"
            value={stats.hot}
            icon="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            color="red"
            subtext="High priority"
          />
          <StatCard
            title="Warm Leads"
            value={stats.warm}
            icon="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
            color="yellow"
            subtext="In progress"
          />
          <StatCard
            title="Cold Leads"
            value={stats.cold}
            icon="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            color="indigo"
            subtext="Need attention"
          />
          <StatCard
            title="Closed Deals"
            value={stats.closed}
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            color="green"
            subtext="Completed"
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
              {Object.entries(stats.byBranch).map(([branch, count]) => (
                <div key={branch} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{branch}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
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
              {Object.entries(stats.byRequirement).map(([req, count]) => {
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
                          className={`${colors[req]} h-2 rounded-full`}
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
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
              {Object.entries(stats.bySalesPerson)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
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

          <SalesTable entries={recentEntries} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
