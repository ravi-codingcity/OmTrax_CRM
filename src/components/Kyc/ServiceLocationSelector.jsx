import { useState, useMemo } from 'react';

const INPUT = 'w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:bg-gray-50';

/**
 * Where a vendor provides services: many states, each with optional cities.
 *
 * Laid out as two columns — states on the left, the cities of whichever state
 * is focused on the right — so the section stays one screen-row tall however
 * many states are added. It stacks on phones.
 *
 * Used unchanged by both KYC forms. The state list is fixed; cities are only
 * suggestions, so a vendor operating somewhere not listed types the name in —
 * which is why the backend validates the state but never the city.
 */
const ServiceLocationSelector = ({
  locations,            // [{ state, cities: [] }]
  onChange,
  stateOptions = [],
  citiesByState = {},
  disabled = false,
  maxStates = 36,
}) => {
  const [pendingState, setPendingState] = useState('');
  // Which state's cities are shown. Stored as an intent, then DERIVED below so
  // removing the focused state cannot leave a dangling selection.
  const [focusRequest, setFocusRequest] = useState(null);
  const [cityDraft, setCityDraft] = useState('');
  const [manual, setManual] = useState(false);
  const [error, setError] = useState('');

  const chosenStates = useMemo(() => new Set(locations.map((l) => l.state)), [locations]);
  const availableStates = useMemo(
    () => stateOptions.filter((s) => !chosenStates.has(s)),
    [stateOptions, chosenStates]
  );

  // Honour the request while it still names a state on the list; otherwise fall
  // back to the most recently added one.
  const focused = (focusRequest && chosenStates.has(focusRequest))
    ? focusRequest
    : (locations.length ? locations[locations.length - 1].state : null);

  const activeRow = locations.find((l) => l.state === focused) || null;

  const addState = () => {
    const s = pendingState.trim();
    if (!s) { setError('Choose a state to add.'); return; }
    if (chosenStates.has(s)) { setError(`${s} is already on your list.`); return; }
    if (locations.length >= maxStates) { setError('You have added every state.'); return; }
    onChange([...locations, { state: s, cities: [] }]);
    setFocusRequest(s);
    setPendingState('');
    setManual(false);
    setCityDraft('');
    setError('');
  };

  const removeState = (state) => {
    onChange(locations.filter((l) => l.state !== state));
    if (focusRequest === state) setFocusRequest(null);
  };

  const addCity = (value) => {
    if (!activeRow) return;
    const city = String(value ?? cityDraft).trim();
    if (!city) return;
    if (activeRow.cities.some((c) => c.toLowerCase() === city.toLowerCase())) {
      setCityDraft('');
      return;                                     // already there
    }
    onChange(locations.map((l) => (
      l.state === activeRow.state ? { ...l, cities: [...l.cities, city] } : l
    )));
    setCityDraft('');
  };

  const removeCity = (idx) =>
    onChange(locations.map((l) => (
      l.state === activeRow.state ? { ...l, cities: l.cities.filter((_, i) => i !== idx) } : l
    )));

  const suggestions = activeRow
    ? (citiesByState[activeRow.state] || [])
      .filter((c) => !activeRow.cities.some((x) => x.toLowerCase() === c.toLowerCase()))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
      {/* ---------------------------------------------------- Left: States */}
      <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/40">
        <div className="flex items-baseline justify-between mb-1.5">
          <h3 className="text-[11px] font-semibold text-gray-700">States / UTs</h3>
          <span className="text-[10px] text-gray-400">
            {locations.length} added
          </span>
        </div>

        <div className="flex gap-1.5">
          <select
            value={pendingState}
            onChange={(e) => { setPendingState(e.target.value); if (error) setError(''); }}
            disabled={disabled || availableStates.length === 0}
            className={`${INPUT} flex-1`}
            aria-label="Select a state to add"
          >
            <option value="">
              {availableStates.length === 0 ? 'All states added' : 'Select a State / UT...'}
            </option>
            {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            onClick={addState}
            disabled={disabled || !pendingState}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-amber-600 rounded-lg
                       hover:bg-amber-700 active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-600 text-[10px] mt-1">{error}</p>}

        {locations.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic mt-2">
            No states added yet. Cities are optional.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 max-h-44 overflow-y-auto pr-0.5">
            {locations.map((loc) => {
              const isActive = loc.state === focused;
              return (
                <li key={loc.state}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setFocusRequest(loc.state); setManual(false); setCityDraft(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); setFocusRequest(loc.state); setManual(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border
                                cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="text-[11px] font-medium text-gray-800 truncate">{loc.state}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        loc.cities.length ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {loc.cities.length || 'all'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeState(loc.state); }}
                        disabled={disabled}
                        aria-label={`Remove ${loc.state}`}
                        className="p-0.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------------------------------------------------- Right: Cities */}
      <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/40">
        <div className="flex items-baseline justify-between mb-1.5">
          <h3 className="text-[11px] font-semibold text-gray-700">
            Cities {activeRow && <span className="text-amber-700">· {activeRow.state}</span>}
          </h3>
          <span className="text-[10px] text-gray-400">Optional</span>
        </div>

        {!activeRow ? (
          <p className="text-[11px] text-gray-400 italic">
            Add a state on the left, then pick its cities here. Leaving cities empty
            means you cover the whole state.
          </p>
        ) : (
          <>
            <div className="flex gap-1.5">
              {manual ? (
                <input
                  value={cityDraft}
                  onChange={(e) => setCityDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }}
                  disabled={disabled}
                  placeholder={`City in ${activeRow.state}`}
                  className={`${INPUT} flex-1`}
                  aria-label={`City name in ${activeRow.state}`}
                  autoFocus
                />
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value === '__manual') { setManual(true); return; }
                    addCity(e.target.value);
                  }}
                  disabled={disabled}
                  className={`${INPUT} flex-1`}
                  aria-label={`Add a city in ${activeRow.state}`}
                >
                  <option value="">
                    {suggestions.length ? 'Add a city...' : 'No suggestions left'}
                  </option>
                  {suggestions.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__manual">+ Add City manually</option>
                </select>
              )}
              {manual && (
                <>
                  <button
                    type="button"
                    onClick={() => addCity()}
                    disabled={disabled || !cityDraft.trim()}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 rounded-lg
                               hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManual(false); setCityDraft(''); }}
                    disabled={disabled}
                    className="px-2 py-1.5 text-[11px] font-medium text-gray-600 border border-gray-200
                               rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>

            {activeRow.cities.length > 0 ? (
              <ul className="flex flex-wrap gap-1 mt-2 max-h-36 overflow-y-auto">
                {activeRow.cities.map((c, i) => (
                  <li key={c}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border
                               border-blue-200 bg-blue-50 text-blue-800 text-[11px]
                               animate-[fadeIn_150ms_ease-out]">
                    <span className="truncate max-w-[9rem]">{c}</span>
                    <button
                      type="button"
                      onClick={() => removeCity(i)}
                      disabled={disabled}
                      aria-label={`Remove ${c}`}
                      className="p-0.5 rounded hover:bg-white/70 disabled:opacity-40"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-gray-400 italic mt-2">
                No cities added — you cover all of {activeRow.state}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ServiceLocationSelector;
