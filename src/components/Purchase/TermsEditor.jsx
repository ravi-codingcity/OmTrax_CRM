import { useState, useMemo } from 'react';

const INPUT = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500';

const IconBtn = ({ onClick, title, disabled, tone = 'gray', children }) => {
  const tones = {
    gray: 'text-gray-500 hover:bg-gray-100',
    blue: 'text-blue-600 hover:bg-blue-100',
    red: 'text-red-500 hover:bg-red-50',
    green: 'text-emerald-600 hover:bg-emerald-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`p-1 rounded ${tones[tone]} disabled:opacity-30 disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
};

const Icon = ({ d }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const PATH = {
  up: 'M5 15l7-7 7 7',
  down: 'M19 9l-7 7-7-7',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16',
  check: 'M5 13l4 4L19 7',
  close: 'M6 18L18 6M6 6l12 12',
  plus: 'M12 4v16m8-8H4',
};

/**
 * Point-wise Terms & Conditions for a Purchase Order.
 *
 * Each condition is its own numbered point that can be edited, deleted or moved
 * up and down. Terms used on previous purchase orders appear as one-tap
 * suggestions, and anything already on this PO is filtered out of them so the
 * same condition cannot be added twice.
 */
const TermsEditor = ({ terms, onChange, suggestions = [], disabled = false }) => {
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isDuplicate = (text, ignoreIndex = -1) =>
    terms.some((t, i) => i !== ignoreIndex && t.trim().toLowerCase() === text.trim().toLowerCase());

  const add = (text) => {
    const value = String(text ?? draft).trim();
    if (!value) {
      setError('Type a condition before adding it.');
      return;
    }
    if (isDuplicate(value)) {
      setError('That condition is already on this purchase order.');
      return;
    }
    onChange([...terms, value]);
    setDraft('');
    setError('');
  };

  const remove = (idx) => {
    onChange(terms.filter((_, i) => i !== idx));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const move = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= terms.length) return;
    const next = [...terms];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
    if (editingIndex === idx) setEditingIndex(target);
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setEditingText(terms[idx]);
    setError('');
  };

  const commitEdit = () => {
    const value = editingText.trim();
    if (!value) {
      setError('A condition cannot be empty. Delete it instead.');
      return;
    }
    if (isDuplicate(value, editingIndex)) {
      setError('Another point already says that.');
      return;
    }
    onChange(terms.map((t, i) => (i === editingIndex ? value : t)));
    setEditingIndex(null);
    setError('');
  };

  // Only offer terms this PO does not already carry
  const available = useMemo(() => {
    const used = new Set(terms.map((t) => t.trim().toLowerCase()));
    return suggestions.filter((s) => !used.has(String(s.text || s).trim().toLowerCase()));
  }, [suggestions, terms]);

  return (
    <div className="space-y-2">
      {/* Existing points */}
      {terms.length > 0 && (
        <ol className="space-y-1.5">
          {terms.map((term, idx) => (
            <li key={`${idx}-${term.slice(0, 12)}`}
              className="flex items-start gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white">
              <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>

              {editingIndex === idx ? (
                <>
                  <input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    autoFocus
                    className={`${INPUT} flex-1`}
                  />
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <IconBtn onClick={commitEdit} title="Save" tone="green"><Icon d={PATH.check} /></IconBtn>
                    <IconBtn onClick={() => setEditingIndex(null)} title="Cancel"><Icon d={PATH.close} /></IconBtn>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-gray-700 leading-relaxed break-words">{term}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <IconBtn onClick={() => move(idx, -1)} title="Move up" disabled={disabled || idx === 0}>
                      <Icon d={PATH.up} />
                    </IconBtn>
                    <IconBtn onClick={() => move(idx, 1)} title="Move down" disabled={disabled || idx === terms.length - 1}>
                      <Icon d={PATH.down} />
                    </IconBtn>
                    <IconBtn onClick={() => startEdit(idx)} title="Edit" tone="blue" disabled={disabled}>
                      <Icon d={PATH.edit} />
                    </IconBtn>
                    <IconBtn onClick={() => remove(idx)} title="Delete" tone="red" disabled={disabled}>
                      <Icon d={PATH.trash} />
                    </IconBtn>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Add a new point */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          disabled={disabled}
          className={`${INPUT} flex-1`}
          placeholder={terms.length ? 'Add another condition...' : 'e.g. Payment will be made within 30 days'}
        />
        <button
          type="button"
          onClick={() => add()}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
        >
          <Icon d={PATH.plus} />
          Add
        </button>
      </div>

      {error && <p className="text-red-600 text-[11px]">{error}</p>}

      {/* Reuse terms from previous purchase orders */}
      {available.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg"
              className={`h-3.5 w-3.5 transition-transform ${showSuggestions ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Previously used terms
            <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
              {available.length}
            </span>
          </button>

          {showSuggestions && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {available.map((s) => {
                const text = String(s.text || s);
                return (
                  <button
                    key={text}
                    type="button"
                    onClick={() => add(text)}
                    disabled={disabled}
                    title={s.uses ? `Used on ${s.uses} purchase order${s.uses === 1 ? '' : 's'}` : 'Add this term'}
                    className="px-2 py-1 text-[11px] rounded-md bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent hover:border-emerald-200 max-w-full truncate disabled:opacity-50"
                  >
                    + {text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {terms.length === 0 && (
        <p className="text-[11px] text-gray-400">
          Optional. Anything you add here is saved with the purchase order, appears on its PDF,
          and is offered as a suggestion next time.
        </p>
      )}
    </div>
  );
};

export default TermsEditor;
