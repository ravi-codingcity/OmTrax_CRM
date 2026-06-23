import { useState } from 'react';

// Accordion-style card: only the heading shows by default; click to expand/collapse.
const CollapsibleSection = ({ title, children, defaultOpen = false, badge = null }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{title}</h3>
          {badge != null && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
