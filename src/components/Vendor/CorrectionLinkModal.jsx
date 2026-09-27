import { useState, useEffect, useMemo } from 'react';
import { fmtDateTime, kycDepartmentLabel } from '../../config/finance';

/**
 * "Generate Correction KYC Link" — offered to the department that owns a KYC
 * once Finance has sent it back for correction.
 *
 * The department ticks the details and documents the vendor must resubmit; the
 * choices come from the server, built from the same configuration as the KYC
 * form itself. The vendor's link then shows only those. Finance's remarks stay
 * on screen throughout, since they say what is wrong.
 */
const CorrectionLinkModal = ({ vendor, onClose, onLoadOptions, onGenerate, onMarkSent }) => {
  const [options, setOptions] = useState(null);     // { fields, correction }
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [vendorNote, setVendorNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);       // { kycLink, fields, round }
  const [copied, setCopied] = useState(false);
  const [sentNote, setSentNote] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await onLoadOptions(vendor._id);
      if (!live) return;
      if (!res.success) { setLoadError(res.message); return; }
      setOptions(res.data);
      // Regenerating: start from what was selected last time
      setSelected(new Set(res.data.correction?.fields || []));
      setVendorNote(res.data.correction?.vendorNote || '');
    })();
    return () => { live = false; };
  }, [vendor._id, onLoadOptions]);

  const groups = useMemo(() => {
    const fields = options?.fields || [];
    return [
      { title: 'KYC Details', items: fields.filter((f) => f.type === 'field') },
      { title: 'Documents', items: fields.filter((f) => f.type === 'document') },
    ];
  }, [options]);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (error) setError('');
  };

  const generate = async () => {
    if (!selected.size) {
      setError('Select at least one field or document for correction.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await onGenerate(vendor._id, { fields: [...selected], vendorNote: vendorNote.trim() });
    setBusy(false);
    if (res.success) setResult(res.data);
    else setError(res.message || 'Could not generate the correction link.');
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
    const res = await onMarkSent(vendor._id, method);
    if (res.success) setSentNote(`Recorded as shared via ${method}.`);
  };

  const mailto = () => {
    const subject = encodeURIComponent('OmTrax — Vendor KYC Correction');
    const body = encodeURIComponent(
      'Hello,\n\nPlease correct the following in your vendor KYC using the secure link below:\n\n'
      + `${result.fields.map((f) => `- ${f.label}`).join('\n')}\n\n${result.kycLink}\n\n`
      + 'Only these items are asked for. The link is unique to you and will expire in 30 days.\n\nRegards,\nOmTrax'
    );
    window.open(`mailto:${vendor.email || ''}?subject=${subject}&body=${body}`, '_blank');
    share('email');
  };

  const whatsapp = () => {
    const text = encodeURIComponent(`Hello, please correct your OmTrax vendor KYC here: ${result.kycLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    share('whatsapp');
  };

  const correction = options?.correction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800">
              {result ? 'Correction KYC Link' : 'Select Fields for Correction'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {vendor.vendorName} · {kycDepartmentLabel(vendor.kycType)}
              {correction ? ` · Round ${correction.round}` : ''}
            </p>
          </div>
          <button onClick={() => !busy && onClose()} disabled={busy} aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{loadError}</div>
          )}

          {!options && !loadError && (
            <p className="py-8 text-center text-xs text-gray-500">Loading the KYC form fields...</p>
          )}

          {/* Finance's remarks — why it came back */}
          {correction && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
              <p className="text-[11px] font-semibold text-orange-800">
                Sent back by {correction.requestedByName || 'Finance'} · {fmtDateTime(correction.requestedAt)}
              </p>
              <p className="text-xs text-orange-900 mt-1 whitespace-pre-wrap break-words">{correction.remarks}</p>
              {correction.status === 'link_generated' && !result && (
                <p className="text-[11px] text-orange-700 mt-1.5">
                  A correction link was already generated by {correction.linkGeneratedByName} on{' '}
                  {fmtDateTime(correction.linkGeneratedAt)}. Generating again replaces it — the earlier link stops working.
                </p>
              )}
            </div>
          )}

          {options && !result && (
            <>
              <p className="text-xs text-gray-600">
                Tick what the vendor must correct. Their link will show only these, and only these are updated.
              </p>

              {groups.map((g) => (
                <div key={g.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{g.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {g.items.map((f) => {
                      const on = selected.has(f.key);
                      return (
                        <label key={f.key}
                          className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border cursor-pointer select-none transition-colors ${
                            on ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(f.key)} disabled={busy}
                            className="h-4 w-4 mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                          <span className="text-xs text-gray-800 leading-snug">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label htmlFor="correction-vendor-note" className="block text-[11px] font-medium text-gray-600 mb-1">
                  Note to the vendor <span className="text-gray-400 font-normal">(optional — shown on their correction form)</span>
                </label>
                <textarea id="correction-vendor-note" value={vendorNote} onChange={(e) => setVendorNote(e.target.value)}
                  rows={2} maxLength={1000} disabled={busy}
                  placeholder="e.g. Please upload the GST certificate issued to your company, not the branch."
                  className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 resize-none" />
                <p className="text-[10px] text-gray-400 mt-0.5">Finance's remarks above are internal and are not shown to the vendor.</p>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
            </>
          )}

          {result && (
            <>
              {sentNote && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">{sentNote}</div>}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Secure correction link</label>
                <div className="flex gap-2">
                  <input readOnly value={result.kycLink} onFocus={(e) => e.target.select()}
                    className="flex-1 px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={copy}
                    className="px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 whitespace-nowrap">
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Expires in 30 days and locks once the vendor resubmits. It then returns to Finance for review.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[11px] font-medium text-gray-600 mb-1">The vendor will be asked to resubmit:</p>
                <ul className="flex flex-wrap gap-1">
                  {result.fields.map((f) => (
                    <li key={f.key} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-700">{f.label}</li>
                  ))}
                </ul>
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
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3 flex gap-2">
          {result ? (
            <button onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} disabled={busy}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={generate} disabled={busy || !options || !selected.size}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {busy ? 'Generating...' : `Generate Correction Link${selected.size ? ` (${selected.size})` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrectionLinkModal;
