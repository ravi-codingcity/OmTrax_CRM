// Vendor KYC constants — mirrors CRM Backend/src/constants/kycConstants.js.
// The backend is the enforcement point; these exist so the UI can validate
// early and give the vendor fast, clear feedback.

// --- File restrictions -----------------------------------------------------

export const MAX_FILE_MB = 1;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES = 8;

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'pdf', 'xls', 'xlsx'];
export const ALLOWED_LABEL = 'JPG, JPEG, PDF, XLS or XLSX';
// The `accept` attribute for the file input
export const ACCEPT_ATTR = '.jpg,.jpeg,.pdf,.xls,.xlsx';

const ALLOWED_MIME = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/jpg': ['jpg', 'jpeg'],
  'application/pdf': ['pdf'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/octet-stream': ['xls', 'xlsx'],
};

export const extensionOf = (name = '') => (name.split('.').pop() || '').toLowerCase();

/**
 * Validate one selected file against the size and format rules.
 * @returns {string|null} a problem message, or null when the file is fine
 */
export const validateKycFile = (file) => {
  if (!file) return null;

  const ext = extensionOf(file.name);

  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Each document must be under ${MAX_FILE_MB} MB.`;
  }

  // Both the browser-reported type and the extension must line up, matching the
  // backend rule — renaming a file is not enough to get it accepted.
  const byMime = ALLOWED_MIME[file.type];
  if (!ALLOWED_EXTENSIONS.includes(ext) || !byMime || !byMime.includes(ext)) {
    return `"${file.name}" is not an accepted format. Upload ${ALLOWED_LABEL} only.`;
  }

  return null;
};

// --- Documents -------------------------------------------------------------

// `field` must match the backend's DOC_FIELD_TO_TYPE map.
// Two flags describe what happens when the vendor is not GST registered:
//   requiresGst     — hidden entirely, and not required
//   optionalWhenUrp — still offered, but no longer required
export const KYC_DOCUMENT_FIELDS = [
  { field: 'panCard', label: 'PAN Card', required: true },
  { field: 'gstCertificate', label: 'GST Certificate', required: true, requiresGst: true },
  { field: 'cancelledCheque', label: 'Cancelled Cheque', required: true },
  { field: 'companyRegistration', label: 'Company Registration Document', required: true, optionalWhenUrp: true },
  { field: 'aadhaarCard', label: 'Aadhaar Card', required: false },
  { field: 'msmeCertificate', label: 'MSME Certificate', required: false },
  { field: 'agreementUpload', label: 'Agreement', required: false },
];

// A vendor who is not GST registered enters this instead of a GST number.
export const URP_VALUE = 'URP';
export const isUrp = (value) => String(value ?? '').trim().toUpperCase() === URP_VALUE;

const GST_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const isValidGst = (value) => GST_RX.test(String(value ?? '').trim().toUpperCase());

/**
 * Whether a document must be uploaded for the GST value entered. An
 * unregistered (URP) vendor has neither a GST certificate nor a company
 * registration document, so both stop being mandatory.
 *
 * Mirrors requiredDocumentsFor() in the backend's kycConstants.js.
 */
export const isDocumentRequired = (doc, gstValue) =>
  Boolean(doc.required) && !((doc.requiresGst || doc.optionalWhenUrp) && isUrp(gstValue));

/**
 * The document slots to show for the GST value entered, each with `required`
 * already resolved — so the asterisk, the validation and the backend all agree.
 *
 * A `requiresGst` document disappears when the vendor is unregistered; an
 * `optionalWhenUrp` one stays on offer and simply stops being mandatory.
 */
export const documentsFor = (documents, gstValue) =>
  documents
    .filter((d) => !(d.requiresGst && isUrp(gstValue)))
    .map((d) => ({ ...d, required: isDocumentRequired(d, gstValue) }));

/**
 * Fallback service list. The live list comes from the form endpoint so the
 * backend stays authoritative; this only covers a failed fetch.
 */
export const OTHER_SERVICES = [
  'AMC', 'Furniture & Fixtures', 'Insurance', 'Labour', 'Office Equipment',
  'Packing Material', 'Postage & Courier', 'Printing & Stationary', 'Professional',
  'Relocation Charges', 'Rent / Lease', 'Security', 'Tools and Equipment',
  'Tour & Travel', 'Transportation', 'Repair & Maintenance',
  'Air & Sea Freight and Custom Clearance',
];

export const docTypeLabel = (docType) =>
  ({
    pan_card: 'PAN Card',
    gst_certificate: 'GST Certificate',
    cancelled_cheque: 'Cancelled Cheque',
    company_registration: 'Company Registration Document',
    aadhaar_card: 'Aadhaar Card',
    msme_certificate: 'MSME Certificate',
    agreement: 'Agreement',
    // Legacy types from the first release
    bank_statement: 'Bank Statement',
    incorporation_certificate: 'Certificate of Incorporation',
    other: 'Other Document',
  }[docType] || 'Document');

// --- Display helpers -------------------------------------------------------

export const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

export const fileKindOf = (nameOrFormat = '') => {
  const ext = extensionOf(nameOrFormat) || String(nameOrFormat).toLowerCase();
  if (['jpg', 'jpeg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'file';
};

// Images and PDFs can be previewed in the browser; Excel can only be downloaded.
export const isPreviewable = (nameOrFormat) => ['image', 'pdf'].includes(fileKindOf(nameOrFormat));

// --- Material list ---------------------------------------------------------

// Materials and services are now chosen from dropdowns rather than typed, so
// the old free-text helpers are gone. See components/Kyc/MaterialServiceSelector.
