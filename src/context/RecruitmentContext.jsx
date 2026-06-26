import { createContext, useContext, useState, useCallback } from 'react';
import { recruitmentAPI } from '../services/api';

const RecruitmentContext = createContext(null);

export const RecruitmentProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await recruitmentAPI.getAll({ limit: 1000, ...params });
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.entries || [];
      setEntries(list);
      return list;
    } catch (err) {
      console.error('Error fetching recruitment entries:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecruiters = useCallback(async () => {
    try {
      const res = await recruitmentAPI.getRecruiters();
      const list = res.data.data || [];
      setRecruiters(list);
      return list;
    } catch (err) {
      console.error('Error fetching recruiters:', err);
      return [];
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await recruitmentAPI.getStats();
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching recruitment stats:', err);
      return null;
    }
  }, []);

  const addEntry = useCallback(async (payload) => {
    try {
      const res = await recruitmentAPI.create(payload);
      const entry = res.data.data || res.data;
      setEntries((prev) => [entry, ...prev]);
      return { success: true, data: entry };
    } catch (err) {
      const message =
        err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to add requirement';
      return { success: false, message };
    }
  }, []);

  const updateEntry = useCallback(async (id, payload) => {
    try {
      const res = await recruitmentAPI.update(id, payload);
      const entry = res.data.data || res.data;
      setEntries((prev) => prev.map((e) => (e._id === id ? entry : e)));
      return { success: true, data: entry };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update requirement';
      return { success: false, message };
    }
  }, []);

  const reassignEntry = useCallback(async (id, recruiterName) => {
    try {
      const res = await recruitmentAPI.reassign(id, { recruiterName });
      const entry = res.data.data || res.data;
      setEntries((prev) => prev.map((e) => (e._id === id ? entry : e)));
      return { success: true, data: entry };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reassign requirement';
      return { success: false, message };
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    try {
      await recruitmentAPI.delete(id);
      setEntries((prev) => prev.filter((e) => e._id !== id));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete requirement';
      return { success: false, message };
    }
  }, []);

  return (
    <RecruitmentContext.Provider
      value={{
        entries,
        recruiters,
        loading,
        fetchEntries,
        fetchRecruiters,
        fetchStats,
        addEntry,
        updateEntry,
        reassignEntry,
        deleteEntry,
      }}
    >
      {children}
    </RecruitmentContext.Provider>
  );
};

export const useRecruitment = () => {
  const context = useContext(RecruitmentContext);
  if (!context) {
    throw new Error('useRecruitment must be used within a RecruitmentProvider');
  }
  return context;
};
