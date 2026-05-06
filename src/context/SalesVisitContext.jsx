import { createContext, useContext, useState, useCallback } from "react";
import { salesVisitAPI } from "../services/api";

const SalesVisitContext = createContext(null);

export const SalesVisitProvider = ({ children }) => {
  const [salesVisits, setSalesVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all sales visits
  const fetchSalesVisits = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await salesVisitAPI.getAll({ limit: 1000, ...params });
      const data = response.data.data || response.data;
      
      if (Array.isArray(data)) {
        setSalesVisits(data);
      } else if (data.visits) {
        setSalesVisits(data.visits);
      } else {
        setSalesVisits([]);
      }
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch sales visits");
      console.error("Error fetching sales visits:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new sales visit
  const createSalesVisit = useCallback(async (visitData) => {
    setLoading(true);
    setError(null);
    console.log('createSalesVisit called with:', { ...visitData, imageBase64: visitData.imageBase64 ? '[BASE64_DATA]' : null });
    try {
      console.log('Making API call...');
      const response = await salesVisitAPI.create(visitData);
      console.log('API response:', response);
      const newVisit = response.data.data || response.data;
      setSalesVisits(prev => [newVisit, ...prev]);
      return { success: true, data: newVisit };
    } catch (err) {
      console.error("Full error:", err);
      console.error("Error response:", err.response);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create sales visit";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a sales visit
  const deleteSalesVisit = useCallback(async (id) => {
    setLoading(true);
    try {
      await salesVisitAPI.delete(id);
      setSalesVisits(prev => prev.filter(visit => visit._id !== id && visit.id !== id));
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to delete sales visit";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    salesVisits,
    loading,
    error,
    fetchSalesVisits,
    createSalesVisit,
    deleteSalesVisit,
  };

  return (
    <SalesVisitContext.Provider value={value}>
      {children}
    </SalesVisitContext.Provider>
  );
};

export const useSalesVisit = () => {
  const context = useContext(SalesVisitContext);
  if (!context) {
    throw new Error("useSalesVisit must be used within a SalesVisitProvider");
  }
  return context;
};
