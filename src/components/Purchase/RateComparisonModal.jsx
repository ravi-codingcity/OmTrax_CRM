import { useState, useMemo } from 'react';
import SearchableSelect from '../Common/SearchableSelect';
import { UNITS } from '../../config/purchase';
import { inr, fmtDate } from '../../config/finance';
import {
  MIN_QUOTATIONS_TO_SUBMIT, comparisonView, emptyItem, emptyLine, emptyQuotation,
  lineHasData, lineTotals, quotationTotals,
} from '../../config/rateComparison';

const INPUT = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500';
const LABEL = 'block text-[11px] font-medium text-gray-600 mb-1';

// One row per item inside a vendor card. On desktop every field sits on a
// single line — Vendor | Rate | GST | Delivery Time | Payment Terms — with an
// Item column added when the comparison has more than one item. Smaller
// screens wrap the same fields onto two or four columns.
const ROW_SINGLE = 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2';
const ROW_MULTI = 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,0.6fr)_minmax(0,0.95fr)_minmax(0,1.3fr)] gap-2';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
  </svg>
);

/**
 * One vendor's quotation card. Module scope so React keeps the inputs mounted
 * while the user types.
 */
const QuotationCard = ({
  index, q, items, vendors, lowestByItem, onVendor, onLine, onRemove, onSelect, canRemove,
}) => {
  const multi = items.length > 1;
  const totals = quotationTotals(q, items);
  const vendor = vendors.find((v) => v._id === q.vendor);
  const row = multi ? ROW_MULTI : ROW_SINGLE;
  const cellLabel = `${LABEL} lg:hidden`;

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
          {multi && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              totals.quoted === items.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {totals.quoted} of {items.length} items quoted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800">{inr(totals.total)}</span>
          {canRemove && (
            <button type="button" onClick={() => onRemove(index)} title="Remove vendor"
              className="p-1 text-red-500 hover:bg-red-50 rounded">
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Column headings, shown once on desktop */}
      <div className={`hidden lg:grid ${row} mb-1`}>
        <span className="text-[11px] font-medium text-gray-600">Vendor <span className="text-red-500">*</span></span>
        {multi && <span className="text-[11px] font-medium text-gray-600">Item</span>}
        <span className="text-[11px] font-medium text-gray-600">Rate <span className="text-red-500">*</span></span>
        <span className="text-[11px] font-medium text-gray-600">GST %</span>
        <span className="text-[11px] font-medium text-gray-600">Delivery Time</span>
        <span className="text-[11px] font-medium text-gray-600">Payment Terms</span>
      </div>

      <div className="space-y-2 lg:space-y-1.5">
        {items.map((it, i) => {
          const line = q.lines[it.key] || emptyLine();
          const lineTotal = lineTotals(line, it.requiredQuantity).total;
          const isLowest = Number(line.quotedRate) > 0 && lowestByItem[it.key]?.quotationKey === q.key && lowestByItem[it.key]?.count > 1;
          return (
            <div key={it.key} className={`${row} ${i > 0 ? 'pt-2 border-t border-gray-100 lg:pt-0 lg:border-0' : ''}`}>
              {i === 0 ? (
                <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                  <label className={cellLabel}>Vendor <span className="text-red-500">*</span></label>
                  <select value={q.vendor} onChange={(e) => onVendor(index, e.target.value)} className={INPUT} aria-label="Vendor">
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
              ) : (
                <div className="hidden lg:block" aria-hidden="true" />
              )}

              {multi && (
                <div className="col-span-2 sm:col-span-4 lg:col-span-1 min-w-0 lg:self-center">
                  <p className="text-xs font-medium text-gray-800 truncate" title={it.itemName}>{it.itemName || `Item ${i + 1}`}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {it.requiredQuantity || 0} {it.unit}
                    {Number(line.quotedRate) > 0 && <> · {inr(lineTotal)}</>}
                    {isLowest && <span className="ml-1 px-1 rounded bg-blue-100 text-blue-700 font-semibold">Lowest</span>}
                  </p>
                </div>
              )}

              <div>
                <label className={cellLabel}>Rate <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" value={line.quotedRate} aria-label={`Rate${multi ? ` for ${it.itemName}` : ''}`}
                  onChange={(e) => onLine(index, it.key, 'quotedRate', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={cellLabel}>GST %</label>
                <input type="number" min="0" step="0.01" value={line.taxPercent} aria-label={`GST %${multi ? ` for ${it.itemName}` : ''}`}
                  onChange={(e) => onLine(index, it.key, 'taxPercent', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={cellLabel}>Delivery Time</label>
                <input value={line.deliveryTime} aria-label={`Delivery time${multi ? ` for ${it.itemName}` : ''}`}
                  onChange={(e) => onLine(index, it.key, 'deliveryTime', e.target.value)}
                  className={INPUT} placeholder="e.g. 7 days" />
              </div>
              <div>
                <label className={cellLabel}>Payment Terms</label>
                <input value={line.paymentTerms} aria-label={`Payment terms${multi ? ` for ${it.itemName}` : ''}`}
                  onChange={(e) => onLine(index, it.key, 'paymentTerms', e.target.value)}
                  className={INPUT} placeholder="e.g. 30 days credit" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500">
        <span>Base {inr(totals.base)}</span>
        <span>Tax {inr(totals.tax)}</span>
        {!multi && q.lines[items[0]?.key]?.deliveryTime && <span>Delivery Time {q.lines[items[0].key].deliveryTime}</span>}
        <span className="ml-auto font-semibold text-gray-800">Total {inr(totals.total)}</span>
      </div>
    </div>
  );
};

// Form state from a saved comparison (either storage shape)
const initialState = (comparison) => {
  if (!comparison) return { items: [emptyItem()], quotations: [emptyQuotation(), emptyQuotation()] };
  const view = comparisonView(comparison);
  const items = view.items.map((it) => ({
    key: String(it._id), itemName: it.itemName || '', requiredQuantity: it.requiredQuantity ?? '', unit: it.unit || '',
  }));
  const quotations = view.quotations.map((q) => ({
    key: String(q._id),
    _id: q._id,
    vendor: q.vendor?._id || q.vendor || '',
    vendorName: q.vendorName || '',
    isSelected: !!q.isSelected,
    lines: Object.fromEntries((q.lines || []).map((l) => [String(l.item), {
      quotedRate: l.quotedRate ?? '',
      taxPercent: l.taxPercent ?? 0,
      deliveryTime: l.deliveryTime || '',
      paymentTerms: l.paymentTerms || '',
    }])),
  }));
  return {
    items: items.length ? items : [emptyItem()],
    quotations: quotations.length ? quotations : [emptyQuotation(), emptyQuotation()],
  };
};

/**
 * Create / edit a Rate Comparison: one or more items, quoted by two or more
 * vendors. Totals previewed here are recomputed by the backend on save, so the
 * server figures are always authoritative. The comparison date is assigned by
 * the server when the comparison is created.
 */
const RateComparisonModal = ({ mode = 'add', comparison = null, vendors = [], items: catalogue = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [initial] = useState(() => initialState(comparison));
  const [items, setItems] = useState(initial.items);
  const [quotations, setQuotations] = useState(initial.quotations);
  const [remarks, setRemarks] = useState(comparison?.comparisonRemarks || '');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const itemNames = useMemo(() => catalogue.map((i) => i.name), [catalogue]);
  const unitOf = useMemo(
    () => new Map(catalogue.map((i) => [String(i.name).toLowerCase(), i.unit || ''])),
    [catalogue]
  );
  const activeVendors = useMemo(() => vendors.filter((v) => v.isActive !== false), [vendors]);

  // --- Items ---------------------------------------------------------------
  const setItem = (key, field, value) =>
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const next = { ...it, [field]: value };
      // Picking a material from the Purchase catalogue brings its unit along
      if (field === 'itemName' && !it.unit) next.unit = unitOf.get(String(value).toLowerCase()) || '';
      return next;
    }));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (key) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
    // Its quotes go with it, for every vendor
    setQuotations((prev) => prev.map((q) => {
      if (!q.lines[key]) return q;
      const lines = { ...q.lines };
      delete lines[key];
      return { ...q, lines };
    }));
  };

  // --- Quotations ------------------------------------------------------------
  const setVendor = (idx, vendorId) =>
    setQuotations((prev) => prev.map((q, i) => (i !== idx ? q : {
      ...q,
      vendor: vendorId,
      vendorName: activeVendors.find((v) => v._id === vendorId)?.vendorName || '',
    })));

  const setLine = (idx, itemKey, field, value) =>
    setQuotations((prev) => prev.map((q, i) => (i !== idx ? q : {
      ...q,
      lines: { ...q.lines, [itemKey]: { ...(q.lines[itemKey] || emptyLine()), [field]: value } },
    })));

  // Only one vendor can be recommended
  const selectQuotation = (idx) =>
    setQuotations((prev) => prev.map((q, i) => ({ ...q, isSelected: i === idx })));

  const addQuotation = () => setQuotations((p) => [...p, emptyQuotation()]);
  const removeQuotation = (idx) => setQuotations((p) => p.filter((_, i) => i !== idx));

  // Cheapest vendor per item, so the side-by-side picture is visible while typing
  const lowestByItem = useMemo(() => Object.fromEntries(items.map((it) => {
    const offers = quotations
      .filter((q) => q.vendor && Number(q.lines[it.key]?.quotedRate) > 0)
      .map((q) => ({ quotationKey: q.key, total: lineTotals(q.lines[it.key], it.requiredQuantity).total }));
    const best = offers.sort((a, b) => a.total - b.total)[0];
    return [it.key, best ? { ...best, count: offers.length } : null];
  })), [items, quotations]);

  // Overall lowest, among vendors that quoted every item
  const ranked = useMemo(() => {
    const complete = quotations
      .map((q, i) => ({ i, t: quotationTotals(q, items) }))
      .filter((x) => quotations[x.i].vendor && x.t.quoted === items.length && x.t.total > 0);
    if (!complete.length) return null;
    const best = [...complete].sort((a, b) => a.t.total - b.t.total)[0];
    return { lowestIndex: best.i, lowestTotal: best.t.total, count: complete.length };
  }, [quotations, items]);

  const validate = () => {
    const problems = [];
    const seenItems = new Set();
    items.forEach((it, i) => {
      const name = it.itemName.trim();
      const label = name || `Item ${i + 1}`;
      if (!name) problems.push(`Item ${i + 1} needs a material name`);
      if (!(Number(it.requiredQuantity) > 0)) problems.push(`${label} needs a required quantity greater than zero`);
      const key = `${name.toLowerCase()}|${it.unit.trim().toLowerCase()}`;
      if (name && seenItems.has(key)) problems.push(`${label} is listed more than once`);
      seenItems.add(key);
    });

    const seenVendors = new Set();
    let withRates = 0;
    quotations.forEach((q, i) => {
      const entered = items.filter((it) => lineHasData(q.lines[it.key]));
      if (!q.vendor) {
        if (entered.length) problems.push(`Vendor ${i + 1}: select a vendor for the rates entered`);
        return;
      }
      const who = q.vendorName || `Vendor ${i + 1}`;
      if (seenVendors.has(q.vendor)) problems.push(`${who} appears more than once`);
      seenVendors.add(q.vendor);
      if (!entered.length) problems.push(`${who} has no rates entered — enter at least one rate or remove the vendor`);
      entered.forEach((it) => {
        if (!(Number(q.lines[it.key].quotedRate) > 0)) problems.push(`${who} needs a rate greater than zero for ${it.itemName || 'an item'}`);
      });
      if (entered.length) withRates += 1;
    });
    if (!withRates) problems.push('Add at least one vendor quotation');

    setErrors(problems);
    return problems.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors([]);

    const payload = {
      comparisonRemarks: remarks,
      items: items.map((it) => ({
        key: it.key,
        itemName: it.itemName.trim(),
        requiredQuantity: Number(it.requiredQuantity) || 0,
        unit: it.unit,
      })),
      quotations: quotations
        .filter((q) => q.vendor)
        .map((q) => ({
          _id: q._id,
          vendor: q.vendor,
          vendorName: q.vendorName,
          isSelected: !!q.isSelected,
          lines: items
            .filter((it) => lineHasData(q.lines[it.key]))
            .map((it) => {
              const l = q.lines[it.key];
              return {
                item: it.key,
                quotedRate: Number(l.quotedRate) || 0,
                taxPercent: Number(l.taxPercent) || 0,
                deliveryTime: String(l.deliveryTime || '').trim(),
                paymentTerms: String(l.paymentTerms || '').trim(),
              };
            }),
        })),
    };

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setErrors([res?.message || 'Something went wrong.']);
  };

  const filledCount = quotations.filter((q) => q.vendor && items.some((it) => Number(q.lines[it.key]?.quotedRate) > 0)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {isEdit ? `Edit ${comparison?.comparisonNumber || 'Rate Comparison'}` : 'Rate Comparison'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit
                ? `Dated ${fmtDate(comparison?.comparisonDate)} · compare ${MIN_QUOTATIONS_TO_SUBMIT}+ vendors, recommend one, then send it to the Director.`
                : `Add the items, collect quotations from ${MIN_QUOTATIONS_TO_SUBMIT}+ vendors, recommend one, then send it to the Director. The date is recorded automatically.`}
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

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Items</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <button type="button" onClick={addItem} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={it.key} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6 flex items-end gap-2">
                    <span className="w-5 h-5 mb-1.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <label className={LABEL}>Material Name <span className="text-red-500">*</span></label>
                      <SearchableSelect
                        value={it.itemName}
                        onChange={(v) => setItem(it.key, 'itemName', v)}
                        options={itemNames}
                        placeholder="Select or type a material"
                      />
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className={LABEL}>Required Quantity <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={it.requiredQuantity}
                      onChange={(e) => setItem(it.key, 'requiredQuantity', e.target.value)} className={INPUT} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <label className={LABEL}>Unit</label>
                    <select value={it.unit} onChange={(e) => setItem(it.key, 'unit', e.target.value)} className={INPUT}>
                      <option value="">—</option>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      {it.unit && !UNITS.includes(it.unit) && <option value={it.unit}>{it.unit}</option>}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(it.key)} title="Remove item"
                        className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                Lowest quote so far{items.length > 1 ? ' for all items' : ''}: <strong className="text-emerald-700">{inr(ranked.lowestTotal)}</strong>
                {' '}(vendor {ranked.lowestIndex + 1})
              </p>
            )}
            {items.length > 1 && (
              <p className="text-[11px] text-gray-400 mb-2">
                Leave an item blank for a vendor that did not quote it. The recommended vendor must quote every item.
              </p>
            )}

            <div className="space-y-2">
              {quotations.map((q, idx) => (
                <QuotationCard
                  key={q.key}
                  index={idx}
                  q={q}
                  items={items}
                  vendors={activeVendors}
                  lowestByItem={lowestByItem}
                  onVendor={setVendor}
                  onLine={setLine}
                  onRemove={removeQuotation}
                  onSelect={selectQuotation}
                  canRemove={quotations.length > 1}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Overall Comparison Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
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
