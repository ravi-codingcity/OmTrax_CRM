import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Searchable client combobox. Shows a filtered, scrollable suggestion list as
 * the user types, while still allowing a brand-new client name to be entered.
 */
const ClientCombobox = ({ value, onChange, suggestions = [], placeholder = 'Select or type a client', error = false }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const term = (value || '').trim().toLowerCase();
    if (!term) return suggestions.slice(0, 50);
    return suggestions.filter((s) => s.toLowerCase().includes(term)).slice(0, 50);
  }, [value, suggestions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep highlighted option in view
  useEffect(() => {
    if (open && highlight >= 0 && listRef.current) {
      const node = listRef.current.children[highlight];
      if (node) node.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const selectValue = (val) => {
    onChange(val);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) {
      e.preventDefault();
      selectValue(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  // Highlight the matching portion of a suggestion
  const renderLabel = (label) => {
    const term = (value || '').trim();
    if (!term) return label;
    const idx = label.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="font-semibold text-blue-600">{label.slice(idx, idx + term.length)}</span>
        {label.slice(idx + term.length)}
      </>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2.5 sm:py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {/* Leading search icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {/* Clear / chevron */}
        {value ? (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(true); setHighlight(-1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            aria-label="Clear"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
              {filtered.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectValue(s)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      i === highlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{renderLabel(s)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2.5 text-sm text-gray-500">
              {value?.trim()
                ? <>No match — <span className="font-medium text-gray-700">“{value.trim()}”</span> will be added as a new client.</>
                : 'No existing clients yet. Type to add one.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientCombobox;
