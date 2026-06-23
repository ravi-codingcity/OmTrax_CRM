import { useMemo } from 'react';

const INR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const compactINR = (n) => {
  n = Number(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
};
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};
const getSalesPersonName = (e) => e.salesPersonName || e.salesPerson?.name || 'Unknown';
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const BusinessAnalytics = ({ entries = [], isAdmin = false, monthsToShow = 6 }) => {
  const data = useMemo(() => {
    const now = new Date();

    // Build month buckets (oldest -> newest)
    const months = [];
    const monthIdx = {};
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      monthIdx[key] = months.length;
      months.push({ key, label: monthLabel(key), count: 0, value: 0 });
    }

    let totalValue = 0;
    const bySalesPerson = {};
    const byClient = {};

    entries.forEach((e) => {
      const amt = Number(e.estimateAmount || 0);
      totalValue += amt;

      const d = new Date(e.entryDate || e.createdAt);
      if (!isNaN(d.getTime())) {
        const key = monthKey(d);
        if (key in monthIdx) {
          months[monthIdx[key]].count += 1;
          months[monthIdx[key]].value += amt;
        }
      }

      const sp = getSalesPersonName(e);
      if (!bySalesPerson[sp]) bySalesPerson[sp] = { count: 0, value: 0 };
      bySalesPerson[sp].count += 1;
      bySalesPerson[sp].value += amt;

      const client = e.client || 'Unknown';
      if (!byClient[client]) byClient[client] = { count: 0, value: 0 };
      byClient[client].count += 1;
      byClient[client].value += amt;
    });

    const maxMonthValue = Math.max(1, ...months.map((m) => m.value));
    const topSalesPersons = Object.entries(bySalesPerson).sort((a, b) => b[1].value - a[1].value);
    const topClients = Object.entries(byClient).sort((a, b) => b[1].value - a[1].value).slice(0, 5);

    // Month-over-month growth
    const growth = months.map((m, i) => {
      if (i === 0) return { ...m, growth: null };
      const prev = months[i - 1].value;
      const pct = prev === 0 ? (m.value > 0 ? 100 : 0) : ((m.value - prev) / prev) * 100;
      return { ...m, growth: pct };
    });

    const thisMonth = months[months.length - 1];
    const recent = [...entries]
      .sort((a, b) => new Date(b.entryDate || b.createdAt) - new Date(a.entryDate || a.createdAt))
      .slice(0, 6);

    return {
      months,
      growth,
      maxMonthValue,
      totalValue,
      totalEntries: entries.length,
      uniqueClients: Object.keys(byClient).length,
      avgDeal: entries.length ? totalValue / entries.length : 0,
      thisMonthValue: thisMonth?.value || 0,
      thisMonthCount: thisMonth?.count || 0,
      topSalesPersons,
      topClients,
      maxSalesPersonValue: topSalesPersons[0]?.[1].value || 0,
      recent,
    };
  }, [entries, monthsToShow]);

  if (!entries.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm text-gray-500">No business data yet to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm p-3 sm:p-5 text-white">
          <p className="text-[10px] sm:text-xs font-medium opacity-90 uppercase">Total Business Value</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 break-words">{compactINR(data.totalValue)}</p>
          <p className="text-[10px] sm:text-xs opacity-80 mt-1">{INR(data.totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 border-blue-500">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Total Business</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{data.totalEntries}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Entries generated</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 border-purple-500">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Avg Deal Size</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">{compactINR(data.avgDeal)}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Per entry</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 border-amber-500">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Clients</p>
          <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">{data.uniqueClients}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Unique clients</p>
        </div>
      </div>

      {/* Monthly Trends + Revenue Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Monthly Business Trends (bar chart) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Monthly Business Trends</h3>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-gray-500">This month</p>
              <p className="text-sm font-bold text-green-600">{compactINR(data.thisMonthValue)}</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-44 sm:h-52">
            {data.months.map((m, i) => {
              const heightPct = (m.value / data.maxMonthValue) * 100;
              const isCurrent = i === data.months.length - 1;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[9px] sm:text-[11px] font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {compactINR(m.value)}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isCurrent ? 'bg-gradient-to-t from-green-500 to-emerald-400' : 'bg-gradient-to-t from-blue-500 to-blue-400'
                    } hover:opacity-80`}
                    style={{ height: `${Math.max(heightPct, m.value > 0 ? 4 : 0)}%` }}
                    title={`${m.label}: ${INR(m.value)} • ${m.count} entr${m.count === 1 ? 'y' : 'ies'}`}
                  ></div>
                  <span className="text-[9px] sm:text-xs text-gray-500 mt-1.5">{m.label}</span>
                  <span className="text-[9px] sm:text-[11px] font-semibold text-gray-700">{m.count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 text-center mt-3">Bar height = estimate value • number = entries count</p>
        </div>

        {/* Revenue Growth Trends */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Revenue Growth</h3>
          <div className="space-y-2.5">
            {data.growth.map((m) => (
              <div key={m.key} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600 w-10">{m.label}</span>
                <span className="text-xs sm:text-sm font-medium text-gray-800 flex-1 text-right mr-2">{compactINR(m.value)}</span>
                {m.growth === null ? (
                  <span className="text-[10px] sm:text-xs text-gray-400 w-14 text-right">—</span>
                ) : (
                  <span
                    className={`text-[10px] sm:text-xs font-semibold w-14 text-right flex items-center justify-end gap-0.5 ${
                      m.growth >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {m.growth >= 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                    {Math.abs(m.growth).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin-only: Business by Salesperson + Top Performers */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Business by Salesperson (horizontal bars) */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Business by Salesperson</h3>
            <div className="space-y-3">
              {data.topSalesPersons.length > 0 ? (
                data.topSalesPersons.map(([name, d]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-600 truncate mr-2">{name}</span>
                      <span className="font-medium text-gray-800 whitespace-nowrap">{compactINR(d.value)} • {d.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${data.maxSalesPersonValue ? (d.value / data.maxSalesPersonValue) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </div>

          {/* Top Performing Salespersons (leaderboard) */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Top Performing Salespersons</h3>
            <div className="space-y-2.5">
              {data.topSalesPersons.slice(0, 5).map(([name, d], index) => (
                <div key={name} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">{d.count} deal{d.count === 1 ? '' : 's'}</p>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-green-600 whitespace-nowrap">{compactINR(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Clients + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Clients */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Top Clients by Value</h3>
          <div className="space-y-2.5">
            {data.topClients.length > 0 ? (
              data.topClients.map(([client, d], index) => (
                <div key={client} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-700 flex-1 truncate">{client}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">{d.count} job{d.count === 1 ? '' : 's'}</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 w-20 text-right whitespace-nowrap">{compactINR(d.value)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No client data available</p>
            )}
          </div>
        </div>

        {/* Recent Business Activity */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Recent Business Activity</h3>
          <div className="space-y-2.5">
            {data.recent.map((e) => (
              <div key={e._id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{e.client}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    Job #{e.jobNumber}
                    {isAdmin && <span> • {getSalesPersonName(e)}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-semibold text-green-600">{compactINR(e.estimateAmount)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{formatDate(e.entryDate || e.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessAnalytics;
