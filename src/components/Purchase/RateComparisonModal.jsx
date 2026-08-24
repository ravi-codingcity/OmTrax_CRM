import { useState, useMemo } from 'react';
import SearchableSelect from '../Common/SearchableSelect';
import { UNITS } from '../../config/purchase';
import { inr } from '../../config/finance';
import { emptyQuotation, quotationTotals, MIN_QUOTATIONS_TO_SUBMIT } from '../../config/rateComparison';

const today = () => new Date().toISOString().split('T')[0];

const INPUT = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500';
const LABEL = 'block text-[11px] font-medium text-gray-600 mb-1';

/**
 * One vendor's quotation card. Module scope so React keeps the inputs mounted
 * while the user types.
 */
const QuotationCard = ({ index, q, vendors, requiredQuantity, onChange, onRemove, onSelect, canRemove }) => {
  const totals = quotationTotals(q, requiredQuantity);
  const vendor = vendors.find((v) => v._id === q.vendor);

  return (
    <div className={`rounded-lg border p-3 transition-colors ${q.isSelected ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="selectedQuotation"
              checked={!!q.isSelected}
              onChange={() => onSelect(index)}
              className="accent-emerald-600"
            />
            <span className={`text-[11px] font-medium ${q.isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
              {q.isSelected ? 'Recommended' : 'Recommend'}
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800">{inr(totals.total)}</span>
          {canRemove && (
            <button type="button" onClick={() => onRemove(index)} title="Remove quotation"
              className="p-1 text-red-500 hover:bg-red-50 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 sm:col-span-5">
          <label className={LABEL}>Vendor <span className="text-red-500">*</span></label>
          <select value={q.vendor} onChange={(e) => onChange(index, 'vendor', e.target.value)} className={INPUT}>
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vendorName}{v.kycStatus === 'approved' ? ' ✓' : ''}
              </option>
            ))}
          </select>
          {vendor && vendor.kycStatus !== 'approved' && (
            <p className="text-[10px] text-amber-700 mt-0.5">KYC not approved</p>
          )}
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className={LABEL}>Rate <span className="text-red-500">*</span></label>
          <input type="number" min="0" step="0.01" value={q.quotedRate}
            onChange={(e) => onChange(index, 'quotedRate', e.target.value)} className={INPUT} />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className={LABEL}>GST %</label>
          <input type="number" min="0" step="0.01" value={q.taxPercent}
            onChange={(e) => onChange(index, 'taxPercent', e.target.value)} className={INPUT} />
        </div>
        <div className="col-span-4 sm:col-span-3">
          <label className={LABEL}>Delivery Time</label>
          <input value={q.deliveryTime} onChange={(e) => onChange(index, 'deliveryTime', e.target.value)}
            className={INPUT} placeholder="e.g. 7 days" />
        </div>
        <div className="col-span-12 sm:col-span-6">
          <label className={LABEL}>Payment Terms</label>
          <input value={q.paymentTerms} onChange={(e) => onChange(index, 'paymentTerms', e.target.value)}
            className={INPUT} placeholder="e.g. 30 days credit" />
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500">
        <span>Base {inr(totals.base)}</span>
        <span>Tax {inr(totals.tax)}</span>
        {q.deliveryTime && <span>Delivery Time {q.deliveryTime}</span>}
        <span className="ml-auto font-semibold text-gray-800">Total {inr(totals.total)}</span>
      </div>
    </div>
  );
};

/**
 * Create / edit a Rate Comparison. Totals previewed here are recomputed by the
 * backend on save, so the server figures are always authoritative.
 */
const RateComparisonModal = ({ mode = 'add', comparison = null, vendors = [], items = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    comparisonDate: comparison?.comparisonDate ? new Date(comparison.comparisonDate).toISOString().split('T')[0] : today(),
    materialName: comparison?.materialName || '',
    requiredQuantity: comparison?.requiredQuantity ?? '',
    unit: comparison?.unit || '',
    comparisonRemarks: comparison?.comparisonRemarks || '',
  });
  const [quotations, setQuotations] = useState(
    comparison?.quotations?.length
      ? comparison.quotations.map((q) => ({
          _id: q._id,
          vendor: q.vendor?._id || q.vendor || '',
          vendorName: q.vendorName || '',
          quotedRate: q.quotedRate ?? '',
          taxPercent: q.taxPercent ?? 18,
          deliveryTime: q.deliveryTime || '',
          paymentTerms: q.paymentTerms || '',
          isSelected: !!q.isSelected,
        }))
      : [emptyQuotation(), emptyQuotation()]
  );
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const itemNames = useMemo(() => items.map((i) => i.name), [items]);
  const activeVendors = useMemo(() => vendors.filter((v) => v.isActive !== false), [vendors]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const setQuotation = (idx, key, value) =>
    setQuotations((prev) => prev.map((q, i) => {
      if (i !== idx) return q;
      const next = { ...q, [key]: value };
      if (key === 'vendor') {
        next.vendorName = activeVendors.find((v) => v._id === value)?.vendorName || '';
      }
      return next;
    }));

  // Only one vendor can be recommended
  const selectQuotation = (idx) =>
    setQuotations((prev) => prev.map((q, i) => ({ ...q, isSelected: i === idx })));

  const addQuotation = () => setQuotations((p) => [...p, emptyQuotation()]);
  const removeQuotation = (idx) => setQuotations((p) => p.filter((_, i) => i !== idx));

  // Live ranking so the cheapest option is obvious while entering rates
  const ranked = useMemo(() => {
    const withTotals = quotations
      .map((q, i) => ({ i, total: quotationTotals(q, form.requiredQuantity).total, valid: !!q.vendor && Number(q.quotedRate) > 0 }))
      .filter((x) => x.valid);
    if (!withTotals.length) return null;
    const sorted = [...withTotals].sort((a, b) => a.total - b.total);
    return { lowestIndex: sorted[0].i, lowestTotal: sorted[0].total, count: withTotals.length };
  }, [quotations, form.requiredQuantity]);

  const validate = () => {
    const problems = [];
    if (!form.materialName.trim()) problems.push('Material name is required');
    if (!Number(form.requiredQuantity) || Number(form.requiredQuantity) <= 0) {
      problems.push('Required quantity must be greater than zero');
    }
    const filled = quotations.filter((q) => q.vendor && Number(q.quotedRate) > 0);
    if (!filled.length) problems.push('Add at least one vendor quotation');
    const ids = filled.map((q) => q.vendor);
    if (new Set(ids).size !== ids.length) problems.push('The same vendor appears more than once');
    setErrors(problems);
    return problems.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors([]);

    const payload = {
      ...form,
      requiredQuantity: Number(form.requiredQuantity) || 0,
      quotations: quotations
        .filter((q) => q.vendor && Number(q.quotedRate) > 0)
        .map((q) => ({
          _id: q._id,
          vendor: q.vendor,
          vendorName: q.vendorName,
          quotedRate: Number(q.quotedRate) || 0,
          taxPercent: Number(q.taxPercent) || 0,
          deliveryTime: q.deliveryTime,
          paymentTerms: q.paymentTerms,
          isSelected: !!q.isSelected,
        })),
    };

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setErrors([res?.message || 'Something went wrong.']);
  };

  const filledCount = quotations.filter((q) => q.vendor && Number(q.quotedRate) > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {isEdit ? `Edit ${comparison?.comparisonNumber || 'Rate Comparison'}` : 'New Rate Comparison'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Collect quotations from {MIN_QUOTATIONS_TO_SUBMIT}+ vendors, recommend one, then send it to the Director.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Material */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className={LABEL}>Material Name <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={form.materialName}
                onChange={(v) => setField('materialName', v)}
                options={itemNames}
                placeholder="Select or type a material"
              />
            </div>
            <div className="sm:col-span-3">
              <label className={LABEL}>Required Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.requiredQuantity}
                onChange={(e) => setField('requiredQuantity', e.target.value)} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Unit</label>
              <select value={form.unit} onChange={(e) => setField('unit', e.target.value)} className={INPUT}>
                <option value="">—</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Date</label>
              <input type="date" value={form.comparisonDate}
                onChange={(e) => setField('comparisonDate', e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Quotations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Vendor Quotations</h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  filledCount >= MIN_QUOTATIONS_TO_SUBMIT ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {filledCount} of {MIN_QUOTATIONS_TO_SUBMIT}+ required
                </span>
              </div>
              <button type="button" onClick={addQuotation} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                + Add vendor
              </button>
            </div>

            {ranked && ranked.count > 1 && (
              <p className="text-[11px] text-gray-500 mb-2">
                Lowest quote so far: <strong className="text-emerald-700">{inr(ranked.lowestTotal)}</strong>
                {' '}(vendor {ranked.lowestIndex + 1})
              </p>
            )}

            <div className="space-y-2">
              {quotations.map((q, idx) => (
                <QuotationCard
                  key={idx}
                  index={idx}
                  q={q}
                  vendors={activeVendors}
                  requiredQuantity={form.requiredQuantity}
                  onChange={setQuotation}
                  onRemove={removeQuotation}
                  onSelect={selectQuotation}
                  canRemove={quotations.length > 1}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Overall Comparison Remarks</label>
            <textarea value={form.comparisonRemarks} onChange={(e) => setField('comparisonRemarks', e.target.value)}
              rows={2} className={`${INPUT} resize-none`}
              placeholder="Why you are recommending this vendor — the Director reads this first" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save as Draft'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Saving keeps this as a draft. Submit it to the Director from the comparison list.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RateComparisonModal;
