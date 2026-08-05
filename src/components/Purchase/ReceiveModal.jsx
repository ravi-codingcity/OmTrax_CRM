import { useState } from 'react';
import { formatQuantity } from '../../config/purchase';

// Warehouse/Branch Manager confirms whether a pending material was received.
// `onSubmit(status, note)` returns { success, message }.
const ReceiveModal = ({ entry, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null); // 'received' | 'not_received'
  const [error, setError] = useState('');

  const act = async (status) => {
    setBusy(status);
    setError('');
    const res = await onSubmit(status, note.trim());
    setBusy(null);
    if (res?.success) onClose();
    else setError(res?.message || 'Something went wrong.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Confirm Material Receipt</h2>
          <button onClick={() => !busy && onClose()} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>}

          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Item</span><span className="font-medium text-gray-800">{entry.itemName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Quantity</span><span className="font-medium text-gray-800">{formatQuantity(entry.quantityPurchased, entry.unit)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Location</span><span className="font-medium text-gray-800">{entry.storageLocation || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Supplier</span><span className="font-medium text-gray-800">{entry.supplier || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sent by</span><span className="font-medium text-gray-800">{entry.createdByName || entry.createdBy?.name || '—'}</span></div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              placeholder="e.g. 2 boxes damaged, rest received"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => act('not_received')}
              disabled={!!busy}
              className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              {busy === 'not_received' ? 'Saving…' : 'Not Received'}
            </button>
            <button
              onClick={() => act('received')}
              disabled={!!busy}
              className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {busy === 'received' ? 'Saving…' : 'Received'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;
