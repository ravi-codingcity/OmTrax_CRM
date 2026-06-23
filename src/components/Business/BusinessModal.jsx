import { useState } from 'react';
import ClientCombobox from './ClientCombobox';

const BusinessModal = ({ mode = 'add', entry = null, clientSuggestions = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState({
    client: entry?.client || '',
    jobNumber: entry?.jobNumber || '',
    estimateAmount: entry?.estimateAmount ?? '',
    remarks: entry?.remarks || '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.client.trim()) newErrors.client = 'Client is required';
    if (!isEdit && !formData.jobNumber.trim()) newErrors.jobNumber = 'Job number is required';
    if (formData.estimateAmount === '' || formData.estimateAmount === null) {
      newErrors.estimateAmount = 'Estimate amount is required';
    } else if (isNaN(Number(formData.estimateAmount)) || Number(formData.estimateAmount) < 0) {
      newErrors.estimateAmount = 'Enter a valid amount';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      client: formData.client.trim(),
      estimateAmount: Number(formData.estimateAmount),
      remarks: formData.remarks.trim(),
    };
    // Job number only sent on create (immutable afterwards)
    if (!isEdit) payload.jobNumber = formData.jobNumber.trim();

    const result = await onSubmit(payload);

    setIsSubmitting(false);
    if (result?.success) {
      onClose();
    } else {
      setErrorMessage(result?.message || 'Something went wrong. Please try again.');
    }
  };

  const inputClasses = (field) =>
    `w-full px-3 py-2.5 sm:py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {isEdit ? 'Edit Business Entry' : 'Add Business Entry'}
            </h2>
            {isEdit && (
              <p className="text-xs text-gray-500">Job #{entry?.jobNumber} (cannot be changed)</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client with searchable suggestions */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <ClientCombobox
                value={formData.client}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, client: val }));
                  if (errors.client) setErrors((prev) => ({ ...prev, client: '' }));
                }}
                suggestions={clientSuggestions}
                placeholder="Search or type a client name"
                error={!!errors.client}
              />
              {errors.client && <p className="text-red-500 text-xs mt-0.5">{errors.client}</p>}
            </div>

            {/* Job Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Job Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={handleChange}
                className={`${inputClasses('jobNumber')} ${isEdit ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                placeholder="e.g. JOB-1024"
                disabled={isEdit}
                readOnly={isEdit}
                title={isEdit ? 'Job number is immutable and cannot be changed' : ''}
              />
              {errors.jobNumber && <p className="text-red-500 text-xs mt-0.5">{errors.jobNumber}</p>}
            </div>

            {/* Estimate Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Estimate Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="estimateAmount"
                value={formData.estimateAmount}
                onChange={handleChange}
                className={inputClasses('estimateAmount')}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {errors.estimateAmount && <p className="text-red-500 text-xs mt-0.5">{errors.estimateAmount}</p>}
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessModal;
