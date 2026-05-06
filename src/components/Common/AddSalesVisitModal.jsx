import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { isNative, hapticLight, hapticSuccess, hapticError } from '../../utils/capacitor';

const AddSalesVisitModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [companyName, setCompanyName] = useState('');
  const [companyNameError, setCompanyNameError] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imageFormat, setImageFormat] = useState('jpeg');  // Store image format
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Auto-fetch location when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocation();
      // Reset form
      setCompanyName('');
      setCompanyNameError('');
      setImageBase64(null);
      setImageFormat('jpeg');
      setImagePreview(null);
      setLocationError('');
      setImageError('');
      setGeneralError('');
    }
  }, [isOpen]);

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    try {
      // Request permission first (required for Android)
      const permissionStatus = await Geolocation.checkPermissions();
      
      if (permissionStatus.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          setLocationError('Location permission denied. Please enable location access in Settings.');
          setLocationLoading(false);
          if (isNative()) hapticError();
          return;
        }
      }

      // Get current position using Capacitor Geolocation
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // Try to get address from coordinates
      let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'OmTrax CRM App' } }
        );
        const data = await response.json();
        if (data.display_name) {
          address = data.display_name;
        }
      } catch (e) {
        // Fallback to coordinates if reverse geocoding fails
        console.log('Reverse geocoding failed, using coordinates');
      }

      setLocation({
        latitude,
        longitude,
        accuracy,
        address
      });
      
      if (isNative()) {
        hapticLight();
      }
    } catch (error) {
      console.error('Location error:', error);
      let errorMessage = 'Unable to get location';
      if (error.message?.includes('denied') || error.message?.includes('permission')) {
        errorMessage = 'Location permission denied. Please enable location access in Settings.';
      } else if (error.message?.includes('unavailable')) {
        errorMessage = 'Location unavailable. Please check GPS settings.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      setLocationError(errorMessage);
      if (isNative()) {
        hapticError();
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const openCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 50,  // Reduced quality for faster uploads
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 800,  // Limit width to reduce file size
      });
      
      if (photo.base64String) {
        // Capacitor returns format as 'jpeg', 'png', etc.
        const format = photo.format || 'jpeg';
        console.log('Photo captured, format:', format, 'length:', photo.base64String.length);
        setImageBase64(photo.base64String);
        setImageFormat(format);
        setImagePreview(`data:image/${format};base64,${photo.base64String}`);
        setImageError('');
        if (isNative()) {
          hapticLight();
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      // User cancelled or error occurred
      if (error.message !== 'User cancelled photos app') {
        setImageError('Failed to capture photo. Please try again.');
        if (isNative()) {
          hapticError();
        }
      }
    }
  };

  const removeImage = () => {
    setImageBase64(null);
    setImageFormat('jpeg');
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    console.log('handleSubmit called');
    e.preventDefault();
    
    console.log('Form state:', {
      companyName: companyName?.trim() || '[empty]',
      hasLocation: !!location,
      hasImageBase64: !!imageBase64,
      imageBase64Length: imageBase64?.length || 0
    });
    
    // Clear previous errors
    setCompanyNameError('');
    setLocationError('');
    setImageError('');
    setGeneralError('');
    
    // Validate all fields
    let hasError = false;
    
    if (!companyName.trim()) {
      console.log('Validation failed: companyName empty');
      setCompanyNameError('Company name is required.');
      if (isNative()) hapticError();
      hasError = true;
    }

    if (!location) {
      console.log('Validation failed: location missing');
      setLocationError('Location is required. Please enable GPS and try again.');
      if (isNative()) hapticError();
      hasError = true;
    }

    if (!imageBase64) {
      console.log('Validation failed: image missing');
      setImageError('Photo is required. Please capture an image.');
      if (isNative()) hapticError();
      hasError = true;
    }
    
    if (hasError) {
      console.log('Validation failed, returning early');
      return;
    }

    console.log('Validation passed, setting submitting to true');
    setSubmitting(true);
    setGeneralError('');
    
    const now = new Date();
    
    // Clean base64 string - remove any line breaks or spaces that Android might add
    const cleanBase64 = imageBase64.replace(/[\r\n\s]/g, '');
    
    const visitData = {
      companyName: companyName.trim(),
      location: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      date: now.toISOString().split('T')[0],  // YYYY-MM-DD
      time: now.toTimeString().split(' ')[0].substring(0, 5),  // HH:mm
      imageBase64: `data:image/${imageFormat};base64,${cleanBase64}`,  // Send full data URI for Cloudinary
    };
    
    console.log('Sending imageBase64 length:', visitData.imageBase64.length);

    try {
      console.log('Submitting sales visit...');
      const result = await onSubmit(visitData);
      console.log('Submit result:', result);
      if (result?.success) {
        if (isNative()) hapticSuccess();
        onClose();
      } else {
        console.error('Submit failed:', result?.error);
        setGeneralError(result?.error || 'Failed to save. Please try again.');
        if (isNative()) hapticError();
      }
    } catch (error) {
      console.error('Submit error:', error);
      setGeneralError(error.message || 'Network error. Please check your connection.');
      if (isNative()) hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Add Sales Visit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* General Error */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-red-600">{generalError}</span>
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyNameError('');
              }}
              placeholder="Enter company name"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${companyNameError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            />
            {companyNameError && (
              <p className="text-red-500 text-sm mt-1">{companyNameError}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              {locationLoading ? (
                <div className="flex items-center text-gray-500">
                  <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching location...
                </div>
              ) : location ? (
                <div className="space-y-1">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-snug">{location.address}</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-7">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </div>
                </div>
              ) : locationError ? (
                <div className="text-red-500 text-sm flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {locationError}
                </div>
              ) : null}
              
              <button
                type="button"
                onClick={fetchLocation}
                disabled={locationLoading}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Location
              </button>
            </div>
          </div>

          {/* Date & Time (Auto) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 text-gray-700">
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 text-gray-700">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Image Capture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo <span className="text-red-500">*</span>
            </label>

            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={openCamera}
                  className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${imageError ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${imageError ? 'text-red-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={`text-sm mt-2 font-medium ${imageError ? 'text-red-500' : 'text-gray-500'}`}>Tap to Capture Photo</span>
                </button>
                {imageError && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {imageError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !companyName.trim() || !location || !imageBase64}
            onClick={(e) => {
              // Fallback for Android WebView if form submit doesn't work
              if (!submitting && companyName.trim() && location && imageBase64) {
                console.log('Button clicked, calling handleSubmit');
              }
            }}
            className="w-full py-3.5 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center active:scale-95"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Visit
              </>
            )}
          </button>
          
          {/* Extra padding for mobile devices to avoid overlap with Android navigation buttons */}
          <div className="h-8 sm:h-4 pb-[env(safe-area-inset-bottom)]"></div>
        </form>
      </div>
    </div>
  );
};

export default AddSalesVisitModal;
