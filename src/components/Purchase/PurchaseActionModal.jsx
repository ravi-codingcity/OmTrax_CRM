import { useState } from 'react';

const today = () => new Date().toISOString().split('T')[0];

// Combined modal for recording a Dispatch or a Return against a purchase entry.
const PurchaseActionModal = ({ action = 'dispatch', entry, onClose, onSubmit }) => {
  const isDispatch = action === 'dispatch';
  const netOut = (entry.totalDispatched || 0) - (entry.totalReturned || 0);
  const max = isDispatch ? entry.availableStock : netOut;

  const [form, setForm] = useState({ date: today(), quantity: '', location: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) { setError('Enter a quantity greater than 0'); return; }
    if (qty > max) { setError(`Only ${max} unit(s) available`); return; }

    setSubmitting(true);
    setError('');
    const payload = isDispatch
      ? { dispatchDate: form.date, quantity: qty, location: form.location.trim() }
      : { returnDate: form.date, quantity: qty };
    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setError(res?.message || 'Something went wrong.');
  };

  const btnCls = isDispatch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
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
              <label className="block text-xs font-medium text-gray-600 mb-0.5">{isDispatch ? 'Dispatch Date' : 'Return Date'}</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Quantity</label>
              <input type="number" min="0" step="any" max={max} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" placeholder="0" />
            </div>
            {isDispatch && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Dispatch Location / Branch</label>
                <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Delhi Branch" />
              </div>
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
