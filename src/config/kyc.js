// Vendor KYC constants — mirrors CRM Backend/src/constants/kycConstants.js.
// The backend is the enforcement point; these exist so the UI can validate
// early and give the vendor fast, clear feedback.

// --- File restrictions -----------------------------------------------------

export const MAX_FILE_MB = 1;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES = 14;

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

// Word formats, accepted ONLY on the template slots — mirrors WORD_TYPES in the
// backend's kycConstants.js. Keeping them off the general set stops a .docx
// being uploaded as a PAN card.
const WORD_MIME = {
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/octet-stream': ['doc', 'docx'],
};

export const WORD_EXTENSIONS = ['doc', 'docx'];
export const WORD_ACCEPT_ATTR = '.doc,.docx';

// The slots that hand the vendor a template to fill in
export const TEMPLATE_FIELDS = ['generalAgreement', 'tdsDeclaration'];
export const acceptsWord = (field) => TEMPLATE_FIELDS.includes(field);

export const extensionsFor = (field) =>
  (acceptsWord(field) ? [...ALLOWED_EXTENSIONS, ...WORD_EXTENSIONS] : ALLOWED_EXTENSIONS);

export const acceptAttrFor = (field) =>
  (acceptsWord(field) ? `${ACCEPT_ATTR},${WORD_ACCEPT_ATTR}` : ACCEPT_ATTR);

export const labelFor = (field) =>
  (acceptsWord(field) ? `${ALLOWED_LABEL}, DOC or DOCX` : ALLOWED_LABEL);

export const extensionOf = (name = '') => (name.split('.').pop() || '').toLowerCase();

/**
 * Validate one selected file against the size and format rules.
 * @returns {string|null} a problem message, or null when the file is fine
 */
export const validateKycFile = (file, field) => {
  if (!file) return null;

  const ext = extensionOf(file.name);

  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Each document must be under ${MAX_FILE_MB} MB.`;
  }

  // Both the browser-reported type and the extension must line up, matching the
  // backend rule — renaming a file is not enough to get it accepted.
  // Template slots additionally accept Word.
  const mimeMap = acceptsWord(field) ? { ...ALLOWED_MIME, ...WORD_MIME } : ALLOWED_MIME;
  const byMime = mimeMap[file.type];
  const allowed = extensionsFor(field);

  if (!allowed.includes(ext) || !byMime || !byMime.includes(ext)) {
    return `"${file.name}" is not an accepted format. Upload ${labelFor(field)} only.`;
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
  { field: 'incorporationCertificate', label: 'Incorporation Certificate (CIN)', required: false },
  { field: 'aadhaarCard', label: 'Aadhaar Card', required: false },
  { field: 'msmeCertificate', label: 'MSME Certificate', required: false },
  { field: 'balanceSheet', label: 'Balance Sheet', required: false },
  { field: 'profitLoss', label: 'Profit & Loss (P&L) Statement', required: false },
  { field: 'agreementUpload', label: 'Agreement', required: false },
  // Template documents — download, fill offline, upload the completed copy
  { field: 'generalAgreement', label: 'General Agreement Form', required: false, isTemplate: true, acceptsWord: true },
  {
    field: 'tdsDeclaration',
    label: 'TDS Declaration – Non-Deduction of TDS (Transporter), Tax Year 2026-27',
    required: false, isTemplate: true, acceptsWord: true,
  },
];

// A vendor who is not GST registered enters this instead of a GST number.
export const URP_VALUE = 'URP';
export const isUrp = (value) => String(value ?? '').trim().toUpperCase() === URP_VALUE;

const GST_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const isValidGst = (value) => GST_RX.test(String(value ?? '').trim().toUpperCase());

/**
 * Whether a document must be uploaded for the GST value entered. An
 * unregistered (URP) vendor has no GST certificate, so it stops being
 * mandatory; an `optionalWhenUrp` document would do the same while staying
 * visible.
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
  // The four most-used Operations services lead the list; the rest follow
  // alphabetically. Mirrors OTHER_SERVICES in the backend's kycConstants.js.
  'Transportation', 'Loading and Unloading', 'Labour', 'Handy Man',
  'AMC', 'Air & Sea Freight and Custom Clearance', 'Furniture & Fixtures',
  'Insurance', 'Office Equipment', 'Packing Material', 'Postage & Courier',
  'Printing & Stationary', 'Professional', 'Relocation Charges', 'Rent / Lease',
  'Repair & Maintenance', 'Security', 'Tools and Equipment', 'Tour & Travel',
];

// --- Service location & company size ---------------------------------------
// Fallbacks only. The live lists come from the form endpoint so the backend
// stays authoritative (mirrors INDIAN_STATES / COMPANY_SIZES in kycConstants).

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

// City suggestions per State / UT. A convenience for the dropdown only — the
// vendor may type a city that is not listed, so cities are never validated
// against this map (mirrors CITIES_BY_STATE in the backend's indiaLocations.js).
export const CITIES_BY_STATE = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur', 'Kadapa'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Begusarai', 'Ara'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Bharuch', 'Vapi', 'Mehsana'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat', 'Yamunanagar', 'Panchkula', 'Bahadurgarh', 'Manesar'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Baddi', 'Kullu', 'Una'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Hazaribagh', 'Deoghar'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari', 'Tumakuru', 'Shivamogga', 'Udupi'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Kottayam'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Navi Mumbai', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Ahmednagar', 'Chakan'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Angul'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bhilwara', 'Alwar', 'Sikar', 'Bhiwadi'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Tiruppur', 'Hosur', 'Thoothukudi'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Secunderabad'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Greater Noida', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Jhansi', 'Mathura'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur', 'Haldia'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Pitampura', 'Okhla', 'Narela'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

export const citiesForState = (state) => CITIES_BY_STATE[String(state ?? '').trim()] || [];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

export const MAX_OTHER_STATE_GST = 36;

// --- Per-form configuration -------------------------------------------------

// Which sections each workflow shows. The form endpoint sends these flags on
// every load; this is the fallback for a failed fetch.
export const KYC_FORM_CONFIG = {
  purchase: {
    kycType: 'purchase',
    label: 'Purchase Department KYC',
    departmentLabel: 'Purchase Department',
    collectsMaterials: true,
    collectsServices: false,
    collectsVehicles: false,
    servicesLabel: 'Other Services',
  },
  operations: {
    kycType: 'operations',
    label: 'Operations Department KYC',
    departmentLabel: 'Operations Department',
    collectsMaterials: false,
    collectsServices: true,
    collectsVehicles: true,
    // Operations calls these Operation Services rather than Other Services
    servicesLabel: 'Operation Services',
  },
};

export const formConfigFor = (kycType) =>
  KYC_FORM_CONFIG[kycType] || KYC_FORM_CONFIG.purchase;

export const docTypeLabel = (docType) =>
  ({
    pan_card: 'PAN Card',
    gst_certificate: 'GST Certificate',
    cancelled_cheque: 'Cancelled Cheque',
    incorporation_certificate: 'Incorporation Certificate (CIN)',
    aadhaar_card: 'Aadhaar Card',
    msme_certificate: 'MSME Certificate',
    balance_sheet: 'Balance Sheet',
    profit_loss: 'Profit & Loss (P&L) Statement',
    agreement: 'Agreement',
    general_agreement: 'General Agreement Form',
    tds_declaration: 'TDS Declaration – Non-Deduction of TDS (Transporter), Tax Year 2026-27',
    // Legacy types — no longer collected, but old submissions still carry them
    company_registration: 'Company Registration Document',
    bank_statement: 'Bank Statement',
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
