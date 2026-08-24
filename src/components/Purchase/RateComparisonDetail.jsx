import { useState } from 'react';
import { inr, fmtDate, fmtDateTime } from '../../config/finance';
import { exportRateComparisonPdf } from '../../utils/pdfExport';
import {
  rcStatusMeta, canApproveRateComparisons, canEditComparison, canRaisePo,
  DIRECTOR_QUICK_REMARKS, MIN_QUOTATIONS_TO_SUBMIT,
} from '../../config/rateComparison';

const Stat = ({ label, value, tone = 'text-gray-800' }) => (
  <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-center">
    <p className={`text-sm font-bold ${tone} leading-none truncate`}>{value}</p>
    <p className="text-[10px] text-gray-500 mt-1 leading-none">{label}</p>
  </div>
);

/**
 * Side-by-side rate comparison, and the Director's decision controls.
 *
 * The Purchase Team sees the same view read-only. The comparison table is the
 * point of the screen: the cheapest quote and the recommended one are marked so
 * the Director can judge at a glance whether the recommendation makes sense.
 */
const RateComparisonDetail = ({
  comparison, currentUser, onClose, onDecide, onSubmit, onEdit, onCreatePo,
}) => {
  const [decision, setDecision] = useState(null); // 'approved' | 'rejected' | 'sent_back'
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const rc = comparison;
  const meta = rcStatusMeta(rc.status);
  const mayDecide = canApproveRateComparisons(currentUser);
  const isPending = rc.status === 'pending_approval';
  const summary = rc.summary;
  const quotes = rc.quotations || [];
  const history = [...(rc.history || [])].reverse();

  const lowestTotal = quotes.length ? Math.min(...quotes.map((q) => q.totalAmount || Infinity)) : 0;

  const act = async (kind) => {
    if (kind !== 'approved' && !remarks.trim()) {
      setError(kind === 'rejected'
        ? 'Please give a reason for rejecting this comparison.'
        : 'Please explain what the Purchase Team should change.');
      return;
    }
    setBusy(kind);
    setError('');
    const res = await onDecide(rc._id, kind, remarks.trim());
    setBusy(null);
    if (res.success) onClose();
    else setError(res.message || 'Could not record the decision.');
  };

  const submit = async () => {
    setBusy('submit');
    setError('');
    const res = await onSubmit(rc._id);
    setBusy(null);
    if (res.success) onClose();
    else setError(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-800 font-mono">{rc.comparisonNumber}</h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
              {rc.revisionCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                  Revision {rc.revisionCount}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {rc.materialName} · {rc.requiredQuantity} {rc.unit} · {fmtDate(rc.comparisonDate)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}

          {rc.materialDescription && (
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{rc.materialDescription}</p>
          )}

          {/* At-a-glance */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Vendors compared" value={summary.vendorCount} />
              <Stat label="Lowest quote" value={inr(summary.lowest.totalAmount)} tone="text-emerald-600" />
              <Stat label="Price spread" value={inr(summary.spread)} tone="text-gray-700" />
              <Stat
                label={summary.selected ? (summary.selected.isLowest ? 'Recommended (lowest)' : 'Recommended') : 'Recommended'}
                value={summary.selected ? inr(summary.selected.totalAmount) : '—'}
                tone={summary.selected?.isLowest ? 'text-emerald-600' : 'text-amber-600'}
              />
            </div>
          )}

          {/* The Director's key question: is the recommendation the cheapest? */}
          {summary?.selected && !summary.selected.isLowest && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 text-xs text-amber-900">
              <strong>{summary.selected.vendorName}</strong> is recommended at {inr(summary.selected.totalAmount)} —
              that is <strong>{inr(summary.selected.premiumOverLowest)} more</strong> than the lowest quote
              from {summary.lowest.vendorName}. The Purchase Team's reasoning is below.
            </div>
          )}

          {/* Side-by-side comparison */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Vendor Comparison</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 font-semibold">Vendor</th>
                    <th className="px-3 py-2 font-semibold text-right">Rate</th>
                    <th className="px-3 py-2 font-semibold text-right">Tax</th>
                    <th className="px-3 py-2 font-semibold text-right">Total</th>
                    <th className="px-3 py-2 font-semibold text-center">Delivery Time</th>
                    <th className="px-3 py-2 font-semibold">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const isLowest = q.totalAmount === lowestTotal;
                    return (
                      <tr key={q._id}
                        className={`border-t border-gray-100 ${q.isSelected ? 'bg-emerald-50/60' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {q.isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Recommended" />
                            )}
                            <span className="font-medium text-gray-800">{q.vendorName}</span>
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {q.isSelected && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Recommended</span>
                            )}
                            {isLowest && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Lowest</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{inr(q.quotedRate)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{q.taxPercent}%<br /><span className="text-[10px]">{inr(q.taxAmount)}</span></td>
                        <td className={`px-3 py-2 text-right font-bold ${isLowest ? 'text-emerald-700' : 'text-gray-800'}`}>
                          {inr(q.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{q.deliveryTime || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{q.paymentTerms || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {rc.comparisonRemarks && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Purchase Team's Reasoning</h3>
              <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{rc.comparisonRemarks}</p>
            </div>
          )}

          {/* Provenance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3">
            <div><span className="text-gray-400">Created by</span><br />{rc.createdByName || '—'}</div>
            <div><span className="text-gray-400">Submitted by</span><br />{rc.submittedByName || '—'}</div>
            <div><span className="text-gray-400">Submitted</span><br />{fmtDate(rc.submittedAt)}</div>
            <div><span className="text-gray-400">Purchase Order</span><br />{rc.poNumber || '—'}</div>
          </div>

          {/* Director's recorded decision */}
          {rc.directorReview?.decision && (
            <div className={`rounded-lg p-3 text-xs ${
              rc.directorReview.decision === 'approved' ? 'bg-green-50 border border-green-200 text-green-800'
                : rc.directorReview.decision === 'rejected' ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-orange-50 border border-orange-200 text-orange-800'
            }`}>
              <p className="font-semibold">
                {rcStatusMeta(rc.directorReview.decision).label} by {rc.directorReview.reviewedByName}
                {' · '}{fmtDateTime(rc.directorReview.reviewedAt)}
              </p>
              {rc.directorReview.remarks && <p className="mt-1 whitespace-pre-wrap">{rc.directorReview.remarks}</p>}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">History</h3>
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rcStatusMeta(h.toStatus).dot}`} />
                    <span className="font-medium text-gray-700 capitalize">{String(h.action).replace(/_/g, ' ')}</span>
                    <span className="text-gray-500">{h.byName || 'System'}</span>
                    {h.remarks && <span className="text-gray-500 truncate max-w-[220px]" title={h.remarks}>— {h.remarks}</span>}
                    <span className="text-gray-400 ml-auto flex-shrink-0">{fmtDateTime(h.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 px-5 py-3 space-y-2">
          <button
            onClick={() => exportRateComparisonPdf(rc)}
            className="w-full px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Rate Comparison PDF
          </button>
          {/* Director decision controls */}
          {mayDecide && isPending && (
            <div className="space-y-2">
              {decision && decision !== 'approved' && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {DIRECTOR_QUICK_REMARKS.map((r) => (
                      <button key={r} type="button" onClick={() => setRemarks(r)}
                        className="px-2 py-1 text-[10px] rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder={decision === 'rejected'
                      ? 'Reason for rejection (required)'
                      : 'What should the Purchase Team change? (required)'}
                    className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </>
              )}
              {(!decision || decision === 'approved') && (
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Instructions or remarks (optional for approval)"
                  className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={() => (decision === 'rejected' ? act('rejected') : setDecision('rejected'))}
                  disabled={!!busy}
                  className="flex-1 min-w-[110px] px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {busy === 'rejected' ? 'Rejecting...' : decision === 'rejected' ? 'Confirm Rejection' : 'Reject'}
                </button>
                <button onClick={() => (decision === 'sent_back' ? act('sent_back') : setDecision('sent_back'))}
                  disabled={!!busy}
                  className="flex-1 min-w-[110px] px-3 py-2 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {busy === 'sent_back' ? 'Sending back...' : decision === 'sent_back' ? 'Confirm Send Back' : 'Send Back'}
                </button>
                <button onClick={() => act('approved')} disabled={!!busy}
                  className="flex-1 min-w-[110px] px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {busy === 'approved' ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          )}

          {/* Purchase Team controls */}
          {!mayDecide && isPending && (
            <p className="text-[11px] text-gray-500 text-center">
              Waiting on the Director. You'll be notified when a decision is recorded.
            </p>
          )}

          {canEditComparison(rc) && (
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button onClick={() => onEdit(rc)}
                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                  Edit
                </button>
              )}
              <button onClick={submit} disabled={!!busy || quotes.length < MIN_QUOTATIONS_TO_SUBMIT || !rc.selectedVendor}
                title={quotes.length < MIN_QUOTATIONS_TO_SUBMIT
                  ? `Add at least ${MIN_QUOTATIONS_TO_SUBMIT} quotations first`
                  : !rc.selectedVendor ? 'Recommend a vendor first' : ''}
                className="ml-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {busy === 'submit'
                  ? 'Submitting...'
                  : rc.status === 'sent_back' ? 'Resubmit to Director' : 'Submit to Director'}
              </button>
            </div>
          )}

          {canRaisePo(rc) && onCreatePo && (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-green-700 flex-1">
                Approved — you can now raise the purchase order for {rc.selectedVendorName}.
              </p>
              <button onClick={() => onCreatePo(rc)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex-shrink-0">
                Create Purchase Order
              </button>
            </div>
          )}

          {rc.purchaseOrder && (
            <p className="text-[11px] text-gray-600 text-center">
              Purchase order <strong className="font-mono">{rc.poNumber}</strong> was raised from this comparison.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateComparisonDetail;
