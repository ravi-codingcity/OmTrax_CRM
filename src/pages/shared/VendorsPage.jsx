import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVendors } from '../../context/VendorContext';
import MainLayout from '../../components/Layout/MainLayout';
import PullToRefresh from '../../components/Common/PullToRefresh';
import VendorTable from '../../components/Vendor/VendorTable';
import VendorModal from '../../components/Vendor/VendorModal';
import KycReviewPanel from '../../components/Vendor/KycReviewPanel';
import KycRequestModal from '../../components/Vendor/KycRequestModal';
import {
  KYC_STATUSES, kycStatusMeta, canEditVendors, canReviewKyc, isCrmAdmin,
} from '../../config/finance';
import { kycTypesForUser } from '../../config/departments';

/**
 * The shared vendor register. Purchase and Finance render the SAME data from
 * the same endpoint — only the available actions differ, driven by role.
 */
const VendorsPage = ({ department = 'purchase' }) => {
  const { user } = useAuth();
  const {
    vendors, loading, fetchVendors, getVendor,
    addVendor, createKycRequest, updateVendor, deleteVendor,
    markKycLinkSent, startKycReview, decideKyc,
  } = useVendors();

  // Two distinct permissions: editing the record, and requesting a KYC.
  // Finance can do the second but not the first.
  const mayEdit = canEditVendors(user);
  // May they generate EITHER form? Checking only 'purchase' would hide the
  // button from Operations staff, who can generate the Operations form.
  const mayRequestKyc = kycTypesForUser(user).length > 0;
  const mayReview = canReviewKyc(user);
  const isFinanceView = department === 'finance';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [modal, setModal] = useState({ open: false, mode: 'add', vendor: null });
  const [kycRequestOpen, setKycRequestOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => { await fetchVendors(); }, [fetchVendors]);
  useEffect(() => { loadData(); }, [loadData]);

  const flash = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (statusFilter && v.kycStatus !== statusFilter) return false;
      if (sourceFilter && (v.kycType || 'purchase') !== sourceFilter) return false;
      if (!term) return true;
      return [v.vendorName, v.companyName, v.contactPerson, v.email, v.phone, v.gstNumber, v.panNumber]
        .some((f) => (f || '').toLowerCase().includes(term));
    });
  }, [vendors, search, statusFilter, sourceFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter, sourceFilter]);

  const counts = useMemo(() => {
    const c = { total: vendors.length };
    KYC_STATUSES.forEach((s) => { c[s] = vendors.filter((v) => v.kycStatus === s).length; });
    c.awaiting = c.submitted + c.under_review;
    return c;
  }, [vendors]);

  // Open a full record — refetched so documents and history are current
  const openRecord = async (vendor) => {
    const full = await getVendor(vendor._id);
    setReviewTarget(full || vendor);
  };

  const handleSubmit = async (payload) => {
    const res = modal.mode === 'add'
      ? await addVendor(payload)
      : await updateVendor(modal.vendor._id, payload);
    if (res.success) flash(modal.mode === 'add' ? 'Vendor added successfully.' : 'Vendor updated successfully.');
    return res;
  };

  const handleDecide = async (id, decision, remarks) => {
    const res = await decideKyc(id, decision, remarks);
    if (res.success) { flash(`Vendor KYC ${decision}. Purchase has been notified.`); loadData(); }
    return res;
  };

  const confirmDelete = async () => {
    const res = await deleteVendor(deleteTarget._id);
    setDeleteTarget(null);
    flash(res.success ? 'Vendor deleted.' : (res.message || 'Failed to delete vendor.'));
  };

  const chip = (label, value, active, onClick, tone = 'gray') => (
    <button
      key={label}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        active ? 'bg-amber-600 text-white border-amber-600' : `bg-white text-${tone}-700 border-gray-200 hover:bg-gray-50`
      }`}
    >
      {label} <span className="opacity-70">{value}</span>
    </button>
  );

  return (
    <MainLayout>
      <PullToRefresh onRefresh={loadData} disabled={loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Vendors</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {isFinanceView
                  ? 'Review vendor KYC submissions and record approval decisions.'
                  : 'Manage vendors, share KYC forms and track Finance approval.'}
                {' '}Shared with {isFinanceView ? 'Purchase' : 'Finance'}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {mayRequestKyc && (
                <button
                  onClick={() => setKycRequestOpen(true)}
                  title="Send a KYC form and let the vendor fill in their own details"
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
                  </svg>
                  Generate KYC Link
                </button>
              )}
              {mayEdit && (
                <button
                  onClick={() => setModal({ open: true, mode: 'add', vendor: null })}
                  title="Enter the vendor's details yourself"
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Vendor
                </button>
              )}
            </div>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{message}</div>
          )}

          {!mayEdit && mayReview && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-lg text-xs">
              Finance reviews and verifies vendor records. Editing vendor details is handled by the
              Purchase Manager — ask them to correct anything that looks wrong.
            </div>
          )}

          {/* Awaiting-Finance banner — the visual highlight Purchase needs */}
          {counts.awaiting > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <p className="text-xs sm:text-sm text-amber-900">
                <strong>{counts.awaiting}</strong> vendor{counts.awaiting === 1 ? '' : 's'}{' '}
                {isFinanceView ? 'awaiting your review.' : 'pending Finance approval.'}
              </p>
              <button
                onClick={() => setStatusFilter(statusFilter === 'submitted' ? '' : 'submitted')}
                className="ml-auto text-xs font-medium text-amber-800 underline underline-offset-2 flex-shrink-0"
              >
                {statusFilter === 'submitted' ? 'Show all' : 'Show them'}
              </button>
            </div>
          )}

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {chip('All', counts.total, !statusFilter, () => setStatusFilter(''))}
            {KYC_STATUSES.map((s) =>
              chip(kycStatusMeta(s).label, counts[s], statusFilter === s, () => setStatusFilter(statusFilter === s ? '' : s))
            )}
          </div>

          {/* Search + source filter */}
          <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendor, company, contact, GST, PAN..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white min-w-[150px]"
              >
                <option value="">All departments</option>
                <option value="purchase">Purchase Department</option>
                <option value="operations">Operations Department</option>
              </select>
              {(search || statusFilter || sourceFilter) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter(''); setSourceFilter(''); }}
                  className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing {filtered.length ? start + 1 : 0}–{Math.min(start + perPage, filtered.length)} of {filtered.length} vendors
            </p>
          </div>

          {/* No KYC-link action here — that button lives at the top of the page */}
          <VendorTable
            vendors={pageItems}
            currentUser={user}
            onView={openRecord}
            onReview={mayReview ? openRecord : null}
            onEdit={mayEdit ? (v) => setModal({ open: true, mode: 'edit', vendor: v }) : null}
            onDelete={isCrmAdmin(user) ? setDeleteTarget : null}
            emptyMessage={search || statusFilter ? 'No vendors match these filters' : 'No vendors yet'}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-4 py-3 border border-gray-100">
              <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      {modal.open && (
        <VendorModal
          mode={modal.mode}
          vendor={modal.vendor}
          onClose={() => setModal({ open: false, mode: 'add', vendor: null })}
          onSubmit={handleSubmit}
        />
      )}

      {kycRequestOpen && (
        <KycRequestModal
          onClose={() => { setKycRequestOpen(false); loadData(); }}
          onGenerate={createKycRequest}
          onMarkSent={markKycLinkSent}
          user={user}
        />
      )}


      {reviewTarget && (
        <KycReviewPanel
          vendor={reviewTarget}
          currentUser={user}
          onClose={() => { setReviewTarget(null); loadData(); }}
          onStartReview={async (id) => {
            const res = await startKycReview(id);
            if (res.success) setReviewTarget(res.data);
            return res;
          }}
          onDecide={handleDecide}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800">Delete vendor?</h3>
            <p className="text-sm text-gray-600 mt-1.5">
              <strong>{deleteTarget.vendorName}</strong> will be removed from the vendor register.
              Existing purchase orders keep their record of it.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={confirmDelete}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default VendorsPage;
