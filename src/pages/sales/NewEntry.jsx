import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSales } from "../../context/SalesContext";
import MainLayout from "../../components/Layout/MainLayout";

const NewEntry = () => {
  const { user } = useAuth();
  const { addSalesEntry } = useSales();

  const initialFormState = {
    companyName: "",
    contactPerson: "",
    contactNumber: "",
    contactEmail: "",
    designation: "",
    requirement: "",
    location: "",
    remark: "",
    nextFollowUpDate: "",
    queryStatus: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!formData.contactPerson.trim())
      newErrors.contactPerson = "Contact person is required";
    if (!formData.contactNumber.trim())
      newErrors.contactNumber = "Contact number is required";
    else if (!/^\d{10}$/.test(formData.contactNumber))
      newErrors.contactNumber = "Enter valid 10-digit number";
    if (!formData.contactEmail.trim())
      newErrors.contactEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail))
      newErrors.contactEmail = "Enter valid email";
    if (!formData.designation.trim())
      newErrors.designation = "Designation is required";
    if (!formData.requirement) newErrors.requirement = "Select a requirement";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.nextFollowUpDate)
      newErrors.nextFollowUpDate = "Follow-up date is required";
    if (!formData.queryStatus) newErrors.queryStatus = "Select query status";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const entry = {
        ...formData,
        salesPerson: user._id || user.id,  // Required by backend
        branch: user.branch,
      };

      console.log('Submitting entry data:', entry); // Debug log
      const result = await addSalesEntry(entry);
      
      if (result.success) {
        setSuccessMessage("Sales entry added successfully!");
        setFormData(initialFormState);
      } else {
        setErrorMessage(result.message || "Failed to add entry. Please try again.");
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      console.error('Error response:', error.response?.data); // Debug log
      setErrorMessage(error.response?.data?.message || error.response?.data?.error || "Failed to add entry. Please try again.");
    }
    
    setIsSubmitting(false);
    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);
  };

  const inputClasses = (fieldName) =>
    `w-full px-3 py-2.5 sm:py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">New Sales Entry</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Add a new sales lead to the system
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-4 flex items-center text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 flex items-center text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
          <form onSubmit={handleSubmit}>
            {/* Auto-filled Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-3 py-2 mb-4 border border-blue-100">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="text-gray-500">Sales Person:</span>
                  <span className="ml-1.5 font-medium text-gray-800">
                    {user.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Branch:</span>
                  <span className="ml-1.5 font-medium text-gray-800">
                    {user.branch}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-1.5 font-medium text-gray-800">
                    {new Date().toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-3">
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
                  className={inputClasses("companyName")}
                  placeholder="Company name"
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.companyName}
                  </p>
                )}
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
                  className={inputClasses("contactPerson")}
                  placeholder="Contact name"
                />
                {errors.contactPerson && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.contactPerson}
                  </p>
                )}
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
                  className={inputClasses("contactNumber")}
                  placeholder="10-digit number"
                  maxLength={10}
                />
                {errors.contactNumber && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.contactNumber}
                  </p>
                )}
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
                  className={inputClasses("contactEmail")}
                  placeholder="Email address"
                />
                {errors.contactEmail && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.contactEmail}
                  </p>
                )}
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
                  className={inputClasses("designation")}
                  placeholder="Designation"
                />
                {errors.designation && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.designation}
                  </p>
                )}
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
                  className={inputClasses("requirement")}
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
                {errors.requirement && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.requirement}
                  </p>
                )}
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
                  className={inputClasses("location")}
                  placeholder="Location"
                />
                {errors.location && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.location}
                  </p>
                )}
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
                  className={inputClasses("nextFollowUpDate")}
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.nextFollowUpDate && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.nextFollowUpDate}
                  </p>
                )}
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
                  className={inputClasses("queryStatus")}
                >
                  <option value="">Select status</option>
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                  <option value="Closed">Closed</option>
                   <option value="Active">Active</option>
                </select>
                {errors.queryStatus && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.queryStatus}
                  </p>
                )}
              </div>

              {/* Remark - Full Width */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Remark
                </label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2.5 sm:py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  placeholder="Additional remarks or notes..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setFormData(initialFormState)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
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

export default NewEntry;
