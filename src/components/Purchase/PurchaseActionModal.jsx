import { useState } from 'react';

const today = () => new Date().toISOString().split('T')[0];

// Combined modal for recording a Dispatch or a Return against a purchase entry.
// Every dispatch must reference a Job Number; a remark is optional.
const PurchaseActionModal = ({ action = 'dispatch', entry, locations = [], onClose, onSubmit }) => {
  const isDispatch = action === 'dispatch';
  const netOut = (entry.totalDispatched || 0) - (entry.totalReturned || 0);
  const max = isDispatch ? entry.availableStock : netOut;

  const [form, setForm] = useState({ date: today(), quantity: '', jobNumber: '', location: entry.storageLocation || '', remark: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Ensure the current storage location is always an option
  const locationOptions = [...new Set([entry.storageLocation, ...locations].filter(Boolean))];

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) { setError('Enter a quantity greater than 0'); return; }
    if (qty > max) { setError(`Only ${max} unit(s) available`); return; }
    if (!form.location.trim()) { setError('Location is required'); return; }

    let payload;
    if (isDispatch) {
      if (!form.jobNumber.trim()) { setError('Job Number is required'); return; }
      payload = {
        dispatchDate: form.date,
        quantity: qty,
        jobNumber: form.jobNumber.trim(),
        location: form.location.trim(),
        remark: form.remark.trim(),
      };
    } else {
      payload = { returnDate: form.date, quantity: qty, location: form.location.trim() };
    }

    setSubmitting(true);
    setError('');
    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setError(res?.message || 'Something went wrong.');
  };

  const btnCls = isDispatch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700';
  const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500';
  const label = 'block text-xs font-medium text-gray-600 mb-0.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">{isDispatch ? 'Record Dispatch' : 'Record Return'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-600">
            <span className="font-medium text-gray-800">{entry.itemName}</span> · Available: <span className="font-semibold">{entry.availableStock}</span>{isDispatch ? '' : ` · Out: ${netOut}`}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{isDispatch ? 'Dispatch Date' : 'Return Date'}</label>
              <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={label}>Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="any" max={max} value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} className={inputCls} placeholder="0" />
            </div>

            <div className="col-span-2">
              <label className={label}>Location <span className="text-red-500">*</span></label>
              <select value={form.location} onChange={(e) => setField('location', e.target.value)} className={inputCls}>
                <option value="">Select a location</option>
                {locationOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {isDispatch && (
              <>
                <div className="col-span-2">
                  <label className={label}>Job Number <span className="text-red-500">*</span></label>
                  <input
                    value={form.jobNumber}
                    onChange={(e) => setField('jobNumber', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. JOB-1024"
                  />
                </div>
                <div className="col-span-2">
                  <label className={label}>Dispatch Remark <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={form.remark}
                    onChange={(e) => setField('remark', e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Additional notes about this dispatch..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${btnCls}`}>
              {submitting ? 'Saving...' : (isDispatch ? 'Dispatch' : 'Return')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseActionModal;
