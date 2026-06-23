import { useState, useEffect, useCallback } from 'react';
import { useSales } from '../../context/SalesContext';
import { useBusiness } from '../../context/BusinessContext';
import MainLayout from '../../components/Layout/MainLayout';
import BusinessAnalytics from '../../components/Business/BusinessAnalytics';
import CollapsibleSection from '../../components/Common/CollapsibleSection';

const Analytics = () => {
  const { salesEntries, stats, loading, fetchSalesEntries, getStats, getAnalytics } = useSales();
  const { businessEntries, fetchBusinessEntries } = useBusiness();
  const [entries, setEntries] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Load data on mount
  const loadData = useCallback(async () => {
    await fetchSalesEntries();
    await getStats();
    await fetchBusinessEntries();
    const analytics = await getAnalytics();
    setAnalyticsData(analytics);
  }, [fetchSalesEntries, getStats, getAnalytics, fetchBusinessEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update local entries when salesEntries changes
  useEffect(() => {
    setEntries(salesEntries);
  }, [salesEntries]);

  // Calculate conversion rate
  const conversionRate = stats?.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : (stats?.conversionRate || 0);

  // Group by date for trend
  const entriesByDate = entries.reduce((acc, entry) => {
    const dateKey = entry.createdAt ? entry.createdAt.split('T')[0] : entry.date;
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className='hidden sm:block'>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Detailed insights and performance metrics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Conversion Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{conversionRate}%</p>
              </div>
              <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2">{stats?.closed || 0} deals closed of {stats?.total || 0} leads</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats?.hot || 0}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2">{stats?.total ? ((stats.hot / stats.total) * 100).toFixed(1) : 0}% of total leads</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Active Pipeline</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{(stats?.hot || 0) + (stats?.warm || 0)}</p>
              </div>
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2">Hot + Warm leads combined</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Total Leads</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{stats?.total || 0}</p>
              </div>
              <div className="bg-gray-100 p-2 sm:p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2">Across all branches</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Distribution */}
          <CollapsibleSection title="Lead Status Distribution">
            <div className="space-y-4">
              {[
                { label: 'Hot', value: stats?.hot || 0, color: 'bg-red-500' },
                { label: 'Warm', value: stats?.warm || 0, color: 'bg-yellow-500' },
                { label: 'Cold', value: stats?.cold || 0, color: 'bg-blue-500' },
                { label: 'Closed', value: stats?.closed || 0, color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">
                      {item.value} ({stats?.total ? ((item.value / stats.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
                    <div
                      className={`${item.color} h-2.5 sm:h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${stats?.total ? (item.value / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Service Type Distribution */}
          <CollapsibleSection title="Service Type Distribution">
            <div className="space-y-4">
              {stats?.byRequirement && Object.keys(stats.byRequirement).length > 0 ? (
                Object.entries(stats.byRequirement).map(([req, count]) => {
                  const colors = {
                    Relocation: 'bg-purple-500',
                    HR: 'bg-indigo-500',
                    'Real Estate': 'bg-teal-500',
                  };
                  return (
                    <div key={req}>
                      <div className="flex justify-between text-xs sm:text-sm mb-1">
                        <span className="text-gray-600">{req}</span>
                        <span className="font-medium text-gray-800">
                          {count} ({stats?.total ? ((count / stats.total) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
                        <div
                          className={`${colors[req] || 'bg-gray-500'} h-2.5 sm:h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${stats?.total ? (count / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No service type data available</p>
              )}
            </div>
          </CollapsibleSection>

          {/* Branch Performance */}
          <CollapsibleSection title="Branch Performance">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {stats?.byBranch && Object.keys(stats.byBranch).length > 0 ? (
                Object.entries(stats.byBranch).map(([branch, count]) => (
                  <div key={branch} className="bg-gray-50 rounded-lg p-2 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-600">{branch}</p>
                    <p className="text-xl sm:text-3xl font-bold text-gray-800 mt-1">{count}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      {stats?.total ? ((count / stats.total) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4">
                  <p className="text-xs sm:text-sm text-gray-500">No branch data available</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Sales Person Leaderboard */}
          <CollapsibleSection title="Sales Leaderboard">
            <div className="space-y-3">
              {stats?.bySalesPerson && Object.keys(stats.bySalesPerson).length > 0 ? (
                Object.entries(stats.bySalesPerson)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count], index) => {
                    const maxCount = Math.max(...Object.values(stats.bySalesPerson));
                    return (
                      <div key={name} className="flex items-center space-x-2 sm:space-x-3">
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{name}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 mt-1">
                            <div
                              className="bg-blue-600 h-1 sm:h-1.5 rounded-full"
                              style={{ width: `${maxCount ? (count / maxCount) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800">{count}</span>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No sales data available</p>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Recent Activity */}
        <CollapsibleSection title="Recent Activity Timeline">
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(entriesByDate)
              .sort((a, b) => new Date(b[0]) - new Date(a[0]))
              .slice(0, 5)
              .map(([date, count]) => (
                <div key={date} className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 flex items-center justify-between border-b border-gray-100 pb-2 sm:pb-3 min-w-0">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-800">{count} entries</span>
                  </div>
                </div>
              ))}
          </div>
        </CollapsibleSection>

        {/* Business Analytics */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Business Analytics</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Revenue performance across salespersons and clients</p>
            </div>
          </div>
          <BusinessAnalytics entries={businessEntries} isAdmin={true} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
