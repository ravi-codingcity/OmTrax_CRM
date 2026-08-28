import { useState, useEffect, useRef } from 'react';
import { kycTypesForUser, kycTypeLabel } from '../../config/departments';

/**
 * "Generate KYC Link" — the second, independent way to add a vendor.
 *
 * There are two KYC workflows, Purchase and Operations. A user who may only
 * generate one of them gets it straight away, asked for nothing, exactly as
 * before. Finance and administrators may generate either, so they pick first.
 * Adding a vendor manually never generates a link.
 */
const KycRequestModal = ({ onClose, onGenerate, onMarkSent, user, defaultKycType }) => {
  const choices = kycTypesForUser(user);
  // Pre-select the department being browsed when it is one of the options
  const preset = choices.length === 1
    ? choices[0].value
    : (choices.some((c) => c.value === defaultKycType) ? defaultKycType : null);

  const [kycType, setKycType] = useState(preset);
  const [result, setResult] = useState(null); // { kycLink, vendor }
  // Only auto-generate when there is nothing to ask
  const [busy, setBusy] = useState(Boolean(preset));
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentNote, setSentNote] = useState('');
  const started = useRef(false);

  const generate = async (type) => {
    const chosen = type || kycType;
    if (!chosen) return;
    setBusy(true);
    setError('');
    const res = await onGenerate({ kycType: chosen });
    setBusy(false);
    if (res.success) setResult(res.data);
    else setError(res.message || 'Could not generate the link.');
  };

  // Mint the link as soon as the dialog opens, when the type is already known.
  // The ref guard stops React's development double-invoke from creating two
  // vendor records.
  useEffect(() => {
    if (started.current || !preset) return;
    started.current = true;
    generate(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (value) => {
    setKycType(value);
    started.current = true;
    generate(value);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.kycLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select the link and copy it manually.');
    }
  };

  const share = async (method) => {
    const id = result?.vendor?._id;
    if (!id) return;
    const res = await onMarkSent(id, method);
    if (res.success) setSentNote(`Recorded as shared via ${method}.`);
  };

  const mailto = () => {
    const subject = encodeURIComponent('OmTrax — Vendor KYC Form');
    const body = encodeURIComponent(
      'Hello,\n\nPlease complete your vendor registration using the secure link below:\n\n' +
      `${result.kycLink}\n\n` +
      'The link is unique to you and will expire in 30 days.\n\nRegards,\nOmTrax'
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    share('email');
  };

  const whatsapp = () => {
    const text = encodeURIComponent(
      `Hello, please complete your OmTrax vendor KYC here: ${result.kycLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    share('whatsapp');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Generate {kycType ? `${kycTypeLabel(kycType)} ` : ''}KYC Link
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {result
                ? 'Share this link with the vendor.'
                : (kycType ? 'Creating a unique link...' : 'Which KYC form should the vendor fill in?')}
            </p>
          </div>
          <button onClick={() => !busy && onClose()} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
            disabled={busy} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {!kycType && !busy && !error && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                The two forms collect different details, and the vendor sees only the one you choose.
              </p>
              {choices.map((c) => (
                <button
                  key={c.value}
                  onClick={() => choose(c.value)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                >
                  <span className="block text-sm font-semibold text-gray-800">{c.label}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    {c.value === 'purchase'
                      ? 'Collects the materials the vendor supplies.'
                      : 'Collects the services the vendor provides and their vehicle count.'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="py-8 text-center">
              <svg className="animate-spin h-7 w-7 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-gray-500 mt-2.5">Generating a unique KYC link...</p>
            </div>
          )}

          {!busy && error && (
            <>
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Close
                </button>
                <button onClick={() => generate()}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700">
                  Try Again
                </button>
              </div>
            </>
          )}

          {!busy && result && (
            <>
              {sentNote && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">{sentNote}</div>}

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Secure KYC link</label>
                <div className="flex gap-2">
                  <input readOnly value={result.kycLink} onFocus={(e) => e.target.select()}
                    className="flex-1 px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={copy}
                    className="px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 whitespace-nowrap">
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Expires in 30 days and locks once submitted. The vendor needs no CRM login.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-600">
                Until the vendor submits, this appears in the list as{' '}
                <strong className="font-mono text-gray-800">{result.vendor?.vendorName}</strong> with status{' '}
                <strong>Sent</strong>. Their real name replaces it on submission.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={mailto}
                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                  Share by Email
                </button>
                <button onClick={whatsapp}
                  className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100">
                  Share on WhatsApp
                </button>
              </div>

              <button onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KycRequestModal;
