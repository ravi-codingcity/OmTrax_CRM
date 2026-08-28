import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { kycAPI } from '../services/api';
import MaterialServiceSelector from '../components/Kyc/MaterialServiceSelector';
import KycDocumentUpload from '../components/Kyc/KycDocumentUpload';
import {
  KYC_DOCUMENT_FIELDS, MAX_FILE_MB, ALLOWED_LABEL,
  URP_VALUE, isUrp, isValidGst, documentsFor, OTHER_SERVICES,
  INDIAN_STATES, COMPANY_SIZES, MAX_OTHER_STATE_GST, formConfigFor,
} from '../config/kyc';
import omtrax_logo from '../assets/OmTrax.png';

/**
 * PUBLIC Vendor KYC form.
 *
 * Rendered outside MainLayout and outside ProtectedRoute — the vendor has no
 * CRM account. The token in the URL is the only credential, and the backend
 * re-validates every field and file, so nothing here can be bypassed by
 * editing the page or calling the API directly.
 */

const Shell = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <img src={omtrax_logo} alt="OmTrax" className="h-10 w-auto mx-auto" />
        <p className="text-gray-500 text-sm mt-2">Vendor KYC Verification</p>
      </div>
      {children}
      <p className="text-center text-gray-400 text-xs mt-6">© 2026 OmTrax. All rights reserved.</p>
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

const Section = ({ title, hint, children }) => (
  <section>
    <div className="mb-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all';
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
    esiNumber: '', pfNumber: '', shopEstablishmentNumber: '', iecCode: '',
    companySize: '', serviceLocation: '',
    // Operations only
    numberOfVehicles: '',
  });
  const [materials, setMaterials] = useState([]);
  const [services, setServices] = useState([]);
  const [materialOptions, setMaterialOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState(OTHER_SERVICES);
  const [stateOptions, setStateOptions] = useState(INDIAN_STATES);
  const [companySizeOptions, setCompanySizeOptions] = useState(COMPANY_SIZES);
  // Extra state registrations. Hidden until the vendor says they have them.
  const [hasOtherStateGst, setHasOtherStateGst] = useState(false);
  const [otherStateGst, setOtherStateGst] = useState([]);
  const [files, setFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');   // what the vendor is waiting on
  const [result, setResult] = useState(null);
  // Hard guard against a double submit — more reliable than the disabled
  // attribute alone, which a fast second click can slip past.
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await kycAPI.getForm(token);
      const d = res.data.data;
      setUploadsEnabled(d.uploadsEnabled !== false);
      if (Array.isArray(d.documents) && d.documents.length) setDocFields(d.documents);
      // Which sections to show comes from the server, so the vendor can never
      // be shown a section their form does not collect.
      setFormCfg({
        ...formConfigFor(d.kycType),
        ...(d.kycTypeLabel ? { label: d.kycTypeLabel } : {}),
        ...(typeof d.collectsMaterials === 'boolean' ? { collectsMaterials: d.collectsMaterials } : {}),
        ...(typeof d.collectsServices === 'boolean' ? { collectsServices: d.collectsServices } : {}),
        ...(typeof d.collectsVehicles === 'boolean' ? { collectsVehicles: d.collectsVehicles } : {}),
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
        iecCode: d.iecCode || '',
        companySize: d.companySize || '',
        serviceLocation: d.serviceLocation || '',
        numberOfVehicles: d.numberOfVehicles === 0 || d.numberOfVehicles ? String(d.numberOfVehicles) : '',
      }));
      // Dropdown sources. Materials come from the Purchase Department's item
      // master via the form endpoint, so anything the Purchase Manager adds
      // shows up here without a code change.
      if (Array.isArray(d.materialOptions)) setMaterialOptions(d.materialOptions);
      if (Array.isArray(d.serviceOptions) && d.serviceOptions.length) setServiceOptions(d.serviceOptions);
      if (Array.isArray(d.stateOptions) && d.stateOptions.length) setStateOptions(d.stateOptions);
      if (Array.isArray(d.companySizeOptions) && d.companySizeOptions.length) {
        setCompanySizeOptions(d.companySizeOptions);
      }
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

  // --- Other-state GST rows ---
  const addStateGst = () =>
    setOtherStateGst((p) => (p.length >= MAX_OTHER_STATE_GST ? p : [...p, { state: '', gstNumber: '' }]));
  const removeStateGst = (i) => setOtherStateGst((p) => p.filter((_, x) => x !== i));
  const setStateGst = (i, key, value) =>
    setOtherStateGst((p) => p.map((row, x) => (x === i ? { ...row, [key]: value } : row)));

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

  // A vendor entering URP is not GST registered: the GST certificate slot is
  // hidden, and the company registration document stays on offer but stops
  // being mandatory. `required` comes back already resolved, so the asterisks
  // and the submit check below agree. Mirrored by the backend.
  const unregistered = isUrp(form.gstNumber);
  const shownDocs = useMemo(
    () => documentsFor(docFields, form.gstNumber),
    [docFields, form.gstNumber]
  );
  const fileCount = useMemo(() => Object.keys(files).length, [files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Never let a second request start while one is running
    if (inFlight.current) return;
    setErrors([]);

    // Mirror the backend's checks so the vendor gets immediate feedback
    const problems = [];
    if (!form.vendorName.trim()) problems.push('Legal Name (as per PAN) is required');
    if (!form.companyName.trim()) problems.push('Vendor Company Name is required');
    if (!form.address.trim()) problems.push('Company address is required');
    if (!form.email.trim()) problems.push('Email ID is required');
    if (!form.phone.trim()) problems.push('Phone number is required');
    if (!form.panNumber.trim()) problems.push('PAN card number is required');

    const gst = form.gstNumber.trim();
    if (!gst) problems.push(`GST Number / URP is required — enter your GST number, or ${URP_VALUE} if you are not GST registered`);
    else if (!isUrp(gst) && !isValidGst(gst)) {
      problems.push(`Enter a valid GST number, or ${URP_VALUE} if you are not GST registered`);
    }

    // Each form asks for only what it collects
    if (formCfg.collectsMaterials && !materials.length) {
      problems.push('Select at least one material you supply');
    }
    if (formCfg.collectsServices && !services.length) {
      problems.push('Select at least one service you provide');
    }

    if (hasOtherStateGst) {
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
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    // Multipart cannot carry a real array, so the lists travel as JSON.
    // Materials and services are kept separate all the way into MongoDB.
    fd.append('materials', JSON.stringify(formCfg.collectsMaterials ? materials.map((m) => ({ materialName: m })) : []));
    fd.append('services', JSON.stringify(formCfg.collectsServices ? services.map((sv) => ({ serviceName: sv })) : []));
    // Only the rows the vendor can actually see are sent
    fd.append('otherStateGst', JSON.stringify(
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
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
          <h1 className="text-lg font-semibold text-gray-800">Vendor KYC Form</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {formCfg.label} &middot; please complete all required fields and upload the listed documents.
          </p>
        </div>

        <div className="p-6 space-y-7">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-red-800">Please check the following:</p>
              <ul className="list-disc list-inside text-xs text-red-700 mt-1 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <Section title="Vendor Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field name="vendorName" title="Legal Name (as per PAN)" placeholder="Exactly as printed on your PAN" required hint="Must match your PAN document" {...f} />
              <Field name="companyName" title="Vendor Company Name" placeholder="Your trading / company name" required {...f} />
              <Field name="address" title="Company Address" placeholder="Full registered address" required className="sm:col-span-2" {...f} />
              <Field name="email" title="Email ID" type="email" placeholder="you@company.com" required {...f} />
              <Field name="phone" title="Phone Number" placeholder="10-digit mobile" required {...f} />
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
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Enter your 15-character GST number. Not GST registered? Type{' '}
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
              <Field name="panNumber" title="PAN Card Number" placeholder="ABCDE1234F" required hint="10 characters" {...f} />
              <Field name="contactPerson" title="Contact Person" placeholder="Primary contact" {...f} />
              <Field name="city" title="City" placeholder="City" {...f} />
              <Field name="state" title="State" placeholder="State" {...f} />
              <Field name="pincode" title="Pincode" placeholder="6-digit" {...f} />

              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOtherStateGst}
                    onChange={(e) => toggleOtherStateGst(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">
                    Do you have GST registration in other states?
                  </span>
                </label>

                {hasOtherStateGst && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-gray-500">
                      Add each additional state and the GST number registered there.
                    </p>
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
          </Section>

          <Section
            title="Company & Statutory Details"
            hint="All optional — fill in whatever applies to your business."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field name="esiNumber" title="ESI Number" placeholder="ESI registration number" {...f} />
              <Field name="pfNumber" title="PF Number" placeholder="Provident Fund number" {...f} />
              <Field name="shopEstablishmentNumber" title="Shop Establishment Number" placeholder="Shop & Establishment registration" {...f} />
              <Field name="iecCode" title="IEC Code" placeholder="Import Export Code" {...f} />

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

              <div>
                <label className={LABEL_CLS}>Service Location</label>
                <select
                  value={form.serviceLocation}
                  onChange={(e) => setField('serviceLocation', e.target.value)}
                  className={INPUT_CLS}
                  disabled={submitting}
                >
                  <option value="">Select state / UT</option>
                  {stateOptions.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Where you provide your services.
                </p>
              </div>

              {formCfg.collectsVehicles && (
                <Field
                  name="numberOfVehicles"
                  title="Number of Vehicles"
                  type="number"
                  placeholder="e.g. 12"
                  hint="Vehicles available for your operations services"
                  {...f}
                />
              )}
            </div>
          </Section>

          <Section
            title={formCfg.collectsMaterials ? 'Material Details' : 'Service Details'}
            hint={
              formCfg.collectsMaterials
                ? 'Choose every material you supply. Add as many as you need, and remove any before submitting.'
                : 'Choose every service you provide. Add as many as you need, and remove any before submitting.'
            }
          >
            <MaterialServiceSelector
              materials={materials}
              services={services}
              materialOptions={materialOptions}
              serviceOptions={serviceOptions}
              onChangeMaterials={setMaterials}
              onChangeServices={setServices}
              showMaterials={formCfg.collectsMaterials}
              showServices={formCfg.collectsServices}
              disabled={submitting}
            />
          </Section>

          <Section
            title="Required Documents"
            hint={`${ALLOWED_LABEL} only. Each file must be under ${MAX_FILE_MB} MB.`}
          >
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
              documents={shownDocs}
              files={files}
              errors={fileErrors}
              disabled={submitting || !uploadsEnabled}
              onChange={onFileChange}
            />
          </Section>

          <Section title="Bank Details" hint="Optional, but speeds up payment setup.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field name="bankName" title="Bank Name" placeholder="e.g. HDFC Bank" {...f} />
              <Field name="accountHolderName" title="Account Holder Name" placeholder="As per bank records" {...f} />
              <Field name="accountNumber" title="Account Number" placeholder="Bank account number" {...f} />
              <Field name="ifscCode" title="IFSC Code" placeholder="HDFC0001234" hint="11 characters" {...f} />
            </div>
          </Section>

          <Section title="Additional Information">
            <textarea
              value={form.kycAdditionalInfo}
              onChange={(e) => setField('kycAdditionalInfo', e.target.value)}
              rows={3}
              className={`${INPUT_CLS} resize-none`}
              placeholder="Anything else our Finance team should know (optional)"
            />
          </Section>

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
              ) : 'Submit KYC'}
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
