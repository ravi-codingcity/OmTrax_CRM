import { useState } from 'react';

const OPTIONS = [
  { key: 'daily', label: 'Daily', desc: "Today's purchases" },
  { key: 'weekly', label: 'Weekly', desc: 'This week (Mon–today)' },
  { key: 'monthly', label: 'Monthly', desc: 'This month' },
  { key: 'quarterly', label: 'Quarterly', desc: 'This quarter' },
  { key: 'yearly', label: 'Yearly', desc: 'This year' },
  { key: 'custom', label: 'Custom Range', desc: 'Pick a date range' },
];

// Dialog to choose the export period, then trigger the Excel download.
const ExportModal = ({ onClose, onExport }) => {
  const [type, setType] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (type === 'custom' && !customStart && !customEnd) {
      setError('Please choose a start and/or end date.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await onExport({ type, customStart, customEnd });
    setBusy(false);
    if (res?.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Download Excel Report</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">Select the period to export. Only purchase records within the selected range are included.</p>

          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setType(o.key)}
                className={`text-left px-3 py-2 rounded-lg border transition-all ${
                  type === o.key ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-medium ${type === o.key ? 'text-emerald-700' : 'text-gray-800'}`}>{o.label}</p>
                <p className="text-[11px] text-gray-500">{o.desc}</p>
              </button>
            ))}
          </div>

          {type === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-0.5">From</label>
                <input type="date" value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md" />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-0.5">To</label>
                <input type="date" value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md" />
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
          <button onClick={handleExport} disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
            {busy ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generating...
              </>
            ) : 'Download Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
