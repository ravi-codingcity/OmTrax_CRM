import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';

const Analytics = () => {
  const { getAllSalesEntries, getStats } = useSales();
  const entries = getAllSalesEntries();
  const stats = getStats();

  // Calculate conversion rate
  const conversionRate = stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0;

  // Group by date for trend
  const entriesByDate = entries.reduce((acc, entry) => {
    acc[entry.date] = (acc[entry.date] || 0) + 1;
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Detailed insights and performance metrics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{conversionRate}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.closed} deals closed of {stats.total} leads</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.hot}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{((stats.hot / stats.total) * 100).toFixed(1)}% of total leads</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Active Pipeline</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.hot + stats.warm}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Hot + Warm leads combined</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Entries</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Across all branches</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Lead Status Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Hot', value: stats.hot, color: 'bg-red-500' },
                { label: 'Warm', value: stats.warm, color: 'bg-yellow-500' },
                { label: 'Cold', value: stats.cold, color: 'bg-blue-500' },
                { label: 'Closed', value: stats.closed, color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">
                      {item.value} ({((item.value / stats.total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${item.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${(item.value / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Type Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Type Distribution</h3>
            <div className="space-y-4">
              {Object.entries(stats.byRequirement).map(([req, count]) => {
                const colors = {
                  Relocation: 'bg-purple-500',
                  HR: 'bg-indigo-500',
                  'Real Estate': 'bg-teal-500',
                };
                return (
                  <div key={req}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{req}</span>
                      <span className="font-medium text-gray-800">
                        {count} ({((count / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${colors[req]} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branch Performance */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Branch Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.byBranch).map(([branch, count]) => (
                <div key={branch} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">{branch}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((count / stats.total) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Person Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Leaderboard</h3>
            <div className="space-y-3">
              {Object.entries(stats.bySalesPerson)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count], index) => (
                  <div key={name} className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{name}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats.bySalesPerson))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity Timeline</h3>
          <div className="space-y-4">
            {Object.entries(entriesByDate)
              .sort((a, b) => new Date(b[0]) - new Date(a[0]))
              .slice(0, 5)
              .map(([date, count]) => (
                <div key={date} className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="flex-1 flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{count} entries added</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
