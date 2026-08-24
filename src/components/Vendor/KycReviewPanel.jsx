import { useState } from 'react';
import {
  kycStatusMeta, kycSourceLabel, fmtDate, fmtDateTime, canReviewKyc, inr,
} from '../../config/finance';
import KycDocumentList from './KycDocumentList';

const Row = ({ label, value, mono = false }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[11px] text-gray-500 flex-shrink-0">{label}</span>
    <span className={`text-xs text-right break-words ${mono ? 'font-mono' : 'font-medium'} text-gray-800`}>
      {value || '—'}
    </span>
  </div>
);

const TabBtn = ({ id, children, count, active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {children}{count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
  </button>
);

/**
 * Full vendor + KYC record drawer.
 *
 * Finance sees Approve / Reject controls. Purchase sees exactly the same
 * information but read-only — the decision buttons are not rendered for them,
 * and the backend refuses the call regardless.
 */
const KycReviewPanel = ({ vendor, currentUser, onClose, onStartReview, onDecide }) => {
  const [tab, setTab] = useState('details');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [showReject, setShowReject] = useState(false);

  const meta = kycStatusMeta(vendor.kycStatus);
  const mayReview = canReviewKyc(currentUser);
  const isDecidable = ['submitted', 'under_review'].includes(vendor.kycStatus);
  const docs = vendor.kycDocuments || [];
  const materials = vendor.materials || [];
  const services = vendor.services || [];
  const history = [...(vendor.kycHistory || [])].reverse();

  const decide = async (decision) => {
    if (decision === 'rejected' && !remarks.trim()) {
      setError('Please give a reason for rejecting this KYC.');
      return;
    }
    setBusy(decision);
    setError('');
    const res = await onDecide(vendor._id, decision, remarks.trim());
    setBusy(null);
    if (res.success) onClose();
    else setError(res.message || 'Could not record the decision.');
  };

  const startReview = async () => {
    setBusy('review');
    const res = await onStartReview(vendor._id);
    setBusy(null);
    if (!res.success) setError(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-800 truncate">{vendor.vendorName}</h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {vendor.companyName || '—'} · KYC via {kycSourceLabel(vendor.kycSource)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 border-b border-gray-100 flex gap-1 flex-wrap">
          <TabBtn id="details" active={tab === 'details'} onSelect={setTab}>Details</TabBtn>
          <TabBtn id="bank" active={tab === 'bank'} onSelect={setTab}>Bank &amp; Tax</TabBtn>
          <TabBtn id="materials" count={materials.length + services.length} active={tab === 'materials'} onSelect={setTab}>Materials &amp; Services</TabBtn>
          <TabBtn id="docs" count={docs.length} active={tab === 'docs'} onSelect={setTab}>Documents</TabBtn>
          <TabBtn id="history" count={history.length} active={tab === 'history'} onSelect={setTab}>History</TabBtn>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-3">{error}</div>}

          {tab === 'details' && (
            <div className="space-y-0.5">
              <Row label="Vendor Name" value={vendor.vendorName} />
              <Row label="Company / Legal Name" value={vendor.companyName} />
              <Row label="Contact Person" value={vendor.contactPerson} />
              <Row label="Email" value={vendor.email} />
              <Row label="Phone" value={vendor.phone} />
              {/* Removed from the Add Vendor form — still shown when an older record has one */}
              {vendor.category && <Row label="Category" value={vendor.category} />}
              <Row label="Address" value={vendor.address} />
              <Row label="City / State" value={[vendor.city, vendor.state].filter(Boolean).join(', ')} />
              <Row label="Pincode" value={vendor.pincode} mono />
              {vendor.paymentTerms && <Row label="Payment Terms" value={vendor.paymentTerms} />}
              <Row label="Created By" value={vendor.createdByName || vendor.createdBy?.name} />
              <Row label="KYC Submitted" value={fmtDateTime(vendor.kycSubmittedAt)} />
              {vendor.kycAdditionalInfo && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Additional information from vendor</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{vendor.kycAdditionalInfo}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'bank' && (
            <div className="space-y-0.5">
              <Row label="GST Number" value={vendor.gstNumber} mono />
              <Row label="PAN" value={vendor.panNumber} mono />
              <Row label="Bank Name" value={vendor.bankName} />
              <Row label="Account Holder" value={vendor.accountHolderName} />
              <Row label="Account Number" value={vendor.accountNumber} mono />
              <Row label="IFSC Code" value={vendor.ifscCode} mono />
              {!vendor.bankName && !vendor.accountNumber && (
                <p className="text-xs text-gray-500 italic mt-3">
                  Banking details have not been submitted yet.
                </p>
              )}
            </div>
          )}

          {tab === 'materials' && (
            (materials.length || services.length) ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Materials ({materials.length})
                  </p>
                  {materials.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {materials.map((m, i) => (
                        <li key={m._id || i}
                          className="px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-[11px]">
                          {m.materialName}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-gray-500 italic">None selected.</p>}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Services ({services.length})
                  </p>
                  {services.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {services.map((sv, i) => (
                        <li key={sv._id || i}
                          className="px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-[11px]">
                          {sv.serviceName}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-gray-500 italic">None selected.</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Nothing was submitted.</p>
            )
          )}

          {tab === 'docs' && (
            <KycDocumentList vendorId={vendor._id} fallbackDocuments={docs} />
          )}

          {tab === 'history' && (
            history.length ? (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${kycStatusMeta(h.toStatus).dot}`} />
                      {i < history.length - 1 && <span className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-medium text-gray-800 capitalize">{String(h.action).replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-gray-500">
                        {h.byName || 'System'}{h.byRole ? ` · ${h.byRole}` : ''} · {fmtDateTime(h.at)}
                      </p>
                      {h.remarks && <p className="text-[11px] text-gray-600 mt-0.5 break-words">{h.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No history yet.</p>
            )
          )}
        </div>

        {/* Finance decision footer */}
        <div className="border-t border-gray-200 px-5 py-3">
          {vendor.financeReview?.decision && (
            <div className={`mb-3 rounded-lg p-2.5 text-xs ${
              vendor.financeReview.decision === 'approved'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-semibold">
                {vendor.financeReview.decision === 'approved' ? 'Approved' : 'Rejected'} by {vendor.financeReview.reviewedByName}
                {' · '}{fmtDate(vendor.financeReview.reviewedAt)}
              </p>
              {vendor.financeReview.remarks && <p className="mt-0.5">{vendor.financeReview.remarks}</p>}
            </div>
          )}

          {!mayReview && (
            <p className="text-[11px] text-gray-500 text-center">
              Vendor KYC is approved or rejected by the Finance department.
            </p>
          )}

          {mayReview && isDecidable && (
            <div className="space-y-2">
              {vendor.kycStatus === 'submitted' && (
                <button onClick={startReview} disabled={!!busy}
                  className="w-full px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50">
                  {busy === 'review' ? 'Working...' : 'Mark as Under Review'}
                </button>
              )}

              {showReject && (
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="Reason for rejection (required) — e.g. PAN does not match the company name"
                  className="w-full px-2.5 py-2 text-xs border border-red-300 rounded-lg focus:ring-1 focus:ring-red-500 resize-none"
                />
              )}
              {!showReject && (
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Review remarks (optional for approval)"
                  className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              )}

              <div className="flex gap-2">
                <button onClick={() => (showReject ? decide('rejected') : setShowReject(true))} disabled={!!busy}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {busy === 'rejected' ? 'Rejecting...' : showReject ? 'Confirm Rejection' : 'Reject'}
                </button>
                <button onClick={() => decide('approved')} disabled={!!busy}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {busy === 'approved' ? 'Approving...' : 'Approve KYC'}
                </button>
              </div>
            </div>
          )}

          {mayReview && !isDecidable && !vendor.financeReview?.decision && (
            <p className="text-[11px] text-gray-500 text-center">
              This vendor has not submitted their KYC yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KycReviewPanel;
