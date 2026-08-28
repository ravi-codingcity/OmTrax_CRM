import { useRef, useState, useEffect, useMemo } from 'react';
import {
  MAX_FILE_MB, validateKycFile, acceptAttrFor, labelFor,
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

  // A mandatory slot keeps a red edge until it is satisfied, so what is still
  // outstanding is obvious at a glance.
  const frame = error
    ? 'border-red-300 bg-red-50/40'
    : file
      ? 'border-green-300 bg-green-50/30'
      : (doc.required ? 'border-red-200 bg-red-50/20 border-l-2 border-l-red-500' : 'border-gray-200');

  return (
    <div className={`border rounded-lg p-2.5 transition-colors duration-200 ${frame}`}>
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
              {doc.required && <span className="text-red-500 font-bold">*</span>}
            </p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
          </div>

          {file ? (
            <p className="text-[11px] text-gray-600 mt-0.5 truncate">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {labelFor(doc.field)} · under {MAX_FILE_MB} MB
            </p>
          )}

          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept={acceptAttrFor(doc.field)}
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
 * The full set of document slots.
 *
 * Mandatory documents are always visible and carry a red edge. Optional ones
 * start as a row of checkboxes — the vendor ticks the documents they actually
 * have, and only those upload areas appear. That keeps a form offering eleven
 * possible documents short for a vendor who has three of them.
 *
 * Validation runs the moment a file is picked, so a problem shows immediately
 * rather than on submit.
 */
const KycDocumentUpload = ({
  documents, files, errors, disabled = false, onChange,
}) => {
  const select = (field, file) => {
    if (!file) return onChange(field, null, null);
    // Pass the slot so per-field format rules apply (template slots take Word)
    const problem = validateKycFile(file, field);
    // A rejected file is still shown, with its reason, so the vendor can see
    // exactly which one was wrong instead of it silently vanishing.
    onChange(field, file, problem);
  };

  const remove = (field) => onChange(field, null, null);

  const required = documents.filter((d) => d.required);
  // Template documents (download -> fill -> upload) are shown in full by the
  // form itself, not behind a checkbox — the vendor needs to see that a
  // template exists before they can decide whether they have one.
  const optional = documents.filter((d) => !d.required && !d.isTemplate);

  // Which optional documents the vendor has ticked. A slot already holding a
  // file counts as ticked without being stored, so a pre-filled form opens in
  // the right state and no effect is needed to keep the two in step.
  const [ticked, setTicked] = useState(() => new Set());

  const opened = useMemo(() => {
    const set = new Set(ticked);
    documents.forEach((d) => { if (!d.required && files[d.field]) set.add(d.field); });
    return set;
  }, [ticked, documents, files]);

  const toggle = (field, checked) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(field); else next.delete(field);
      return next;
    });
    // Unticking discards anything chosen, so a hidden slot never submits
    if (!checked && files[field]) onChange(field, null, null);
  };

  const slotFor = (doc) => (
    <DocumentSlot
      doc={doc}
      file={files[doc.field] || null}
      error={errors[doc.field] || null}
      disabled={disabled}
      onSelect={select}
      onRemove={remove}
    />
  );

  const revealed = optional.filter((d) => opened.has(d.field));

  return (
    <div className="space-y-3">
      {/* Mandatory — always visible */}
      {required.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1.5">
            Required &middot; {required.length}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {required.map((doc) => (
              <div key={doc.field}>{slotFor(doc)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Optional — tick what you have */}
      {optional.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Optional &middot; tick any you have
          </p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {optional.map((doc) => {
              const on = opened.has(doc.field);
              const done = !!files[doc.field];
              return (
                <label
                  key={doc.field}
                  className={`inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-sm
                              cursor-pointer transition-all duration-200 select-none ${
                    done
                      ? 'border-green-300 bg-green-50 text-green-800'
                      : on
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(doc.field, e.target.checked)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="truncate max-w-[18rem]">{doc.label}</span>
                  {done && <span className="text-green-600 font-bold">&#10003;</span>}
                </label>
              );
            })}
          </div>

          {revealed.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {revealed.map((doc) => (
                <div key={doc.field} className="animate-[fadeIn_200ms_ease-out]">
                  {slotFor(doc)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KycDocumentUpload;
