import { createContext, useContext, useState, useCallback } from 'react';
import { businessAPI } from '../services/api';

const BusinessContext = createContext(null);

export const BusinessProvider = ({ children }) => {
  const [businessEntries, setBusinessEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch business entries (backend applies role-based filtering)
  const fetchBusinessEntries = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessAPI.getAll({ limit: 1000, ...params });
      const data = response.data.data || response.data;
      const entries = Array.isArray(data) ? data : data.entries || [];
      setBusinessEntries(entries);
      return entries;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch business entries');
      console.error('Error fetching business entries:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new business entry
  const addBusinessEntry = useCallback(async (entryData) => {
    try {
      const response = await businessAPI.create(entryData);
      const newEntry = response.data.data || response.data;
      setBusinessEntries((prev) => [newEntry, ...prev]);
      return { success: true, data: newEntry };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to add business entry';
      return { success: false, message };
    }
  }, []);

  // Update a business entry (job number cannot be changed)
  const updateBusinessEntry = useCallback(async (id, updatedData) => {
    try {
      const response = await businessAPI.update(id, updatedData);
      const updatedEntry = response.data.data || response.data;
      setBusinessEntries((prev) =>
        prev.map((entry) => (entry._id === id ? updatedEntry : entry))
      );
      return { success: true, data: updatedEntry };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update business entry';
      return { success: false, message };
    }
  }, []);

  // Delete a business entry (Admin only)
  const deleteBusinessEntry = useCallback(async (id) => {
    try {
      await businessAPI.delete(id);
      setBusinessEntries((prev) => prev.filter((entry) => entry._id !== id));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete business entry';
      return { success: false, message };
    }
  }, []);

  return (
    <BusinessContext.Provider
      value={{
        businessEntries,
        loading,
        error,
        fetchBusinessEntries,
        addBusinessEntry,
        updateBusinessEntry,
        deleteBusinessEntry,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
