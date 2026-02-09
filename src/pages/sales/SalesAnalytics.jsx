import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSales } from '../../context/SalesContext';
import MainLayout from '../../components/Layout/MainLayout';

const SalesAnalytics = () => {
  const { user } = useAuth();
  const { salesEntries, loading, fetchSalesEntries } = useSales();
  const [myEntries, setMyEntries] = useState([]);

  // Format date to DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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

  // Calculate stats with useMemo for performance
  const stats = useMemo(() => ({
    total: myEntries.length,
    hot: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'hot').length,
    warm: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'warm').length,
    cold: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'cold').length,
    closed: myEntries.filter((e) => e.queryStatus?.toLowerCase() === 'closed').length,
  }), [myEntries]);

  const conversionRate = useMemo(() => 
    stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0,
    [stats]
  );

  // By requirement - dynamic from actual data
  const byRequirement = useMemo(() => {
    return myEntries.reduce((acc, entry) => {
      if (entry.requirement) {
        acc[entry.requirement] = (acc[entry.requirement] || 0) + 1;
      }
      return acc;
    }, {});
  }, [myEntries]);

  // By location
  const byLocation = useMemo(() => {
    return myEntries.reduce((acc, entry) => {
      if (entry.location) {
        acc[entry.location] = (acc[entry.location] || 0) + 1;
      }
      return acc;
    }, {});
  }, [myEntries]);

  // Recent activity by date
  const entriesByDate = useMemo(() => {
    return myEntries.reduce((acc, entry) => {
      const dateKey = entry.createdAt ? entry.createdAt.split('T')[0] : entry.date;
      if (dateKey) {
        acc[dateKey] = (acc[dateKey] || 0) + 1;
      }
      return acc;
    }, {});
  }, [myEntries]);

  // Upcoming follow-ups
  const upcomingFollowUps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myEntries
      .filter((e) => {
        const followUpDate = e.nextFollowUpDate ? e.nextFollowUpDate.split('T')[0] : '';
        return followUpDate >= today && e.queryStatus?.toLowerCase() !== 'closed';
      })
      .sort((a, b) => new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate))
      .slice(0, 5);
  }, [myEntries]);

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
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Track your performance and insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Leads</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Conversion Rate</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{conversionRate}%</p>
            <p className="text-xs text-gray-500">{stats.closed} closed</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Hot Leads</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.hot}</p>
            <p className="text-xs text-gray-500">High priority</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Active Pipeline</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.hot + stats.warm}</p>
            <p className="text-xs text-gray-500">Hot + Warm</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Lead Status Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'Hot', value: stats.hot, color: 'bg-red-500', textColor: 'text-red-600' },
                { label: 'Warm', value: stats.warm, color: 'bg-amber-500', textColor: 'text-amber-600' },
                { label: 'Cold', value: stats.cold, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Closed', value: stats.closed, color: 'bg-green-500', textColor: 'text-green-600' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={`font-semibold ${item.textColor}`}>
                      {item.value} {stats.total > 0 && `(${((item.value / stats.total) * 100).toFixed(0)}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: stats.total > 0 ? `${(item.value / stats.total) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Type Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">By Service Type</h3>
            {Object.keys(byRequirement).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(byRequirement).map(([req, count], index) => {
                  const colorPalette = [
                    { bg: 'bg-purple-500', text: 'text-purple-600' },
                    { bg: 'bg-indigo-500', text: 'text-indigo-600' },
                    { bg: 'bg-teal-500', text: 'text-teal-600' },
                    { bg: 'bg-pink-500', text: 'text-pink-600' },
                    { bg: 'bg-cyan-500', text: 'text-cyan-600' },
                  ];
                  const color = colorPalette[index % colorPalette.length];
                  return (
                    <div key={req}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{req}</span>
                        <span className={`font-semibold ${color.text}`}>
                          {count} {stats.total > 0 && `(${((count / stats.total) * 100).toFixed(0)}%)`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`${color.bg} h-2 rounded-full transition-all duration-500`}
                          style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Locations */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Locations</h3>
            {Object.keys(byLocation).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(byLocation)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([location, count], index) => (
                    <div key={location} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{location}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            )}
          </div>

          {/* Upcoming Follow-ups */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Upcoming Follow-ups</h3>
            {upcomingFollowUps.length > 0 ? (
              <div className="space-y-2">
                {upcomingFollowUps.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{entry.companyName}</p>
                      <p className="text-xs text-gray-500">{entry.contactPerson}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-blue-600">{formatDate(entry.nextFollowUpDate)}</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        entry.queryStatus === 'Hot' ? 'bg-red-100 text-red-700' :
                        entry.queryStatus === 'Warm' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {entry.queryStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming follow-ups</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Recent Activity</h3>
          {Object.keys(entriesByDate).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(entriesByDate)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 7)
                .map(([date, count]) => (
                  <div key={date} className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-xs text-gray-500">
                      {new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{count} entries</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SalesAnalytics;
