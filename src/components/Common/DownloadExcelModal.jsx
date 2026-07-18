import { SALES_STATUS_FILTERS } from '../../utils/salesExport';

// Tailwind needs literal class strings, so map colour -> selected classes.
const SELECTED_CLASSES = {
  blue: 'bg-blue-600 text-white border-blue-600',
  red: 'bg-red-600 text-white border-red-600',
  amber: 'bg-amber-500 text-white border-amber-500',
  indigo: 'bg-indigo-600 text-white border-indigo-600',
  green: 'bg-green-600 text-white border-green-600',
  teal: 'bg-teal-600 text-white border-teal-600',
};

const DownloadIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);

// Lead-bucket picker for the "Download Excel Sheet" action. Shared by the
// Salesperson (My Entries) and Admin (All Sales) pages.
const DownloadExcelModal = ({
  counts,
  filter,
  onFilterChange,
  onDownload,
  onClose,
  busy = false,
  description = 'Select which leads you want to export.',
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Download Excel Sheet</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
        {SALES_STATUS_FILTERS.map((opt) => {
          const selected = filter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onFilterChange(opt.key)}
              className={`px-3 py-3 rounded-lg border text-center transition-all ${
                selected ? `${SELECTED_CLASSES[opt.color]} shadow` : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-lg font-bold leading-none">{counts[opt.key]}</p>
              <p className="text-xs font-medium mt-1">{opt.key}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onDownload}
          disabled={!counts[filter] || busy}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Preparing...
            </>
          ) : (
            <>
              <DownloadIcon className="h-4 w-4 mr-1" />
              Download ({counts[filter]})
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

export { DownloadIcon };
export default DownloadExcelModal;
