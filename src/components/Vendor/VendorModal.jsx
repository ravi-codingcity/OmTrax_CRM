import { useState } from 'react';

const LABEL_CLS = 'block text-[11px] font-medium text-gray-600 mb-1';

// Defined at module scope on purpose. A component created inside the render body
// gets a new identity every render, so React unmounts and remounts the input —
// which drops focus after every keystroke.
const Field = ({ name, title, placeholder, required, type = 'text', className = '', hint, form, errors, setField }) => (
  <div className={className}>
    <label className={LABEL_CLS}>
      {title} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setField(name, e.target.value)}
      className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all ${
        errors[name] ? 'border-red-300 bg-red-50' : 'border-gray-300'
      }`}
      placeholder={placeholder}
    />
    {errors[name]
      ? <p className="text-red-500 text-[10px] mt-0.5">{errors[name]}</p>
      : hint ? <p className="text-gray-400 text-[10px] mt-0.5">{hint}</p> : null}
  </div>
);

/**
 * Create / edit a vendor.
 *
 * Deliberately compact: only what someone actually types when recording a
 * vendor. Statutory and banking details are collected through the KYC form, so
 * they sit in a section the Purchase Manager can use to fill gaps after a
 * vendor submits an incomplete KYC.
 *
 * `onSubmit(payload)` returns { success, message }, matching BusinessModal
 * and PurchaseModal.
 */
const VendorModal = ({ mode = 'add', vendor = null, onClose, onSubmit }) => {
  const isEdit = mode === 'edit';
  // After a KYC submission the Purchase Manager often needs to complete blanks
  const hasSubmittedKyc = ['submitted', 'under_review', 'approved', 'rejected'].includes(vendor?.kycStatus);

  const [form, setForm] = useState({
    vendorName: vendor?.vendorName || '',
    companyName: vendor?.companyName || '',
    contactPerson: vendor?.contactPerson || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    city: vendor?.city || '',
    state: vendor?.state || '',
    pincode: vendor?.pincode || '',
    gstNumber: vendor?.gstNumber || '',
    panNumber: vendor?.panNumber || '',
    bankName: vendor?.bankName || '',
    accountHolderName: vendor?.accountHolderName || '',
    accountNumber: vendor?.accountNumber || '',
    ifscCode: vendor?.ifscCode || '',
  });
  // Bank/tax details are hidden on a fresh Add, shown when completing a record
  const [showDetails, setShowDetails] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.vendorName.trim()) e.vendorName = 'Vendor name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) {
      e.panNumber = 'Format: ABCDE1234F';
    }
    if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase())) {
      e.ifscCode = 'Format: HDFC0001234';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    payload.gstNumber = payload.gstNumber.toUpperCase();
    payload.panNumber = payload.panNumber.toUpperCase();
    payload.ifscCode = payload.ifscCode.toUpperCase();

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setApiError(res?.message || 'Something went wrong.');
  };

  const f = { form, errors, setField };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isEdit
                ? hasSubmittedKyc
                  ? 'Complete or correct anything the vendor left blank in their KYC.'
                  : 'Update this vendor’s details.'
                : 'Only the vendor name is required — the rest can follow.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{apiError}</div>
          )}

          {isEdit && hasSubmittedKyc && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-[11px]">
              This vendor has submitted their KYC. Edits here update the record without
              changing its approval status.
            </div>
          )}

          {/* Core identity — the whole Add form for most cases */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field name="vendorName" title="Vendor Name" placeholder="Trading name" required className="sm:col-span-2" {...f} />
            <Field name="companyName" title="Company / Legal Name" placeholder="Registered entity" {...f} />
            <Field name="contactPerson" title="Contact Person" placeholder="Primary contact" {...f} />
            <Field name="email" title="Email" placeholder="vendor@example.com" type="email" {...f} />
            <Field name="phone" title="Phone" placeholder="10-digit number" {...f} />
            <Field name="address" title="Address" placeholder="Street address" className="sm:col-span-2" {...f} />
            <Field name="city" title="City" placeholder="City" {...f} />
            <Field name="state" title="State" placeholder="State" {...f} />
          </div>

          {/* Everything the KYC form normally supplies */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Tax &amp; bank details
              <span className="text-gray-400 font-normal">(usually collected via the KYC form)</span>
            </button>

            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                <Field name="pincode" title="Pincode" placeholder="6-digit" {...f} />
                <Field name="gstNumber" title="GST Number" placeholder="07AABCU9603R1ZM" {...f} />
                <Field name="panNumber" title="PAN" placeholder="ABCDE1234F" {...f} />
                <Field name="bankName" title="Bank Name" placeholder="e.g. HDFC Bank" {...f} />
                <Field name="accountHolderName" title="Account Holder" placeholder="As per bank records" {...f} />
                <Field name="accountNumber" title="Account Number" placeholder="Bank account number" {...f} />
                <Field name="ifscCode" title="IFSC Code" placeholder="HDFC0001234" {...f} />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorModal;
