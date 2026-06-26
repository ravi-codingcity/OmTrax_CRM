import { useEffect, useCallback, useMemo } from 'react';
import { useRecruitment } from '../../context/RecruitmentContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import { FEEDBACK_OPTIONS, feedbackBadge } from '../../config/hr';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const FEEDBACK_BAR = {
  'Short Listed': 'bg-green-500',
  Hold: 'bg-amber-500',
  Rejected: 'bg-red-500',
  'Feedback Pending': 'bg-gray-400',
  'Interview Aligned': 'bg-blue-500',
};

const HrAnalytics = () => {
  const { entries, loading, fetchEntries } = useRecruitment();

  const loadData = useCallback(async () => { await fetchEntries(); }, [fetchEntries]);
  useEffect(() => { loadData(); }, [loadData]);

  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    const monthIdx = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      monthIdx[key] = months.length;
      months.push({ key, label: monthLabel(key), positions: 0, cvsSubmitted: 0 });
    }

    let cvsSubmitted = 0;
    const feedback = { 'Short Listed': 0, Hold: 0, Rejected: 0, 'Feedback Pending': 0 };
    const byRecruiter = {};
    const byClient = {};

    entries.forEach((e) => {
      cvsSubmitted += Number(e.cvsSubmitted || 0);
      const fb = e.feedback || 'Feedback Pending';
      if (feedback[fb] !== undefined) feedback[fb] += 1;

      const d = new Date(e.positionReceivedDate || e.entryDate || e.createdAt);
      if (!isNaN(d.getTime())) {
        const key = monthKey(d);
        if (key in monthIdx) {
          months[monthIdx[key]].positions += 1;
          months[monthIdx[key]].cvsSubmitted += Number(e.cvsSubmitted || 0);
        }
      }

      const rn = e.recruiterName || 'Unassigned';
      if (!byRecruiter[rn]) byRecruiter[rn] = { name: rn, positions: 0, cvsSubmitted: 0, shortlisted: 0, hold: 0, rejected: 0, pending: 0 };
      byRecruiter[rn].positions += 1;
      byRecruiter[rn].cvsSubmitted += Number(e.cvsSubmitted || 0);
      if (fb === 'Short Listed') byRecruiter[rn].shortlisted += 1;
      else if (fb === 'Hold') byRecruiter[rn].hold += 1;
      else if (fb === 'Rejected') byRecruiter[rn].rejected += 1;
      else byRecruiter[rn].pending += 1;

      const cn = e.clientName || 'Unknown';
      if (!byClient[cn]) byClient[cn] = { name: cn, positions: 0, cvsSubmitted: 0, shortlisted: 0 };
      byClient[cn].positions += 1;
      byClient[cn].cvsSubmitted += Number(e.cvsSubmitted || 0);
      if (fb === 'Short Listed') byClient[cn].shortlisted += 1;
    });

    const recruiterList = Object.values(byRecruiter).sort((a, b) => (b.shortlisted - a.shortlisted) || (b.positions - a.positions));
    const clientList = Object.values(byClient).sort((a, b) => b.positions - a.positions);

    return {
      total: entries.length,
      cvsSubmitted,
      feedback,
      months,
      maxMonthPos: Math.max(1, ...months.map((m) => m.positions)),
      maxMonthCv: Math.max(1, ...months.map((m) => m.cvsSubmitted)),
      recruiterList,
      clientList,
      recent: [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    };
  }, [entries]);

  const kpis = [
    { label: 'Positions', value: data.total, color: 'text-gray-800', ring: 'border-gray-300' },
    { label: 'CVs Submitted', value: data.cvsSubmitted, color: 'text-blue-600', ring: 'border-blue-400' },
    { label: 'Short Listed', value: data.feedback['Short Listed'], color: 'text-green-600', ring: 'border-green-400' },
    { label: 'Hold', value: data.feedback['Hold'], color: 'text-amber-600', ring: 'border-amber-400' },
    { label: 'Rejected', value: data.feedback['Rejected'], color: 'text-red-600', ring: 'border-red-400' },
    { label: 'Pending', value: data.feedback['Feedback Pending'], color: 'text-gray-500', ring: 'border-gray-300' },
  ];

  if (loading && !entries.length) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">HR Analytics</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Recruitment performance & submission insights</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className={`bg-white rounded-xl shadow-sm p-3 text-center border-l-4 ${k.ring}`}>
                <p className={`text-lg sm:text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Feedback distribution + monthly positions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Feedback Distribution</h3>
              <div className="space-y-2.5">
                {FEEDBACK_OPTIONS.map((f) => {
                  const v = data.feedback[f] || 0;
                  return (
                    <div key={f}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{f}</span>
                        <span className="font-semibold text-gray-800">{v} ({pct(v, data.total)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`${FEEDBACK_BAR[f]} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct(v, data.total)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Positions Received (Monthly)</h3>
              <div className="flex items-end justify-between gap-2 h-40">
                {data.months.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.positions}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all duration-500" style={{ height: `${Math.max((m.positions / data.maxMonthPos) * 100, m.positions > 0 ? 4 : 0)}%` }} title={`${m.label}: ${m.positions} positions`}></div>
                    <span className="text-[10px] text-gray-500 mt-1.5">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">Positions received per month</p>
            </div>
          </div>

          {/* CV submission trend (full width) */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">CVs Submitted Trend (Monthly)</h3>
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-40">
              {data.months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-medium text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.cvsSubmitted}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500" style={{ height: `${Math.max((m.cvsSubmitted / data.maxMonthCv) * 100, m.cvsSubmitted > 0 ? 4 : 0)}%` }} title={`${m.label}: ${m.cvsSubmitted} CVs`}></div>
                  <span className="text-[10px] text-gray-500 mt-1.5">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiter Performance */}
          <CollapsibleSection title="Recruiter Performance" badge={data.recruiterList.length} defaultOpen>
            {data.recruiterList.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-2 py-2">Recruiter</th>
                      <th className="px-2 py-2 text-center">Positions</th>
                      <th className="px-2 py-2 text-center">CVs</th>
                      <th className="px-2 py-2 text-center">Short Listed</th>
                      <th className="px-2 py-2 text-center">Hold</th>
                      <th className="px-2 py-2 text-center">Rejected</th>
                      <th className="px-2 py-2 text-center">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recruiterList.map((r) => (
                      <tr key={r.name} className="hover:bg-gray-50">
                        <td className="px-2 py-2 font-medium text-gray-800 whitespace-nowrap">{r.name}</td>
                        <td className="px-2 py-2 text-center text-gray-700">{r.positions}</td>
                        <td className="px-2 py-2 text-center text-gray-700">{r.cvsSubmitted}</td>
                        <td className="px-2 py-2 text-center font-semibold text-green-600">{r.shortlisted}</td>
                        <td className="px-2 py-2 text-center text-amber-600">{r.hold}</td>
                        <td className="px-2 py-2 text-center text-red-600">{r.rejected}</td>
                        <td className="px-2 py-2 text-center text-gray-500">{r.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recruiter data yet</p>
            )}
          </CollapsibleSection>

          {/* Top recruiters + Client-wise */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <CollapsibleSection title="Top Performing Recruiters" defaultOpen>
              {data.recruiterList.length ? (
                <div className="space-y-2.5">
                  {data.recruiterList.slice(0, 5).map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-[11px] text-gray-500">{r.positions} positions · {r.cvsSubmitted} CVs</p>
                      </div>
                      <span className="text-sm font-bold text-green-600 whitespace-nowrap">{r.shortlisted} SL</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Client-wise Performance" badge={data.clientList.length} defaultOpen>
              {data.clientList.length ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {data.clientList.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                        <span className="text-sm text-gray-700 truncate">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{c.positions} pos · {c.cvsSubmitted} CVs · {c.shortlisted} SL</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </CollapsibleSection>
          </div>

          {/* Recent activities */}
          <CollapsibleSection title="Recent Activities" defaultOpen>
            {data.recent.length ? (
              <div className="divide-y divide-gray-50">
                {data.recent.map((e) => (
                  <div key={e._id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.position} <span className="text-gray-400 font-normal">@ {e.clientName}</span></p>
                      <p className="text-[11px] text-gray-500 truncate">Recruiter: {e.recruiterName || '—'} · {e.cvsSubmitted || 0} CVs</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${feedbackBadge(e.feedback)}`}>{e.feedback || 'Feedback Pending'}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(e.assignDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </CollapsibleSection>
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default HrAnalytics;
