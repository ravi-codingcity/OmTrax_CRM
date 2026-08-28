import { useRef, useState } from 'react';
import { validateKycFile, formatBytes, acceptAttrFor, labelFor, MAX_FILE_MB } from '../../config/kyc';

/**
 * One download-fill-upload document.
 *
 * The vendor is given the real Word template to download, fills it in offline,
 * and uploads the completed copy. Both documents using this card are optional,
 * so nothing here ever blocks submission.
 *
 * The numbered steps are the point of the design: without them a vendor sees an
 * upload box and has no idea a template exists.
 */

const Step = ({ n, label, state }) => {
  // done | active | todo
  const tone = {
    done: 'bg-green-600 text-white',
    active: 'bg-amber-600 text-white',
    todo: 'bg-gray-200 text-gray-500',
  }[state];
  return (
    <li className="flex items-center gap-1.5 min-w-0">
      <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center
                        flex-shrink-0 transition-colors duration-300 ${tone}`}>
        {state === 'done' ? '✓' : n}
      </span>
      <span className={`text-[10px] truncate transition-colors duration-300 ${
        state === 'todo' ? 'text-gray-400' : 'text-gray-700 font-medium'
      }`}>
        {label}
      </span>
    </li>
  );
};

const TemplateDocumentCard = ({
  field,
  label,
  description,
  templateUrl,
  templateName,
  file,
  error,
  disabled = false,
  onChange,        // (field, file|null, problem|null)
}) => {
  const inputRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const accept = acceptAttrFor(field);

  const take = (picked) => {
    if (!picked) return;
    const problem = validateKycFile(picked, field);
    onChange(field, problem ? null : picked, problem);
    // Let the same file be chosen again after a rejection
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    take(e.dataTransfer.files?.[0]);
  };

  const remove = () => {
    onChange(field, null, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stepState = (n) => {
    if (n === 1) return downloaded || file ? 'done' : 'active';
    if (n === 2) return file ? 'done' : (downloaded ? 'active' : 'todo');
    return file ? 'done' : (downloaded ? 'active' : 'todo');
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${
      file ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-white'
    }`}>
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800">{label}</p>
            {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
          </div>
          <span className="flex-shrink-0 text-[10px] font-medium text-gray-400 border border-gray-200
                           bg-white rounded px-1.5 py-0.5">
            Optional
          </span>
        </div>

        <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          <Step n={1} label="Download" state={stepState(1)} />
          <Step n={2} label="Fill offline" state={stepState(2)} />
          <Step n={3} label="Upload" state={stepState(3)} />
        </ol>
      </div>

      <div className="p-3 space-y-2">
        {/* Step 1 — the real template */}
        <a
          href={templateUrl}
          download={templateName}
          onClick={() => setDownloaded(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     text-amber-800 bg-amber-100 border border-amber-200 hover:bg-amber-200
                     active:scale-[0.98] transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloaded ? 'Download again' : 'Download template'}
        </a>

        {/* Step 3 — the completed copy */}
        {file ? (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-green-300
                          bg-white animate-[fadeIn_200ms_ease-out]">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700
                             flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-[10px] text-green-700">Uploaded &middot; {formatBytes(file.size)}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="px-2 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200
                           rounded hover:bg-amber-50 transition-colors disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={disabled}
                className="px-2 py-1 text-[10px] font-semibold text-red-600 border border-red-200
                           rounded hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border
                        border-dashed text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
              dragging
                ? 'border-amber-500 bg-amber-50 text-amber-800 scale-[1.01]'
                : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload completed form
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => take(e.target.files?.[0])}
          disabled={disabled}
          className="hidden"
          aria-label={`Upload completed ${label}`}
        />

        <p className="text-[10px] text-gray-400">
          {labelFor(field)} &middot; under {MAX_FILE_MB} MB
        </p>

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1
                        animate-[fadeIn_200ms_ease-out]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default TemplateDocumentCard;
