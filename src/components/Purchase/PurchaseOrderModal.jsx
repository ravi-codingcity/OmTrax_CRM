import { useState, useMemo } from 'react';
import SearchableSelect from '../Common/SearchableSelect';
import TermsEditor from './TermsEditor';
import { UNITS, STORAGE_LOCATIONS } from '../../config/purchase';
import { inr, kycStatusMeta } from '../../config/finance';

const today = () => new Date().toISOString().split('T')[0];
const emptyLine = () => ({ itemName: '', quantity: '', unit: '', rate: '' });

/**
 * Create / edit a Purchase Order.
 *
 * Totals are previewed live here, but the backend recomputes them on save —
 * the server figure is always authoritative.
 */
const PurchaseOrderModal = ({ mode = 'add', order = null, vendors = [], items = [], prefill = null, termsSuggestions = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';
  // When a PO is raised from an approved rate comparison, the vendor, rate and
  // quantity come from the quotation the Director approved.
  const fromComparison = prefill?.rateComparison ? prefill : null;

  const [form, setForm] = useState({
    vendor: order?.vendor?._id || order?.vendor || prefill?.vendor || '',
    poDate: order?.poDate ? new Date(order.poDate).toISOString().split('T')[0] : today(),
    expectedDeliveryDate: order?.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
    deliveryLocation: order?.deliveryLocation || '',
    paymentTerms: order?.paymentTerms || prefill?.paymentTerms || '',
    taxPercent: order?.taxPercent ?? prefill?.taxPercent ?? 18,
    discount: order?.discount ?? 0,
  });
  const [lines, setLines] = useState(
    prefill?.items?.length && !order
      ? prefill.items.map((l) => ({
          itemName: l.itemName || '', quantity: l.quantity ?? '', unit: l.unit || '', rate: l.rate ?? '',
        }))
      : order?.items?.length
      ? order.items.map((l) => ({
          itemName: l.itemName || '', quantity: l.quantity ?? '', unit: l.unit || '', rate: l.rate ?? '',
        }))
      : [emptyLine()]
  );
  // Point-wise terms. An older PO may hold a single free-text block, so it is
  // split into lines the first time it is opened here.
  const [terms, setTerms] = useState(() => {
    if (order?.terms?.length) return [...order.terms];
    if (order?.termsAndConditions) {
      return order.termsAndConditions
        .split(/\r?\n/)
        .map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);
    }
    return [];
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const itemNames = useMemo(() => items.map((i) => i.name), [items]);
  const activeVendors = useMemo(() => vendors.filter((v) => v.isActive !== false), [vendors]);
  const selectedVendor = useMemo(
    () => activeVendors.find((v) => v._id === form.vendor),
    [activeVendors, form.vendor]
  );

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const setLine = (idx, key, value) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx) => setLines((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));

  // Live preview only — the server recomputes on save
  const totals = useMemo(() => {
    const subTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);
    const taxable = Math.max(0, subTotal - (Number(form.discount) || 0));
    const taxAmount = taxable * (Number(form.taxPercent) || 0) / 100;
    return { subTotal, taxAmount, total: taxable + taxAmount };
  }, [lines, form.taxPercent, form.discount]);

  const validate = () => {
    const e = {};
    if (!form.vendor) e.vendor = 'Select a vendor';
    const valid = lines.filter((l) => l.itemName.trim() && Number(l.quantity) > 0);
    if (!valid.length) e.items = 'Add at least one item with a quantity greater than zero';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (status) => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    const payload = {
      vendor: form.vendor,
      poDate: form.poDate,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      deliveryLocation: form.deliveryLocation.trim(),
      paymentTerms: form.paymentTerms.trim(),
      taxPercent: Number(form.taxPercent) || 0,
      discount: Number(form.discount) || 0,
      terms,
      items: lines
        .filter((l) => l.itemName.trim() && Number(l.quantity) > 0)
        .map((l) => ({
          itemName: l.itemName.trim(),
          quantity: Number(l.quantity),
          unit: l.unit.trim(),
          rate: Number(l.rate) || 0,
        })),
      status,
      ...(fromComparison ? { rateComparison: fromComparison.rateComparison } : {}),
    };

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setApiError(res?.message || 'Something went wrong.');
  };

  const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {isEdit ? `Edit ${order?.poNumber || 'Purchase Order'}` : 'New Purchase Order'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? 'Changes are blocked once the PO has been sent.' : 'The PO number is assigned automatically on save.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {apiError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{apiError}</div>}

          {fromComparison && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 text-xs text-emerald-900">
              Raised from approved rate comparison{' '}
              <strong className="font-mono">{fromComparison.comparisonNumber}</strong>.
              The Director approved <strong>{fromComparison.vendorName}</strong> — the vendor cannot be changed on this PO.
            </div>
          )}

          {/* Vendor + dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Vendor <span className="text-red-500">*</span></label>
              <select
                value={form.vendor}
                onChange={(e) => setField('vendor', e.target.value)}
                disabled={!!fromComparison}
                className={`${inputCls} ${errors.vendor ? 'border-red-300 bg-red-50' : ''} ${fromComparison ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select a vendor</option>
                {activeVendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vendorName}{v.companyName ? ` — ${v.companyName}` : ''}
                  </option>
                ))}
              </select>
              {errors.vendor && <p className="text-red-500 text-[11px] mt-0.5">{errors.vendor}</p>}
              {selectedVendor && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-semibold ${kycStatusMeta(selectedVendor.kycStatus).badge}`}>
                    KYC: {kycStatusMeta(selectedVendor.kycStatus).label}
                  </span>
                  {selectedVendor.kycStatus !== 'approved' && (
                    <span className="text-amber-700">
                      This vendor's KYC is not approved yet — you can still raise the PO.
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>PO Date</label>
              <input type="date" value={form.poDate} onChange={(e) => setField('poDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Expected Delivery</label>
              <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setField('expectedDeliveryDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Delivery Location</label>
              <SearchableSelect
                value={form.deliveryLocation}
                onChange={(v) => setField('deliveryLocation', v)}
                options={STORAGE_LOCATIONS}
                placeholder="Select or type a location"
              />
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <input value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)} className={inputCls} placeholder="e.g. 30 days credit" />
            </div>
          </div>

          {/* Item lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Items</h3>
              <button type="button" onClick={addLine} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                + Add item
              </button>
            </div>
            {errors.items && <p className="text-red-500 text-[11px] mb-1.5">{errors.items}</p>}

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/50">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-5">
                      <label className={labelCls}>Item</label>
                      <SearchableSelect
                        value={line.itemName}
                        onChange={(v) => setLine(idx, 'itemName', v)}
                        options={itemNames}
                        placeholder="Select or type an item"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className={labelCls}>Qty</label>
                      <input type="number" min="0" value={line.quantity}
                        onChange={(e) => setLine(idx, 'quantity', e.target.value)} className={inputCls} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className={labelCls}>Unit</label>
                      <select value={line.unit} onChange={(e) => setLine(idx, 'unit', e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className={labelCls}>Rate</label>
                      <input type="number" min="0" step="0.01" value={line.rate}
                        onChange={(e) => setLine(idx, 'rate', e.target.value)} className={inputCls} />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex sm:flex-col justify-between sm:justify-end items-end gap-1">
                      <span className="text-xs font-semibold text-gray-700 sm:mb-1.5 whitespace-nowrap">
                        {inr((Number(line.quantity) || 0) * (Number(line.rate) || 0))}
                      </span>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} title="Remove"
                          className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className={labelCls}>Discount (₹)</label>
              <input type="number" min="0" step="0.01" value={form.discount}
                onChange={(e) => setField('discount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tax / GST (%)</label>
              <input type="number" min="0" step="0.01" value={form.taxPercent}
                onChange={(e) => setField('taxPercent', e.target.value)} className={inputCls} />
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 space-y-0.5">
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Subtotal</span><span>{inr(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Tax</span><span>{inr(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-800 pt-1 border-t border-emerald-200">
                <span>Total</span><span>{inr(totals.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Terms &amp; Conditions</label>
            <TermsEditor
              terms={terms}
              onChange={setTerms}
              suggestions={termsSuggestions}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button type="button" onClick={() => submit('draft')} disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">
              Save as Draft
            </button>
            <button type="button" onClick={() => submit('generated')} disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Generate PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
