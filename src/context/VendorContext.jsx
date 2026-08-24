import { createContext, useContext, useState, useCallback } from 'react';
import { vendorAPI } from '../services/api';

// Shared vendor + KYC state for both the Purchase and Finance departments.
// Follows the same conventions as the existing contexts: methods resolve to
// { success, data } or { success: false, message } and never throw into a page.

const VendorContext = createContext(null);

export const VendorProvider = ({ children }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVendors = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await vendorAPI.getAll({ limit: 1000, ...params });
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.entries || [];
      setVendors(list);
      return list;
    } catch (err) {
      console.error('Error fetching vendors:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await vendorAPI.getStats();
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching vendor stats:', err);
      return null;
    }
  }, []);

  const getVendor = useCallback(async (id) => {
    try {
      const res = await vendorAPI.getById(id);
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching vendor:', err);
      return null;
    }
  }, []);

  // Replace one vendor in the list, or prepend it if it is new
  const upsert = (vendor) =>
    setVendors((prev) => {
      const idx = prev.findIndex((v) => v._id === vendor._id);
      if (idx === -1) return [vendor, ...prev];
      const next = [...prev];
      next[idx] = vendor;
      return next;
    });

  const addVendor = useCallback(async (payload) => {
    try {
      const res = await vendorAPI.create(payload);
      const vendor = res.data.data;
      setVendors((prev) => [vendor, ...prev]);
      return { success: true, data: vendor };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to add vendor',
      };
    }
  }, []);

  // Generate a KYC link without going through the Add Vendor form.
  // Returns { success, data: { kycLink, vendor, ... } } or a duplicate hint.
  const createKycRequest = useCallback(async (payload) => {
    try {
      const res = await vendorAPI.createKycRequest(payload);
      if (res.data.data?.vendor) upsert(res.data.data.vendor);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Failed to generate the KYC link',
        requiresConfirmation: !!d?.requiresConfirmation,
        existingVendorId: d?.data?.vendorId || null,
      };
    }
  }, []);

  const updateVendor = useCallback(async (id, payload) => {
    try {
      const res = await vendorAPI.update(id, payload);
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update vendor' };
    }
  }, []);

  const deleteVendor = useCallback(async (id) => {
    try {
      await vendorAPI.delete(id);
      setVendors((prev) => prev.filter((v) => v._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to delete vendor' };
    }
  }, []);

  // Generate (or regenerate) the vendor's public KYC link.
  // Returns { success, data: { kycLink, ... }, requiresConfirmation }
  const generateKycLink = useCallback(async (id, opts = {}) => {
    try {
      const res = await vendorAPI.generateKycLink(id, opts);
      if (res.data.data?.vendor) upsert(res.data.data.vendor);
      return { success: true, data: res.data.data };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to generate KYC link',
        requiresConfirmation: !!err.response?.data?.requiresConfirmation,
      };
    }
  }, []);

  const markKycLinkSent = useCallback(async (id, method) => {
    try {
      const res = await vendorAPI.markKycLinkSent(id, { method });
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to record share' };
    }
  }, []);

  const startKycReview = useCallback(async (id) => {
    try {
      const res = await vendorAPI.startKycReview(id);
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to start review' };
    }
  }, []);

  // Finance-only. A non-Finance caller gets a 403 from the backend.
  const decideKyc = useCallback(async (id, decision, remarks) => {
    try {
      const res = await vendorAPI.decideKyc(id, { decision, remarks });
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to record decision' };
    }
  }, []);

  return (
    <VendorContext.Provider
      value={{
        vendors,
        loading,
        fetchVendors,
        fetchStats,
        getVendor,
        addVendor,
        createKycRequest,
        updateVendor,
        deleteVendor,
        generateKycLink,
        markKycLinkSent,
        startKycReview,
        decideKyc,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};

export const useVendors = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendors must be used within a VendorProvider');
  return ctx;
};
