import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRecruitment } from '../../context/RecruitmentContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import RecruitmentTable from '../../components/HR/RecruitmentTable';
import CollapsibleSection from '../../components/Common/CollapsibleSection';
import { RECRUITERS, isRecruiter, roleLabel } from '../../config/hr';

const HrDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entries, recruiters, loading, fetchEntries, fetchRecruiters, fetchStats } = useRecruitment();
  const [stats, setStats] = useState(null);

  const recruiterView = isRecruiter(user);

  const [search, setSearch] = useState('');
  const [recruiterFilter, setRecruiterFilter] = useState('');

  const loadData = useCallback(async () => {
    const [, , s] = await Promise.all([fetchEntries(), fetchRecruiters(), fetchStats()]);
    setStats(s);
  }, [fetchEntries, fetchRecruiters, fetchStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const totals = stats?.totals || {};
  const feedback = stats?.feedback || {};
  const byRecruiter = stats?.byRecruiter || [];
  const byClient = stats?.byClient || [];
  const maxRecruiter = Math.max(1, ...byRecruiter.map((r) => r.requirements || 0));
  const recruiterNames = recruiters.length ? recruiters.map((r) => r.name) : RECRUITERS;

  const kpis = [
    { label: 'Positions', value: totals.total || 0, color: 'text-gray-800' },
    { label: 'CVs Submitted', value: totals.cvsSubmitted || 0, color: 'text-blue-600' },
    { label: 'Short Listed', value: feedback['Short Listed'] || 0, color: 'text-green-600' },
    { label: 'Hold', value: feedback['Hold'] || 0, color: 'text-amber-600' },
    { label: 'Rejected', value: feedback['Rejected'] || 0, color: 'text-red-600' },
    { label: 'Pending', value: feedback['Feedback Pending'] || 0, color: 'text-gray-500' },
    { label: 'Interview Aligned', value: feedback['Interview Aligned'] || 0, color: 'text-green-600' },
  ];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch = !term ||
        e.clientName?.toLowerCase().includes(term) ||
        e.position?.toLowerCase().includes(term) ||
        e.recruiterName?.toLowerCase().includes(term) ||
        e.salesPersonName?.toLowerCase().includes(term);
      const matchesRecruiter = !recruiterFilter || e.recruiterName === recruiterFilter;
      return matchesSearch && matchesRecruiter;
    });
  }, [entries, search, recruiterFilter]);

  const recent = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    [filtered]
  );

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">HR Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {roleLabel(user?.role)} · {recruiterView ? 'Your assigned requirements' : 'Recruitment performance overview'}
              </p>
            </div>
            <button
              onClick={() => navigate('/hr/requirements')}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center w-full sm:w-auto"
            >
              {recruiterView ? 'My Tasks' : 'Manage Requirements'}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {kpis.map((f) => (
              <div key={f.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
                <p className={`text-xl sm:text-2xl font-bold ${f.color}`}>{f.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Performance by Recruiter + Top Clients side by side (collapsible) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance by Recruiter */}
            <CollapsibleSection title={recruiterView ? 'My Performance' : 'Performance by Recruiter'} badge={byRecruiter.length}>
              {byRecruiter.length ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {byRecruiter.map((r) => (
                    <div key={r.name}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{r.name}</span>
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">{r.requirements} pos · {r.cvsSubmitted} CVs · {r.shortlisted} SL</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: `${(r.requirements / maxRecruiter) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No recruiter data yet</p>
              )}
            </CollapsibleSection>

            {/* Top Clients */}
            <CollapsibleSection title="Top Clients" badge={byClient.length}>
              {byClient.length ? (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {byClient.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                        <span className="text-sm text-gray-700 truncate">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{c.requirements} pos · {c.cvsSubmitted} CVs</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No client data yet</p>
              )}
            </CollapsibleSection>
          </div>

          {/* Recent requirements with filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Recent Requirements</h3>
              <button onClick={() => navigate('/hr/requirements')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</button>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search client, position, recruiter..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!recruiterView && (
                  <select
                    value={recruiterFilter}
                    onChange={(e) => setRecruiterFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 min-w-[140px]"
                  >
                    <option value="">All recruiters</option>
                    {recruiterNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
                <span className="text-xs text-gray-500 ml-auto">Showing {recent.length} of {filtered.length}</span>
              </div>
            </div>

            <RecruitmentTable entries={recent} currentUser={user} />
          </div>
        </div>
      </PullToRefresh>
    </MainLayout>
  );
};

export default HrDashboard;
