import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { kycAPI } from '../services/api';
import MaterialServiceSelector from '../components/Kyc/MaterialServiceSelector';
import ServiceLocationSelector from '../components/Kyc/ServiceLocationSelector';
import TemplateDocumentCard from '../components/Kyc/TemplateDocumentCard';
// The real Word templates the vendor downloads, filled in offline and returned
// through the matching upload slot. `?url` keeps them as static assets.
import generalAgreementTemplate from '../assets/General Agreement.docx?url';
import tdsDeclarationTemplate from '../assets/Declaration for Non-Deduction of TDS \u2013 Transporter \u2013 Tax Year 2026-27.docx?url';

import KycDocumentUpload from '../components/Kyc/KycDocumentUpload';
import {
  KYC_DOCUMENT_FIELDS, MAX_FILE_MB,
  URP_VALUE, isUrp, isValidGst, documentsFor, OTHER_SERVICES,
  INDIAN_STATES, CITIES_BY_STATE, COMPANY_SIZES, MAX_OTHER_STATE_GST, formConfigFor,
  documentFieldsFor, VEHICLE_SERVICE,
} from '../config/kyc';
import omtrax_logo from '../assets/OmTrax.png';

// Everything a template slot needs beyond what the server sends
const TEMPLATE_META = {
  generalAgreement: {
    url: generalAgreementTemplate,
    fileName: 'OmTrax General Agreement.docx',
    description: 'Download, complete and sign, then upload the finished copy.',
  },
  tdsDeclaration: {
    url: tdsDeclarationTemplate,
    fileName: 'OmTrax TDS Declaration 2026-27.docx',
    description: 'For transporters claiming non-deduction of TDS. Tax Year 2026-27.',
  },
};

/**
 * PUBLIC Vendor KYC form.
 *
 * Rendered outside MainLayout and outside ProtectedRoute — the vendor has no
 * CRM account. The token in the URL is the only credential, and the backend
 * re-validates every field and file, so nothing here can be bypassed by
 * editing the page or calling the API directly.
 */

const Shell = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 py-6 px-3 sm:px-4">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-4">
        <img src={omtrax_logo} alt="OmTrax" className="h-9 w-auto mx-auto" />
        <p className="text-gray-500 text-xs mt-1.5">Vendor KYC Verification</p>
      </div>
      {children}
      <p className="text-center text-gray-400 text-[11px] mt-5">© 2026 OmTrax. All rights reserved.</p>
    </div>
  </div>
);

const Notice = ({ tone = 'gray', title, children }) => {
  const tones = {
    gray: 'bg-white border-gray-200',
    green: 'bg-green-50 border-green-300',
    amber: 'bg-amber-50 border-amber-300',
  };
  return (
    <div className={`rounded-xl shadow-sm border p-6 text-center ${tones[tone]}`}>
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      <div className="text-sm text-gray-600 mt-2">{children}</div>
    </div>
  );
};

const Section = ({ title, hint, step, required = false, children }) => (
  <section className="border border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-gray-50/80 border-b border-gray-200 px-3 py-2 flex items-baseline gap-2">
      {step && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold
                         flex items-center justify-center leading-none">{step}</span>
      )}
      <h2 className="text-xs font-semibold text-gray-700">
        {title}{required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </h2>
      {hint && <p className="text-[11px] text-gray-400 truncate hidden sm:block">· {hint}</p>}
    </div>
    <div className="p-3">
      {hint && <p className="text-[11px] text-gray-400 mb-2.5 sm:hidden">{hint}</p>}
      {children}
    </div>
  </section>
);

// A checkbox that reveals its field only when ticked. Sized to sit two-per-row
// so PF and ESI share a single line on desktop.
const RevealCheckbox = ({ label, checked, onChange, disabled, children }) => (
  <div className={`border rounded-lg p-2.5 transition-colors duration-200 ${
    checked ? 'border-amber-300 bg-amber-50/40' : 'border-dashed border-gray-200'
  }`}>
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
      />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
    {checked && <div className="mt-2 animate-[fadeIn_200ms_ease-out]">{children}</div>}
  </div>
);

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all';

// Section order and the numbers they carry on the full form. A Correction KYC
// Link shows only some sections, and numbers those that remain in order.
const SECTION_ORDER = ['vendor', 'company', 'locations', 'supply', 'documents', 'templates', 'bank', 'additional'];
const FULL_FORM_STEPS = { vendor: 1, company: 2, locations: 3, supply: 4, documents: 5, templates: 6, bank: 7, additional: 8 };
// Which correction choices live in the Vendor Information and Company sections
const VENDOR_SECTION_KEYS = ['vendorName', 'companyName', 'address', 'contactDetails', 'gstNumber', 'otherStateGst', 'panNumber'];
const COMPANY_SECTION_KEYS = ['companySize', 'shopEstablishment'];
const LABEL_CLS = 'block text-xs font-medium text-gray-600 mb-1';

// Module scope on purpose — a component created during render is remounted on
// every keystroke, which would drop focus while the vendor is typing.
const Field = ({ name, title, placeholder, required, type = 'text', className = '', hint, form, setField }) => (
  <div className={className}>
    <label className={LABEL_CLS}>
      {title} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setField(name, e.target.value)}
      className={INPUT_CLS}
      placeholder={placeholder}
    />
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

const KycForm = () => {
  const { token } = useParams();

  const [state, setState] = useState('loading'); // loading | ready | error | done
  const [errorInfo, setErrorInfo] = useState({ message: '', vendorName: '' });
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [docFields, setDocFields] = useState(KYC_DOCUMENT_FIELDS);

  // Which of the two workflows this link opens. The server decides; this is
  // only the fallback until the form loads.
  const [formCfg, setFormCfg] = useState(formConfigFor('purchase'));

  const [form, setForm] = useState({
    vendorName: '', companyName: '', contactPerson: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
    gstNumber: '', panNumber: '',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '',
    kycAdditionalInfo: '',
    // Optional statutory details
    esiNumber: '', pfNumber: '', shopEstablishmentNumber: '',
    companySize: '', serviceLocation: '',
    // Operations only
    numberOfVehicles: '',
  });
  const [materials, setMaterials] = useState([]);
  const [services, setServices] = useState([]);
  const [materialOptions, setMaterialOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState(OTHER_SERVICES);
  const [stateOptions, setStateOptions] = useState(INDIAN_STATES);
  const [cityOptions, setCityOptions] = useState(CITIES_BY_STATE);
  const [companySizeOptions, setCompanySizeOptions] = useState(COMPANY_SIZES);
  // Where the vendor operates: many states, each with optional cities
  const [serviceLocations, setServiceLocations] = useState([]);
  // Extra state registrations. Hidden until the vendor says they have them.
  const [hasOtherStateGst, setHasOtherStateGst] = useState(false);
  const [otherStateGst, setOtherStateGst] = useState([]);
  // Shop Establishment and IEC sit behind "do you have one?" — the input only
  // appears on yes, and neither is ever required. (PF and ESI moved to the
  // Documents section and are now collected as uploads.)
  const [hasShop, setHasShop] = useState(false);
  const [files, setFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');   // what the vendor is waiting on
  const [result, setResult] = useState(null);
  // Set when this is a Correction KYC Link: the details and documents the
  // vendor was asked to correct. Only those are shown and submitted.
  const [correction, setCorrection] = useState(null);
  // Hard guard against a double submit — more reliable than the disabled
  // attribute alone, which a fast second click can slip past.
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await kycAPI.getForm(token);
      const d = res.data.data;
      setUploadsEnabled(d.uploadsEnabled !== false);
      // The server list is authoritative; the local set is the fallback and must
      // still respect which slots this form type offers.
      setDocFields(Array.isArray(d.documents) && d.documents.length
        ? d.documents
        : documentFieldsFor(d.kycType));
      // Which sections to show comes from the server, so the vendor can never
      // be shown a section their form does not collect.
      setFormCfg({
        ...formConfigFor(d.kycType),
        ...(d.kycTypeLabel ? { label: d.kycTypeLabel } : {}),
        ...(typeof d.collectsMaterials === 'boolean' ? { collectsMaterials: d.collectsMaterials } : {}),
        ...(typeof d.collectsServices === 'boolean' ? { collectsServices: d.collectsServices } : {}),
        ...(typeof d.collectsVehicles === 'boolean' ? { collectsVehicles: d.collectsVehicles } : {}),
        ...(d.servicesLabel ? { servicesLabel: d.servicesLabel } : {}),
        ...(d.departmentLabel ? { departmentLabel: d.departmentLabel } : {}),
      });
      setForm((p) => ({
        ...p,
        vendorName: d.vendorName || '',
        companyName: d.companyName || '',
        contactPerson: d.contactPerson || '',
        email: d.email || '',
        phone: d.phone || '',
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        pincode: d.pincode || '',
        gstNumber: d.gstNumber || '',
        panNumber: d.panNumber || '',
        esiNumber: d.esiNumber || '',
        pfNumber: d.pfNumber || '',
        shopEstablishmentNumber: d.shopEstablishmentNumber || '',
        companySize: d.companySize || '',
        serviceLocation: d.serviceLocation || '',
        numberOfVehicles: d.numberOfVehicles === 0 || d.numberOfVehicles ? String(d.numberOfVehicles) : '',
        // Sent only on a Correction KYC Link that asks for these
        bankName: d.bankName || '',
        accountHolderName: d.accountHolderName || '',
        accountNumber: d.accountNumber || '',
        ifscCode: d.ifscCode || '',
        kycAdditionalInfo: d.kycAdditionalInfo || '',
      }));
      setCorrection(d.correction && Array.isArray(d.correction.fields) ? d.correction : null);
      // Dropdown sources. Materials come from the Purchase Department's item
      // master via the form endpoint, so anything the Purchase Manager adds
      // shows up here without a code change.
      if (Array.isArray(d.materialOptions)) setMaterialOptions(d.materialOptions);
      if (Array.isArray(d.serviceOptions) && d.serviceOptions.length) setServiceOptions(d.serviceOptions);
      if (Array.isArray(d.stateOptions) && d.stateOptions.length) setStateOptions(d.stateOptions);
      if (d.citiesByState && typeof d.citiesByState === 'object') setCityOptions(d.citiesByState);
      if (Array.isArray(d.serviceLocations) && d.serviceLocations.length) {
        setServiceLocations(d.serviceLocations.map((l) => ({
          state: l.state || '', cities: Array.isArray(l.cities) ? [...l.cities] : [],
        })));
      } else if (d.serviceLocation) {
        // An older record holding a single state — carry it into the new shape
        setServiceLocations([{ state: d.serviceLocation, cities: [] }]);
      }
      if (Array.isArray(d.companySizeOptions) && d.companySizeOptions.length) {
        setCompanySizeOptions(d.companySizeOptions);
      }
      if (d.shopEstablishmentNumber) setHasShop(true);
      if (Array.isArray(d.otherStateGst) && d.otherStateGst.length) {
        setOtherStateGst(d.otherStateGst.map((g) => ({ state: g.state || '', gstNumber: g.gstNumber || '' })));
        setHasOtherStateGst(true);
      }

      // Both selectors work on plain name strings
      if (Array.isArray(d.materials) && d.materials.length) {
        setMaterials(d.materials.map((m) => m.materialName).filter(Boolean));
      }
      if (Array.isArray(d.services) && d.services.length) {
        setServices(d.services.map((sv) => sv.serviceName).filter(Boolean));
      }
      setState('ready');
    } catch (err) {
      setErrorInfo({
        message: err.response?.data?.message || 'This KYC link could not be opened.',
        vendorName: err.response?.data?.vendorName || '',
      });
      setState('error');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  // Dropping Transportation drops the vehicle count with it, so a hidden field
  // can never be submitted.
  const changeServices = (next) => {
    setServices(next);
    if (!next.includes(VEHICLE_SERVICE)) setField('numberOfVehicles', '');
  };

  // --- Other-state GST rows ---
  const addStateGst = () =>
    setOtherStateGst((p) => (p.length >= MAX_OTHER_STATE_GST ? p : [...p, { state: '', gstNumber: '' }]));
  const removeStateGst = (i) => setOtherStateGst((p) => p.filter((_, x) => x !== i));
  const setStateGst = (i, key, value) =>
    setOtherStateGst((p) => p.map((row, x) => (x === i ? { ...row, [key]: value } : row)));

  const toggleShop = (checked) => {
    setHasShop(checked);
    if (!checked) setField('shopEstablishmentNumber', '');
  };

  // Unticking the box discards the rows, so a hidden section can never submit
  const toggleOtherStateGst = (checked) => {
    setHasOtherStateGst(checked);
    setOtherStateGst(checked ? (otherStateGst.length ? otherStateGst : [{ state: '', gstNumber: '' }]) : []);
  };

  const onFileChange = (field, file, problem) => {
    setFiles((p) => {
      const next = { ...p };
      if (file) next[field] = file; else delete next[field];
      return next;
    });
    setFileErrors((p) => {
      const next = { ...p };
      if (problem) next[field] = problem; else delete next[field];
      return next;
    });
  };

  const hasFileErrors = useMemo(() => Object.keys(fileErrors).length > 0, [fileErrors]);

  // --- Correction KYC Link ---------------------------------------------------
  // On the full form everything shows; on a correction link, only what the
  // department selected. The server enforces the same selection.
  const inCorrection = !!correction;
  const selectedKeys = useMemo(
    () => new Set((correction?.fields || []).map((c) => c.key)),
    [correction]
  );
  const show = (key) => !inCorrection || selectedKeys.has(key);
  // The form inputs a correction resubmits (e.g. Bank Details -> four inputs)
  const correctionBodyKeys = useMemo(
    () => new Set((correction?.fields || []).filter((c) => c.type === 'field').flatMap((c) => c.bodyFields || [])),
    [correction]
  );
  const supplyKey = formCfg.collectsMaterials ? 'materials' : 'services';

  // A vendor entering URP is not GST registered: the GST certificate slot is
  // hidden, and the company registration document stays on offer but stops
  // being mandatory. `required` comes back already resolved, so the asterisks
  // and the submit check below agree. Mirrored by the backend.
  const unregistered = isUrp(form.gstNumber);
  // On a correction link only the selected documents are asked for, and each is
  // required — it is being replaced or supplied.
  const shownDocs = useMemo(() => {
    const docs = documentsFor(docFields, form.gstNumber);
    if (!inCorrection) return docs;
    return docs.filter((d) => selectedKeys.has(d.field)).map((d) => ({ ...d, required: true }));
  }, [docFields, form.gstNumber, inCorrection, selectedKeys]);
  // The two template documents keep their own always-visible section, so the
  // vendor can see a template exists before deciding whether they have one.
  const templateDocs = useMemo(
    () => shownDocs.filter((d) => TEMPLATE_META[d.field]),
    [shownDocs]
  );
  // The vehicle count only makes sense for a transporter, so it appears only
  // once Transportation is among the chosen services. Mirrored by the backend,
  // which clears the value when Transportation is not selected.
  const showVehicles = formCfg.collectsVehicles && services.includes(VEHICLE_SERVICE);

  const fileCount = useMemo(() => Object.keys(files).length, [files]);

  const sectionVisible = {
    vendor: VENDOR_SECTION_KEYS.some(show),
    company: COMPANY_SECTION_KEYS.some(show),
    locations: show('serviceLocations'),
    supply: show(supplyKey),
    documents: !inCorrection || shownDocs.some((d) => !TEMPLATE_META[d.field]),
    templates: templateDocs.length > 0,
    bank: show('bankDetails'),
    additional: show('additionalInfo'),
  };
  const stepOf = (id) => String(inCorrection
    ? SECTION_ORDER.filter((k) => sectionVisible[k]).indexOf(id) + 1
    : FULL_FORM_STEPS[id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Never let a second request start while one is running
    if (inFlight.current) return;
    setErrors([]);

    // Mirror the backend's checks so the vendor gets immediate feedback
    // (On a correction link, only the selected details are checked)
    const problems = [];
    if (show('vendorName') && !form.vendorName.trim()) problems.push('Legal Name (as per PAN) is required');
    if (show('companyName') && !form.companyName.trim()) problems.push('Vendor Company Name is required');
    if (show('address') && !form.address.trim()) problems.push('Company address is required');
    if (show('contactDetails') && !form.email.trim()) problems.push('Email ID is required');
    if (show('contactDetails') && !form.phone.trim()) problems.push('Phone number is required');
    if (show('panNumber') && !form.panNumber.trim()) problems.push('PAN card number is required');

    const gst = form.gstNumber.trim();
    if (show('gstNumber')) {
      if (!gst) problems.push(`GST Number / URP is required — enter your GST number, or ${URP_VALUE} if you are not GST registered`);
      else if (!isUrp(gst) && !isValidGst(gst)) {
        problems.push(`Enter a valid GST number, or ${URP_VALUE} if you are not GST registered`);
      }
    }

    // Each form asks for only what it collects
    if (formCfg.collectsMaterials && show('materials') && !materials.length) {
      problems.push('Select at least one material you supply');
    }
    if (formCfg.collectsServices && show('services') && !services.length) {
      problems.push('Select at least one service you provide');
    }

    // At least one state is required on both forms; cities remain optional
    if (show('serviceLocations') && !serviceLocations.some((l) => (l.state || '').trim())) {
      problems.push('Add at least one Service Location (State / UT)');
    }

    const seenLocationStates = new Set();
    if (show('serviceLocations')) serviceLocations.forEach((l, i) => {
      const st = (l.state || '').trim();
      if (!st) { problems.push(`Service location #${i + 1}: select a state`); return; }
      if (seenLocationStates.has(st)) problems.push(`${st} is listed twice in Service Locations`);
      seenLocationStates.add(st);
    });

    if (hasOtherStateGst && show('otherStateGst')) {
      const seen = new Set();
      otherStateGst.forEach((row, i) => {
        const st = (row.state || '').trim();
        const gstNo = (row.gstNumber || '').trim().toUpperCase();
        if (!st && !gstNo) return;              // an untouched row is fine
        const at = `Other state GST #${i + 1}`;
        if (!st) problems.push(`${at}: select a state`);
        else if (seen.has(st)) problems.push(`${at}: ${st} is listed more than once`);
        else seen.add(st);
        if (!gstNo) problems.push(`${at}: enter the GST number`);
        else if (!isValidGst(gstNo)) problems.push(`${at}: "${gstNo}" is not a valid GST number`);
      });
    }

    if (hasFileErrors) problems.push('Fix or remove the documents marked invalid');
    shownDocs.filter((d) => d.required).forEach((d) => {
      if (!files[d.field]) problems.push(`${d.label} is required`);
    });

    if (problems.length) {
      setErrors(problems);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setProgress(0);
    setStage(fileCount ? `Uploading ${fileCount} document${fileCount === 1 ? '' : 's'}...` : 'Submitting...');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      // A correction link sends only the details it asked for
      if (inCorrection && !correctionBodyKeys.has(k)) return undefined;
      // Never send a value whose field is hidden
      if (k === 'numberOfVehicles' && !showVehicles) return fd.append(k, '');
      return fd.append(k, v);
    });
    // Multipart cannot carry a real array, so the lists travel as JSON.
    // Materials and services are kept separate all the way into MongoDB.
    if (show('materials')) fd.append('materials', JSON.stringify(formCfg.collectsMaterials ? materials.map((m) => ({ materialName: m })) : []));
    if (show('services')) fd.append('services', JSON.stringify(formCfg.collectsServices ? services.map((sv) => ({ serviceName: sv })) : []));
    // Only the rows the vendor can actually see are sent
    // Structured: each state carries its own cities
    if (show('serviceLocations')) fd.append('serviceLocations', JSON.stringify(
      serviceLocations
        .filter((l) => (l.state || '').trim())
        .map((l) => ({ state: l.state.trim(), cities: (l.cities || []).map((c) => c.trim()).filter(Boolean) }))
    ));
    if (show('shopEstablishment')) fd.append('hasShopEstablishment', String(hasShop));
    if (show('otherStateGst')) fd.append('otherStateGst', JSON.stringify(
      hasOtherStateGst
        ? otherStateGst
            .filter((r) => (r.state || '').trim() || (r.gstNumber || '').trim())
            .map((r) => ({ state: r.state.trim(), gstNumber: r.gstNumber.trim().toUpperCase() }))
        : []
    ));
    Object.entries(files).forEach(([field, file]) => fd.append(field, file));

    try {
      const res = await kycAPI.submit(token, fd, (pct) => {
        setProgress(pct);
        // Once the bytes are up, the wait is Cloudinary + the database
        if (pct >= 100) setStage('Saving your details securely...');
      });
      setResult(res.data);
      setState('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const data = err.response?.data;
      let messages;
      if (err.code === 'ECONNABORTED') {
        messages = ['The upload took too long. Check your connection and try again — nothing has been saved.'];
      } else if (!err.response) {
        messages = ['Could not reach the server. Check your connection and try again.'];
      } else {
        messages = data?.errors?.length ? data.errors : [data?.message || 'Submission failed. Please try again.'];
      }
      setErrors(messages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      // Always clear, so the form can never be left stuck on "submitting"
      inFlight.current = false;
      setSubmitting(false);
      setProgress(0);
      setStage('');
    }
  };

  // ---- States -------------------------------------------------------------

  if (state === 'loading') {
    return (
      <Shell>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-500 mt-3">Opening your KYC form...</p>
        </div>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <Notice tone="amber" title="This link can't be opened">
          <p>{errorInfo.message}</p>
          {errorInfo.vendorName && (
            <p className="mt-2 text-xs text-gray-500">Vendor on record: <strong>{errorInfo.vendorName}</strong></p>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Please contact your OmTrax representative to have a new link issued.
          </p>
        </Notice>
      </Shell>
    );
  }

  if (state === 'done' && inCorrection) {
    return (
      <Shell>
        <Notice tone="green" title="Correction submitted successfully">
          <p>{result?.message || 'Your corrected details are now with our Finance team for review.'}</p>
          <div className="mt-4 bg-white/70 rounded-lg p-3 text-xs text-gray-600 inline-block text-left">
            <p><strong>Vendor:</strong> {result?.data?.vendorName || form.vendorName}</p>
            <p><strong>Corrected:</strong> {(result?.data?.corrected || correction.fields.map((c) => c.label)).join(', ')}</p>
            <p><strong>Documents uploaded:</strong> {result?.data?.documents ?? 0}</p>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            You can close this page. We'll be in touch once the review is complete.
          </p>
        </Notice>
      </Shell>
    );
  }

  if (state === 'done') {
    return (
      <Shell>
        <Notice tone="green" title="KYC submitted successfully">
          <p>{result?.message || 'Your details are now with our Finance team for review.'}</p>
          <div className="mt-4 bg-white/70 rounded-lg p-3 text-xs text-gray-600 inline-block text-left">
            <p><strong>Vendor:</strong> {result?.data?.vendorName || form.vendorName}</p>
            <p><strong>Materials submitted:</strong> {result?.data?.materials ?? materials.length}</p>
            <p><strong>Services submitted:</strong> {result?.data?.services ?? services.length}</p>
            <p><strong>Documents uploaded:</strong> {result?.data?.documents ?? 0}</p>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            You can close this page. We'll be in touch once the review is complete.
          </p>
        </Notice>
      </Shell>
    );
  }

  // ---- Form ---------------------------------------------------------------

  const f = { form, setField };

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-100">
          <h1 className="text-lg font-semibold text-gray-800">{inCorrection ? 'Vendor KYC Correction' : 'Vendor KYC Form'}</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {inCorrection
              ? <>{formCfg.label} &middot; please correct only the items below. Everything else you submitted stays as it is.</>
              : <>{formCfg.label} &middot; please complete all required fields and upload the listed documents.</>}
          </p>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          {inCorrection && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-orange-900">Please correct the following:</p>
              <ul className="flex flex-wrap gap-1.5 mt-2">
                {correction.fields.map((c) => (
                  <li key={c.key} className="px-2 py-0.5 rounded-md bg-white border border-orange-200 text-xs text-orange-900">{c.label}</li>
                ))}
              </ul>
              {correction.vendorNote && (
                <p className="text-xs text-orange-900 mt-2 whitespace-pre-wrap break-words">
                  <span className="font-semibold">Note from OmTrax:</span> {correction.vendorNote}
                </p>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-red-800">Please check the following:</p>
              <ul className="list-disc list-inside text-xs text-red-700 mt-1 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {sectionVisible.vendor && (
          <Section title="Vendor Information" step={stepOf('vendor')} hint="Legal identity and contact details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {show('vendorName') && <Field name="vendorName" title="Legal Name (as per PAN)" placeholder="Exactly as printed on your PAN" required hint="Must match your PAN document" {...f} />}
              {show('companyName') && <Field name="companyName" title="Vendor Company Name" placeholder="Your trading / company name" required {...f} />}
              {show('address') && <Field name="address" title="Company Address" placeholder="Full registered address" required className="sm:col-span-2 lg:col-span-3" {...f} />}
              {show('contactDetails') && <Field name="email" title="Email ID" type="email" placeholder="you@company.com" required {...f} />}
              {show('contactDetails') && <Field name="phone" title="Phone Number" placeholder="10-digit mobile" required {...f} />}
              {(show('gstNumber') || show('otherStateGst')) && (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                    {show('gstNumber') && (
                    <div>
                      <label className={LABEL_CLS}>
                        GST Number / URP <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.gstNumber}
                        onChange={(e) => setField('gstNumber', e.target.value)}
                        className={INPUT_CLS}
                        placeholder="07AABCU9603R1ZM or URP"
                      />
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        15-character GST number. Not registered? Type{' '}
                        <button
                          type="button"
                          onClick={() => setField('gstNumber', URP_VALUE)}
                          className="font-semibold text-amber-700 underline underline-offset-2"
                        >
                          URP
                        </button>{' '}
                        &mdash; Unregistered Proprietorship.
                      </p>
                    </div>
                    )}

                    {/* Sits beside the GST field so it cannot be missed */}
                    {show('otherStateGst') && (
                    <div className={show('gstNumber') ? 'sm:pt-5' : ''}>
                      <label className={`flex items-start gap-2 cursor-pointer select-none rounded-lg border p-2
                                         transition-colors duration-200 ${
                        hasOtherStateGst ? 'border-amber-400 bg-white' : 'border-amber-200 bg-white/70 hover:border-amber-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={hasOtherStateGst}
                          onChange={(e) => toggleOtherStateGst(e.target.checked)}
                          disabled={submitting}
                          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-800">
                            Do you have GST registration in other states?
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            Tick to add each additional state and its GST number.
                          </span>
                        </span>
                      </label>
                    </div>
                    )}
                  </div>

                  {hasOtherStateGst && show('otherStateGst') && (
                    <div className="mt-2.5 space-y-2 animate-[fadeIn_200ms_ease-out]">
                      {otherStateGst.map((row, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={row.state}
                            onChange={(e) => setStateGst(i, 'state', e.target.value)}
                            className={`${INPUT_CLS} sm:flex-1`}
                            disabled={submitting}
                          >
                            <option value="">Select state / UT</option>
                            {stateOptions.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <input
                            value={row.gstNumber}
                            onChange={(e) => setStateGst(i, 'gstNumber', e.target.value)}
                            className={`${INPUT_CLS} sm:flex-1`}
                            placeholder="GST number for that state"
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            onClick={() => removeStateGst(i)}
                            disabled={submitting}
                            className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 disabled:opacity-50"
                            aria-label={`Remove other state GST ${i + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addStateGst}
                        disabled={submitting || otherStateGst.length >= MAX_OTHER_STATE_GST}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                      >
                        + Add another state
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}
              {show('panNumber') && <Field name="panNumber" title="PAN Card Number" placeholder="ABCDE1234F" required hint="10 characters" {...f} />}
              {show('contactDetails') && <Field name="contactPerson" title="Contact Person" placeholder="Primary contact" {...f} />}
              {show('address') && <Field name="city" title="City" placeholder="City" {...f} />}
              {show('address') && <Field name="state" title="State" placeholder="State" {...f} />}
              {show('address') && <Field name="pincode" title="Pincode" placeholder="6-digit" {...f} />}
            </div>
          </Section>
          )}

          {sectionVisible.company && (
          <Section
            title="Company & Statutory Details"
            step={stepOf('company')}
            hint="All optional — fill in whatever applies"
          >
            <div className="space-y-2.5">
              {/* Company Size and Shop Establishment share one row. The Shop
                  field stays behind its checkbox and expands in place. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                {show('companySize') && (
                <div>
                  <label className={LABEL_CLS}>Company Size</label>
                  <select
                    value={form.companySize}
                    onChange={(e) => setField('companySize', e.target.value)}
                    className={INPUT_CLS}
                    disabled={submitting}
                  >
                    <option value="">Select company size</option>
                    {companySizeOptions.map((c) => (
                      <option key={c} value={c}>{c} employees</option>
                    ))}
                  </select>
                </div>
                )}

                {show('shopEstablishment') && (
                <RevealCheckbox
                  label="Do you have Shop Establishment Number?"
                  checked={hasShop} onChange={toggleShop} disabled={submitting}
                >
                  <Field name="shopEstablishmentNumber" title="Shop Establishment Number" placeholder="Shop & Establishment registration" {...f} />
                </RevealCheckbox>
                )}
              </div>
            </div>
          </Section>
          )}

          {sectionVisible.locations && (
          <Section
            title="Service Locations"
            step={stepOf('locations')}
            required
            hint="At least one State — cities optional"
          >
            <ServiceLocationSelector
              locations={serviceLocations}
              onChange={setServiceLocations}
              stateOptions={stateOptions}
              citiesByState={cityOptions}
              disabled={submitting}
              maxStates={stateOptions.length}
            />
          </Section>
          )}

          {sectionVisible.supply && (
          <Section
            title={formCfg.collectsMaterials ? 'Material Details' : formCfg.servicesLabel}
            step={stepOf('supply')}
            required
            hint={
              formCfg.collectsMaterials
                ? 'At least one material you supply'
                : 'At least one service you provide'
            }
          >
            <MaterialServiceSelector
              materials={materials}
              services={services}
              materialOptions={materialOptions}
              serviceOptions={serviceOptions}
              onChangeMaterials={setMaterials}
              onChangeServices={changeServices}
              showMaterials={formCfg.collectsMaterials}
              showServices={formCfg.collectsServices}
              servicesLabel={formCfg.servicesLabel}
              disabled={submitting}
            />

            {/* Belongs with the services it depends on, not with the statutory
                details: it appears only once Transportation is chosen. */}
            {showVehicles && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 animate-[fadeIn_200ms_ease-out]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field
                    name="numberOfVehicles"
                    title="Number of Vehicles"
                    type="number"
                    placeholder="e.g. 12"
                    hint="Shown because you provide Transportation"
                    {...f}
                  />
                </div>
              </div>
            )}
          </Section>
          )}

          {sectionVisible.documents && (
          <Section
            title="Documents"
            step={stepOf('documents')}
            hint={inCorrection
              ? `Upload a corrected copy of each · under ${MAX_FILE_MB} MB each`
              : `Tick the optional ones you have · under ${MAX_FILE_MB} MB each`}
          >
            {inCorrection && Object.keys(correction.currentDocuments || {}).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-0.5">Currently on file — your upload replaces it:</p>
                <ul className="space-y-0.5">
                  {shownDocs.filter((d) => correction.currentDocuments[d.field]).map((d) => (
                    <li key={d.field}>
                      {d.label}: <span className="font-mono">{correction.currentDocuments[d.field].originalName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!uploadsEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                Document upload is temporarily unavailable. Please contact your OmTrax representative before submitting.
              </div>
            )}
            {unregistered && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-xs text-blue-800">
                You selected <strong>{URP_VALUE}</strong> (Unregistered Proprietorship),
                so the GST Certificate is not needed.
              </div>
            )}
            <KycDocumentUpload
              // A correction may require a template document; those have their
              // own section below, so they are not listed here twice
              documents={inCorrection ? shownDocs.filter((d) => !TEMPLATE_META[d.field]) : shownDocs}
              files={files}
              errors={fileErrors}
              disabled={submitting || !uploadsEnabled}
              onChange={onFileChange}
            />
          </Section>
          )}

          {templateDocs.length > 0 && (
            <Section
              title="Agreement & TDS Forms"
              step={stepOf('templates')}
              hint={inCorrection ? 'Download, fill in, then upload the corrected copy' : 'Download, fill in, then upload \\u2014 both optional'}
            >
              <p className="text-xs text-gray-500 mb-2.5">
                {inCorrection
                  ? 'Download the template, fill it in, and upload the corrected document.'
                  : 'These two forms are completed offline. Download the template, fill it in, and upload the finished document. You can submit your KYC without them.'}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {templateDocs.map((d) => (
                  <TemplateDocumentCard
                    key={d.field}
                    field={d.field}
                    label={d.label}
                    description={TEMPLATE_META[d.field].description}
                    templateUrl={TEMPLATE_META[d.field].url}
                    templateName={TEMPLATE_META[d.field].fileName}
                    file={files[d.field]}
                    error={fileErrors[d.field]}
                    disabled={submitting || !uploadsEnabled}
                    onChange={onFileChange}
                  />
                ))}
              </div>
            </Section>
          )}

          {sectionVisible.bank && (
          <Section title="Bank Details" step={stepOf('bank')} hint="Optional, but speeds up payment setup">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <Field name="bankName" title="Bank Name" placeholder="e.g. HDFC Bank" {...f} />
              <Field name="accountHolderName" title="Account Holder Name" placeholder="As per bank records" {...f} />
              <Field name="accountNumber" title="Account Number" placeholder="Bank account number" {...f} />
              <Field name="ifscCode" title="IFSC Code" placeholder="HDFC0001234" hint="11 characters" {...f} />
            </div>
          </Section>
          )}

          {sectionVisible.additional && (
          <Section title="Additional Information" step={stepOf('additional')}>
            <textarea
              value={form.kycAdditionalInfo}
              onChange={(e) => setField('kycAdditionalInfo', e.target.value)}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
              placeholder="Anything else our Finance team should know (optional)"
            />
          </Section>
          )}

          <div>
            {/* Progress while the documents are on their way */}
            {submitting && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                  <span>{stage}</span>
                  {progress > 0 && progress < 100 && <span className="font-medium">{progress}%</span>}
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-amber-500 transition-all duration-300 ${progress >= 100 ? 'animate-pulse' : ''}`}
                    style={{ width: `${Math.max(progress, 4)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Please keep this page open — do not press Submit again.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || hasFileErrors}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {progress > 0 && progress < 100 ? `Uploading ${progress}%` : 'Submitting...'}
                </>
              ) : inCorrection ? 'Submit Correction' : 'Submit KYC'}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Your information is submitted securely and reviewed by the OmTrax Finance team.
            </p>
          </div>
        </div>
      </form>
    </Shell>
  );
};

export default KycForm;
