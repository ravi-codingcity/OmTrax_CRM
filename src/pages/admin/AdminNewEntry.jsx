import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/Layout/MainLayout';

const AdminNewEntry = () => {
  const { addSalesEntry } = useSales();
  const { user } = useAuth();
  const navigate = useNavigate();

  const initialFormState = {
    companyName: '',
    contactPerson: '',
    contactNumber: '',
    contactEmail: '',
    designation: '',
    requirement: '',
    location: '',
    remark: '',
    nextFollowUpDate: '',
    queryStatus: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    else if (!/^\d{10}$/.test(formData.contactNumber)) newErrors.contactNumber = 'Enter valid 10-digit number';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Enter valid email';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.requirement) newErrors.requirement = 'Requirement is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.nextFollowUpDate) newErrors.nextFollowUpDate = 'Follow-up date is required';
    if (!formData.queryStatus) newErrors.queryStatus = 'Status is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const entry = {
      ...formData,
      salesPersonName: user.name,
      salesPersonId: user.id,
      branch: user.branch,
    };

    addSalesEntry(entry);
    setSuccessMessage('Sales entry added successfully!');
    setFormData(initialFormState);
    setIsSubmitting(false);

    setTimeout(() => {
      setSuccessMessage('');
      navigate('/admin/sales');
    }, 1500);
  };

  const inputClasses = (fieldName) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
      errors[fieldName] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Add New Sales Entry</h1>
            <p className="text-gray-500 text-xs mt-0.5">Admin - Add a new sales lead to the system</p>
          </div>
          <button
            onClick={() => navigate('/admin/sales')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Sales
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-4 flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <form onSubmit={handleSubmit}>
            {/* User Info Display */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Sales Person:</span>
                <span className="text-sm font-semibold text-gray-800">{user?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Branch:</span>
                <span className="text-sm font-semibold text-gray-800">{user?.branch}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={inputClasses('companyName')}
                  placeholder="Company name"
                />
                {errors.companyName && <p className="text-red-500 text-xs mt-0.5">{errors.companyName}</p>}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className={inputClasses('contactPerson')}
                  placeholder="Contact name"
                />
                {errors.contactPerson && <p className="text-red-500 text-xs mt-0.5">{errors.contactPerson}</p>}
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className={inputClasses('contactNumber')}
                  placeholder="10-digit number"
                  maxLength={10}
                />
                {errors.contactNumber && <p className="text-red-500 text-xs mt-0.5">{errors.contactNumber}</p>}
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className={inputClasses('contactEmail')}
                  placeholder="Email address"
                />
                {errors.contactEmail && <p className="text-red-500 text-xs mt-0.5">{errors.contactEmail}</p>}
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className={inputClasses('designation')}
                  placeholder="Designation"
                />
                {errors.designation && <p className="text-red-500 text-xs mt-0.5">{errors.designation}</p>}
              </div>

              {/* Requirement */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Requirement <span className="text-red-500">*</span>
                </label>
                <select
                  name="requirement"
                  value={formData.requirement}
                  onChange={handleChange}
                  className={inputClasses('requirement')}
                >
                  <option value="">Select</option>
                <option value="HHG Relocation">HHG Relocation</option>
                  <option value="Office Relocation">Office Relocation</option>
                  <option value="Demo Relocation">Demo Relocation</option>
                  <option value="Lab Movements">Lab Movements</option>
                  <option value="Furniture Movements">Furniture Movements</option>
                  <option value="Car Movements">Car Movements</option>
                  <option value="Data Center Movements">Data Center Movements</option>
                  <option value="IT Assets Movements">IT Assets Movements</option>
                  <option value="HR & Recruitment">HR & Recruitment</option>
                  <option value="Real Estate">Real Estate</option>
                </select>
                {errors.requirement && <p className="text-red-500 text-xs mt-0.5">{errors.requirement}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={inputClasses('location')}
                  placeholder="Location"
                />
                {errors.location && <p className="text-red-500 text-xs mt-0.5">{errors.location}</p>}
              </div>

              {/* Next Follow-Up Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Follow-Up Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="nextFollowUpDate"
                  value={formData.nextFollowUpDate}
                  onChange={handleChange}
                  className={inputClasses('nextFollowUpDate')}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.nextFollowUpDate && <p className="text-red-500 text-xs mt-0.5">{errors.nextFollowUpDate}</p>}
              </div>

              {/* Query Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Query Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="queryStatus"
                  value={formData.queryStatus}
                  onChange={handleChange}
                  className={inputClasses('queryStatus')}
                >
                  <option value="">Select status</option>
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                  <option value="Closed">Closed</option>
                  <option value="Active">Active</option>
                </select>
                {errors.queryStatus && <p className="text-red-500 text-xs mt-0.5">{errors.queryStatus}</p>}
              </div>

              {/* Remark - Full Width */}
              <div className="col-span-2 md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  placeholder="Additional remarks or notes..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => navigate('/admin/sales')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Entry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminNewEntry;
