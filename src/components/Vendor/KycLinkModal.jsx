import { useState } from 'react';
import { kycStatusMeta, kycSourceLabel, fmtDateTime } from '../../config/finance';

/**
 * Generate and share a vendor's public KYC form link.
 *
 * The source department is recorded server-side from whoever is logged in —
 * this modal only surfaces it. Regenerating a link for an already-approved
 * vendor resets that approval, so it asks for explicit confirmation first.
 */
const KycLinkModal = ({ vendor, onClose, onGenerate, onMarkSent }) => {
  const [link, setLink] = useState(vendor?.kycLink || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sentNote, setSentNote] = useState('');

  const meta = kycStatusMeta(vendor?.kycStatus);
  const isApproved = vendor?.kycStatus === 'approved';

  const generate = async (opts = {}) => {
    setBusy(true);
    setError('');
    const res = await onGenerate(vendor._id, opts);
    setBusy(false);

    if (res.success) {
      setLink(res.data.kycLink);
      setConfirmReset(false);
    } else if (res.requiresConfirmation) {
      setConfirmReset(true);
    } else {
      setError(res.message || 'Could not generate the link.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select the link and copy it manually.');
    }
  };

  const share = async (method) => {
    const res = await onMarkSent(vendor._id, method);
    if (res.success) setSentNote(`Recorded as shared via ${method}.`);
    else setError(res.message);
  };

  const mailto = () => {
    const subject = encodeURIComponent('OmTrax — Vendor KYC Form');
    const body = encodeURIComponent(
      `Dear ${vendor.contactPerson || vendor.vendorName},\n\n` +
      `Please complete your vendor KYC using the secure link below:\n\n${link}\n\n` +
      `The link is unique to you and will expire in 30 days.\n\nRegards,\nOmTrax`
    );
    window.open(`mailto:${vendor.email || ''}?subject=${subject}&body=${body}`, '_blank');
    share('email');
  };

  const whatsapp = () => {
    const text = encodeURIComponent(
      `Dear ${vendor.contactPerson || vendor.vendorName}, please complete your OmTrax vendor KYC here: ${link}`
    );
    const phone = (vendor.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone ? `91${phone.slice(-10)}` : ''}?text=${text}`, '_blank');
    share('whatsapp');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Vendor KYC Form</h2>
            <p className="text-xs text-gray-500 mt-0.5">{vendor.vendorName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
          {sentNote && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">{sentNote}</div>}

          {/* Current state */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">Status</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Source</span>
              <span className="font-medium text-gray-800">{kycSourceLabel(vendor.kycSource)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Link generated</span>
              <span className="font-medium text-gray-800">{fmtDateTime(vendor.kycTokenGeneratedAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Last shared</span>
              <span className="font-medium text-gray-800">{fmtDateTime(vendor.kycLinkSentAt)}</span>
            </div>
          </div>

          {/* Reset confirmation */}
          {confirmReset && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 space-y-2">
              <p className="font-semibold">This vendor is already approved.</p>
              <p>
                Generating a new KYC link will clear the Finance approval and put the vendor back
                into the review cycle. Continue only if the vendor genuinely needs to resubmit.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => generate({ confirmReset: true })} disabled={busy}
                  className="px-3 py-1.5 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50">
                  Yes, reset and regenerate
                </button>
                <button onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-amber-800">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Link */}
          {link ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secure KYC link</label>
              <div className="flex gap-2">
                <input readOnly value={link} onFocus={(e) => e.target.select()}
                  className="flex-1 px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 font-mono" />
                <button onClick={copy}
                  className="px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 whitespace-nowrap">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Unique to this vendor, expires in 30 days, and locks once submitted. The vendor does not need a CRM login.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={mailto}
                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                  Share by Email
                </button>
                <button onClick={whatsapp}
                  className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100">
                  Share on WhatsApp
                </button>
              </div>
              <button onClick={() => generate(isApproved ? { confirmReset: true } : {})} disabled={busy}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                {busy ? 'Working...' : 'Regenerate link (invalidates the current one)'}
              </button>
            </div>
          ) : (
            !confirmReset && (
              <button onClick={() => generate()} disabled={busy}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {busy ? 'Generating...' : 'Generate KYC Link'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default KycLinkModal;
