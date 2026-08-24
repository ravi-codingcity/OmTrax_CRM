import { useState, useEffect, useCallback } from 'react';
import { vendorAPI } from '../../services/api';
import { docTypeLabel, formatBytes, fileKindOf, isPreviewable } from '../../config/kyc';
import { fmtDateTime } from '../../config/finance';

const KIND_META = {
  image: { tone: 'text-blue-600 bg-blue-50', path: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  pdf: { tone: 'text-red-600 bg-red-50', path: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  excel: { tone: 'text-green-700 bg-green-50', path: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  file: { tone: 'text-gray-600 bg-gray-100', path: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
};

/**
 * Submitted KYC documents, for Purchase and Finance alike.
 *
 * URLs are fetched from the API rather than read off the vendor record, because
 * documents live in Cloudinary as authenticated assets: the backend issues a
 * short-lived signed URL only after checking the caller's permissions. They
 * expire, so this refetches whenever the panel is opened.
 */
const KycDocumentList = ({ vendorId, fallbackDocuments = [] }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storageConfigured, setStorageConfigured] = useState(true);

  const load = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError('');
    try {
      const res = await vendorAPI.getDocuments(vendorId);
      const d = res.data.data || {};
      setDocuments(d.documents || []);
      setStorageConfigured(d.storageConfigured !== false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the documents.');
      // Show what we already have on the record so the list is never blank
      setDocuments(fallbackDocuments);
    } finally {
      setLoading(false);
    }
  }, [vendorId, fallbackDocuments]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-6 text-center">
        <svg className="animate-spin h-6 w-6 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs text-gray-500 mt-2">Loading documents...</p>
      </div>
    );
  }

  if (!documents.length) {
    return <p className="text-xs text-gray-500 italic py-2">No documents have been uploaded.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-[11px]">{error}</div>
      )}
      {!storageConfigured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-[11px]">
          Document storage is not configured, so these files cannot be opened yet.
        </div>
      )}

      {documents.map((d) => {
        const kind = fileKindOf(d.originalName || d.format);
        const meta = KIND_META[kind];
        const previewable = isPreviewable(d.originalName || d.format);

        return (
          <div key={d._id || d.publicId} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={meta.path} />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800 truncate">
                {d.label || docTypeLabel(d.docType)}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {d.originalName || '—'} · {formatBytes(d.bytes)}
                {d.uploadedAt ? ` · ${fmtDateTime(d.uploadedAt)}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {previewable && d.viewUrl && (
                <a
                  href={d.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  View
                </a>
              )}
              {d.downloadUrl && (
                <a
                  href={d.downloadUrl}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-gray-400 pt-1">
        Links are private and expire after a few minutes. Reopen this panel to refresh them.
      </p>
    </div>
  );
};

export default KycDocumentList;
