import { useRef, useState, useEffect } from 'react';
import {
  ACCEPT_ATTR, MAX_FILE_MB, ALLOWED_LABEL, validateKycFile,
  formatBytes, fileKindOf, isPreviewable,
} from '../../config/kyc';

const KindIcon = ({ kind }) => {
  const paths = {
    image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    excel: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    file: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  };
  const tone = { image: 'text-blue-600 bg-blue-50', pdf: 'text-red-600 bg-red-50', excel: 'text-green-700 bg-green-50', file: 'text-gray-600 bg-gray-100' }[kind];
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[kind]} />
      </svg>
    </div>
  );
};

/**
 * One document upload slot on the public KYC form.
 *
 * Shows the document name, the upload control, the selected file's name and
 * size, its status, a preview for images/PDFs, and a remove/replace control —
 * all before the form is submitted.
 */
const DocumentSlot = ({ doc, file, error, disabled, onSelect, onRemove }) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Local object URL for previewing the chosen file, revoked on change/unmount
  useEffect(() => {
    if (!file || !isPreviewable(file.name)) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const kind = file ? fileKindOf(file.name) : 'file';

  const status = error
    ? { label: 'Invalid', cls: 'bg-red-100 text-red-700' }
    : file
      ? { label: 'Ready to upload', cls: 'bg-green-100 text-green-700' }
      : { label: 'Not selected', cls: 'bg-gray-100 text-gray-500' };

  return (
    <div className={`border rounded-lg p-3 transition-colors ${error ? 'border-red-300 bg-red-50/40' : file ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {file ? <KindIcon kind={kind} /> : (
          <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800">
              {doc.label}{' '}
              {doc.required
                ? <span className="text-red-500">*</span>
                : <span className="text-[10px] font-normal text-gray-400">(optional)</span>}
            </p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
          </div>

          {file ? (
            <p className="text-[11px] text-gray-600 mt-0.5 truncate">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {ALLOWED_LABEL} · under {MAX_FILE_MB} MB
            </p>
          )}

          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              disabled={disabled}
              className="hidden"
              onChange={(e) => {
                onSelect(doc.field, e.target.files?.[0] || null);
                e.target.value = ''; // allow re-selecting the same filename
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 disabled:opacity-50"
            >
              {file ? 'Replace' : 'Choose File'}
            </button>

            {file && previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Preview
              </a>
            )}

            {file && (
              <button
                type="button"
                onClick={() => onRemove(doc.field)}
                disabled={disabled}
                className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The full set of document slots. Validation runs the moment a file is picked,
 * so the vendor sees a problem immediately rather than on submit.
 */
const KycDocumentUpload = ({ documents, files, errors, disabled = false, onChange }) => {
  const select = (field, file) => {
    if (!file) return onChange(field, null, null);
    const problem = validateKycFile(file);
    // A rejected file is still shown, with its reason, so the vendor can see
    // exactly which one was wrong instead of it silently vanishing.
    onChange(field, file, problem);
  };

  const remove = (field) => onChange(field, null, null);

  return (
    // Two per row from tablet up; one per row on phones, where a slot's
    // controls need the full width to stay tappable.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {documents.map((doc) => (
        <DocumentSlot
          key={doc.field}
          doc={doc}
          file={files[doc.field] || null}
          error={errors[doc.field] || null}
          disabled={disabled}
          onSelect={select}
          onRemove={remove}
        />
      ))}
    </div>
  );
};

export default KycDocumentUpload;
