import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Clean, searchable single-select dropdown. Filters options as you type and
 * (when allowCustom) lets the user enter a value not in the list.
 */
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select or search',
  allowCustom = true,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [query, options]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        setHighlight(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && highlight >= 0 && listRef.current?.children[highlight]) {
      listRef.current.children[highlight].scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const choose = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && filtered[highlight]) choose(filtered[highlight]);
      else if (allowCustom && query.trim()) choose(query.trim());
    } else if (e.key === 'Escape') { setOpen(false); setHighlight(-1); }
  };

  const renderLabel = (label) => {
    const term = query.trim();
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

  const baseCls = `w-full pl-2.5 pr-7 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
  }`;

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value); if (allowCustom) onChange(e.target.value); setOpen(true); setHighlight(-1); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={handleKeyDown}
          placeholder={value || placeholder}
          autoComplete="off"
          className={baseCls}
        />
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
              {filtered.map((o, i) => (
                <li key={o}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(o)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                      i === highlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{renderLabel(o)}</span>
                    {value === o && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">
              {allowCustom && query.trim()
                ? <>Use <span className="font-medium text-gray-700">“{query.trim()}”</span></>
                : 'No matches'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
