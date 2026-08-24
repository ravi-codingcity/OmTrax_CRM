import { createContext, useContext, useState, useCallback } from 'react';
import { rateComparisonAPI } from '../services/api';

// Rate Comparison state — the Director-approval step that precedes a PO.
// Follows the existing context conventions: methods resolve to
// { success, data } or { success: false, message } and never throw into a page.

const RateComparisonContext = createContext(null);

export const RateComparisonProvider = ({ children }) => {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComparisons = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await rateComparisonAPI.getAll({ limit: 1000, ...params });
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.entries || [];
      setComparisons(list);
      return list;
    } catch (err) {
      console.error('Error fetching rate comparisons:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await rateComparisonAPI.getStats();
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching rate comparison stats:', err);
      return null;
    }
  }, []);

  const getComparison = useCallback(async (id) => {
    try {
      const res = await rateComparisonAPI.getById(id);
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching rate comparison:', err);
      return null;
    }
  }, []);

  const upsert = (rc) =>
    setComparisons((prev) => {
      const idx = prev.findIndex((c) => c._id === rc._id);
      if (idx === -1) return [rc, ...prev];
      const next = [...prev];
      next[idx] = rc;
      return next;
    });

  // The API returns `errors` as an array for multi-field problems; flatten it
  // into one readable message so pages can render it directly.
  const errorFrom = (err, fallback) => {
    const data = err.response?.data;
    if (data?.errors?.length) return data.errors.join(' · ');
    return data?.message || fallback;
  };

  const addComparison = useCallback(async (payload) => {
    try {
      const res = await rateComparisonAPI.create(payload);
      const rc = res.data.data;
      setComparisons((prev) => [rc, ...prev]);
      return { success: true, data: rc };
    } catch (err) {
      return { success: false, message: errorFrom(err, 'Failed to create rate comparison') };
    }
  }, []);

  const updateComparison = useCallback(async (id, payload) => {
    try {
      const res = await rateComparisonAPI.update(id, payload);
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: errorFrom(err, 'Failed to update rate comparison') };
    }
  }, []);

  const submitForApproval = useCallback(async (id) => {
    try {
      const res = await rateComparisonAPI.submit(id);
      upsert(res.data.data);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: errorFrom(err, 'Failed to submit for approval') };
    }
  }, []);

  // Director / Admin only. Anyone else gets a 403 from the backend.
  const decide = useCallback(async (id, decision, remarks) => {
    try {
      const res = await rateComparisonAPI.decide(id, { decision, remarks });
      upsert(res.data.data);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: errorFrom(err, 'Failed to record the decision') };
    }
  }, []);

  const deleteComparison = useCallback(async (id) => {
    try {
      await rateComparisonAPI.delete(id);
      setComparisons((prev) => prev.filter((c) => c._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: errorFrom(err, 'Failed to delete rate comparison') };
    }
  }, []);

  return (
    <RateComparisonContext.Provider
      value={{
        comparisons,
        loading,
        fetchComparisons,
        fetchStats,
        getComparison,
        addComparison,
        updateComparison,
        submitForApproval,
        decide,
        deleteComparison,
      }}
    >
      {children}
    </RateComparisonContext.Provider>
  );
};

export const useRateComparisons = () => {
  const ctx = useContext(RateComparisonContext);
  if (!ctx) throw new Error('useRateComparisons must be used within a RateComparisonProvider');
  return ctx;
};
