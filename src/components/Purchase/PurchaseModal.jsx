import { useState, useMemo } from 'react';
import SearchableSelect from '../Common/SearchableSelect';
import { UNITS, STORAGE_LOCATIONS } from '../../config/purchase';

const toDateInput = (d) => (d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

const PurchaseModal = ({ mode = 'add', entry = null, items = [], suppliers = [], locations = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    itemName: entry?.itemName || '',
    storageLocation: entry?.storageLocation || '',
    supplier: entry?.supplier || '',
    purchaseDate: toDateInput(entry?.purchaseDate),
    quantityPurchased: entry?.quantityPurchased ?? '',
    unit: entry?.unit || '',
    unitPrice: entry?.unitPrice ?? '',
    totalAmount: entry?.totalAmount ?? '',
    invoiceNumber: entry?.invoiceNumber || '',
    remarks: entry?.remarks || '',
    manualTotal: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const itemNames = useMemo(() => items.map((i) => i.name), [items]);
  const supplierNames = useMemo(() => suppliers.map((s) => s.name), [suppliers]);
  // Merge saved locations with the predefined list (deduped, case-insensitive)
  const locationNames = useMemo(() => {
    const seen = new Set();
    const out = [];
    [...locations.map((l) => l.name), ...STORAGE_LOCATIONS].forEach((n) => {
      const k = n.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(n); }
    });
    return out.sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  // Auto-compute total unless the user typed one manually
  const computedTotal = (qty, price) => {
    const q = Number(qty) || 0;
    const p = Number(price) || 0;
    return q && p ? +(q * p).toFixed(2) : '';
  };

  const onItemChange = (val) => {
    const match = items.find((i) => i.name.toLowerCase() === val.trim().toLowerCase());
    setForm((p) => ({
      ...p,
      itemName: val,
      unit: match?.unit || p.unit,
    }));
    if (errors.itemName) setErrors((p) => ({ ...p, itemName: '' }));
  };

  const onQtyPrice = (name, value) => {
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (!p.manualTotal) next.totalAmount = computedTotal(next.quantityPurchased, next.unitPrice);
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.itemName.trim()) e.itemName = 'Item is required';
    if (form.quantityPurchased === '' || Number(form.quantityPurchased) < 0) e.quantityPurchased = 'Enter a valid quantity';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    const payload = {
      itemName: form.itemName.trim(),
      storageLocation: form.storageLocation.trim(),
      supplier: form.supplier.trim(),
      purchaseDate: form.purchaseDate || null,
      quantityPurchased: Number(form.quantityPurchased) || 0,
      unit: form.unit.trim(),
      unitPrice: Number(form.unitPrice) || 0,
      totalAmount: form.totalAmount === '' ? undefined : Number(form.totalAmount),
      invoiceNumber: form.invoiceNumber.trim(),
      remarks: form.remarks.trim(),
    };
    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setApiError(res?.message || 'Something went wrong.');
  };

  const inputCls = (field) =>
    `w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;
  const label = 'block text-xs font-medium text-gray-600 mb-0.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-800">{isEdit ? 'Edit Purchase Entry' : 'Add Purchase Entry'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {apiError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{apiError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>Item Name <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={form.itemName}
                onChange={onItemChange}
                options={itemNames}
                placeholder="Search or add a new item"
                error={!!errors.itemName}
              />
              {errors.itemName && <p className="text-red-500 text-[11px] mt-0.5">{errors.itemName}</p>}
              <p className="text-[10px] text-gray-400 mt-0.5">Not listed? Just type a new name — it will be added automatically.</p>
            </div>
            <div>
              <label className={label}>Storage Location</label>
              <SearchableSelect
                value={form.storageLocation}
                onChange={(v) => setField('storageLocation', v)}
                options={locationNames}
                placeholder="Search or add location"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Where the material is stored. New warehouses/branches are saved automatically.</p>
            </div>

            <div>
              <label className={label}>Supplier / Vendor</label>
              <SearchableSelect
                value={form.supplier}
                onChange={(v) => setField('supplier', v)}
                options={supplierNames}
                placeholder="Search or add supplier"
              />
            </div>
            <div>
              <label className={label}>Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => setField('purchaseDate', e.target.value)} className={inputCls('purchaseDate')} />
            </div>
            <div>
              <label className={label}>Invoice / Bill No.</label>
              <input value={form.invoiceNumber} onChange={(e) => setField('invoiceNumber', e.target.value)} className={inputCls('invoiceNumber')} placeholder="INV-000" />
            </div>

            <div>
              <label className={label}>Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="any" value={form.quantityPurchased} onChange={(e) => onQtyPrice('quantityPurchased', e.target.value)} className={inputCls('quantityPurchased')} placeholder="0" />
              {errors.quantityPurchased && <p className="text-red-500 text-[11px] mt-0.5">{errors.quantityPurchased}</p>}
            </div>
            <div>
              <label className={label}>Unit</label>
              <SearchableSelect value={form.unit} onChange={(v) => setField('unit', v)} options={UNITS} placeholder="Unit" />
            </div>
            <div>
              <label className={label}>Unit Price (₹)</label>
              <input type="number" min="0" step="any" value={form.unitPrice} onChange={(e) => onQtyPrice('unitPrice', e.target.value)} className={inputCls('unitPrice')} placeholder="0" />
            </div>

            <div>
              <label className={label}>Total Amount (₹)</label>
              <input
                type="number" min="0" step="any"
                value={form.totalAmount}
                onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value, manualTotal: true }))}
                className={inputCls('totalAmount')}
                placeholder="Auto"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Purchase Remarks</label>
              <input value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} className={inputCls('remarks')} placeholder="Notes..." />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center">
              {submitting ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : isEdit ? 'Save' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;
