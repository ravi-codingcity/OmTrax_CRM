import { useState, useMemo } from 'react';

const INPUT = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:bg-gray-50';

/**
 * One add-from-dropdown list. Used twice: once for materials sourced from the
 * Purchase Department's item master, once for the fixed service list.
 */
const SelectionList = ({
  title, hint, emptyText, addLabel, options, selected, onChange, tone, disabled,
}) => {
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');

  const chosen = useMemo(
    () => new Set(selected.map((v) => v.toLowerCase())),
    [selected]
  );

  // Never offer something already chosen
  const available = useMemo(
    () => options.filter((o) => !chosen.has(o.toLowerCase())),
    [options, chosen]
  );

  const add = (value) => {
    const v = String(value ?? choice).trim();
    if (!v) {
      setError(`Choose a ${title.toLowerCase()} from the list first.`);
      return;
    }
    if (chosen.has(v.toLowerCase())) {
      setError('That is already on your list.');
      return;
    }
    onChange([...selected, v]);
    setChoice('');
    setError('');
  };

  const remove = (idx) => onChange(selected.filter((_, i) => i !== idx));

  const tones = {
    amber: { chip: 'bg-amber-50 text-amber-800 border-amber-200', num: 'bg-amber-100 text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700' },
    blue: { chip: 'bg-blue-50 text-blue-800 border-blue-200', num: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' },
  }[tone];

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tones.num}`}>
          {selected.length} selected
        </span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mb-2">{hint}</p>}

      {/* Chosen entries */}
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 mb-2.5">
          {selected.map((value, idx) => (
            <li key={value}
              className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border text-[11px] max-w-full ${tones.chip}`}>
              <span className="truncate">{value}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                title={`Remove ${value}`}
                aria-label={`Remove ${value}`}
                className="p-0.5 rounded hover:bg-white/60 flex-shrink-0 disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-gray-400 italic mb-2.5">{emptyText}</p>
      )}

      {/* Add another */}
      <div className="flex gap-2">
        <select
          value={choice}
          onChange={(e) => { setChoice(e.target.value); if (error) setError(''); }}
          disabled={disabled || available.length === 0}
          className={`${INPUT} flex-1`}
        >
          <option value="">
            {options.length === 0
              ? `No ${title.toLowerCase()} available`
              : available.length === 0
                ? 'All options already added'
                : `Select ${title.toLowerCase()}...`}
          </option>
          {available.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          type="button"
          onClick={() => add()}
          disabled={disabled || !choice}
          className={`px-3 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 whitespace-nowrap ${tones.btn}`}
        >
          {addLabel}
        </button>
      </div>

      {error && <p className="text-red-600 text-[11px] mt-1.5">{error}</p>}

      {options.length === 0 && (
        <p className="text-[11px] text-gray-400 mt-1.5">
          This list could not be loaded. You can still submit using the other section.
        </p>
      )}
    </div>
  );
};

/**
 * Material and service selection for the Vendor KYC form.
 *
 * A vendor may supply materials, provide services, or both — so these are two
 * separate lists rather than one free-text field. Materials come from the
 * Purchase Department's item master (so new materials appear here without a code
 * change); services come from a fixed list. Both are stored separately.
 */
const MaterialServiceSelector = ({
  materials, services, materialOptions = [], serviceOptions = [], onChangeMaterials, onChangeServices, disabled = false,
}) => (
  <div className="space-y-2.5">
    <SelectionList
      title="Materials"
      tone="amber"
      hint="Materials we purchase. Select each one you can supply."
      emptyText="No materials selected yet."
      addLabel="Add Material"
      options={materialOptions}
      selected={materials}
      onChange={onChangeMaterials}
      disabled={disabled}
    />

    <SelectionList
      title="Other Services"
      tone="blue"
      hint="Logistics, labour and other professional services you provide."
      emptyText="No services selected yet."
      addLabel="Add Service"
      options={serviceOptions}
      selected={services}
      onChange={onChangeServices}
      disabled={disabled}
    />

    {materials.length === 0 && services.length === 0 && (
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Select at least one material or service before submitting.
      </p>
    )}
  </div>
);

export default MaterialServiceSelector;
