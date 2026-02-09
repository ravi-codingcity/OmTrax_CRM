import { createContext, useContext, useState, useCallback } from "react";
import { salesAPI, followUpAPI, dashboardAPI } from "../services/api";

const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
  const [salesEntries, setSalesEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    closed: 0,
    active: 0,
    // Follow-ups
    todayFollowUps: 0,
    overdueFollowUps: 0,
    // Performance
    conversionRate: 0,
    monthlyConversions: 0,
    // Breakdowns
    byBranch: {},
    byRequirement: {},
    bySalesPerson: {},
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch all sales entries with optional filters
  const fetchSalesEntries = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all entries (high limit) - frontend handles pagination
      const response = await salesAPI.getAll({ limit: 1000, ...params });
      const data = response.data.data || response.data;
      
      if (Array.isArray(data)) {
        setSalesEntries(data);
      } else if (data.entries) {
        setSalesEntries(data.entries);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setSalesEntries([]);
      }
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch sales entries");
      console.error("Error fetching sales entries:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get sales entries for a specific user
  const getSalesEntriesByUser = useCallback(async (userId, params = {}) => {
    setLoading(true);
    try {
      const response = await salesAPI.getAll({ ...params, salesPerson: userId });
      const data = response.data.data || response.data;
      const entries = Array.isArray(data) ? data : data.entries || [];
      setSalesEntries(entries);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      return entries;
    } catch (err) {
      console.error("Error fetching user sales entries:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single entry by ID
  const getEntryById = useCallback(async (id) => {
    try {
      const response = await salesAPI.getById(id);
      return response.data.data || response.data;
    } catch (err) {
      console.error("Error fetching entry:", err);
      return null;
    }
  }, []);

  // Add new sales entry
  const addSalesEntry = useCallback(async (entryData) => {
    setLoading(true);
    try {
      const response = await salesAPI.create(entryData);
      const newEntry = response.data.data || response.data;
      setSalesEntries((prev) => [newEntry, ...prev]);
      return { success: true, data: newEntry };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to add sales entry";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update sales entry
  const updateSalesEntry = useCallback(async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await salesAPI.update(id, updatedData);
      const updatedEntry = response.data.data || response.data;
      setSalesEntries((prev) =>
        prev.map((entry) => (entry._id === id || entry.id === id ? updatedEntry : entry))
      );
      return { success: true, data: updatedEntry };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update sales entry";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete sales entry (Admin only)
  const deleteSalesEntry = useCallback(async (id) => {
    try {
      await salesAPI.delete(id);
      setSalesEntries((prev) => prev.filter((entry) => entry._id !== id && entry.id !== id));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete sales entry";
      return { success: false, message };
    }
  }, []);

  // Add follow-up to a sales entry
  const addFollowUp = useCallback(async (salesEntryId, followUpData) => {
    try {
      const response = await followUpAPI.create({
        salesEntryId: salesEntryId,  // Changed from 'salesEntry' to 'salesEntryId'
        ...followUpData,
      });
      const newFollowUp = response.data.data || response.data;
      
      // Update the local entry with new follow-up
      setSalesEntries((prev) =>
        prev.map((entry) => {
          if (entry._id === salesEntryId || entry.id === salesEntryId) {
            return {
              ...entry,
              remark: followUpData.remark,
              nextFollowUpDate: followUpData.nextFollowUpDate,
              queryStatus: followUpData.status || entry.queryStatus,
              followUpHistory: [...(entry.followUpHistory || []), newFollowUp],
            };
          }
          return entry;
        })
      );
      
      return { success: true, data: newFollowUp };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to add follow-up";
      return { success: false, message };
    }
  }, []);

  // Get follow-ups for a sales entry
  const getFollowUps = useCallback(async (salesEntryId) => {
    try {
      const response = await followUpAPI.getBySalesEntry(salesEntryId);
      return response.data.data || response.data;
    } catch (err) {
      console.error("Error fetching follow-ups:", err);
      return [];
    }
  }, []);

  // Get today's follow-ups
  const getTodayFollowUps = useCallback(async () => {
    try {
      const response = await salesAPI.getTodayFollowUps();
      return response.data.data || response.data;
    } catch (err) {
      console.error("Error fetching today's follow-ups:", err);
      return [];
    }
  }, []);

  // Get overdue follow-ups
  const getOverdueFollowUps = useCallback(async () => {
    try {
      const response = await salesAPI.getOverdueFollowUps();
      return response.data.data || response.data;
    } catch (err) {
      console.error("Error fetching overdue follow-ups:", err);
      return [];
    }
  }, []);

  // Get dashboard stats
  const getStats = useCallback(async () => {
    try {
      const response = await dashboardAPI.getStats();
      console.log('Dashboard stats raw response:', response.data);
      const statsData = response.data?.data || response.data || {};
      console.log('Parsed stats data:', statsData);
      
      // Parse based on backend response structure
      const statusWise = statsData.statusWise || {};
      const followUps = statsData.followUps || {};
      const performance = statsData.performance || {};
      
      const parsedStats = {
        // Summary stats (top-level or from statusWise)
        total: statsData.total ?? 0,
        hot: statsData.hot ?? statusWise.hot ?? 0,
        warm: statsData.warm ?? statusWise.warm ?? 0,
        cold: statsData.cold ?? statusWise.cold ?? 0,
        closed: statsData.closed ?? statusWise.closed ?? 0,
        active: statsData.active ?? statusWise.active ?? 0,
        
        // Follow-ups
        todayFollowUps: followUps.today ?? 0,
        overdueFollowUps: followUps.overdue ?? 0,
        
        // Performance
        conversionRate: performance.conversionRate ?? 0,
        monthlyConversions: performance.monthlyConversions ?? 0,
        
        // Breakdowns
        byBranch: statsData.byBranch || {},
        byRequirement: statsData.byRequirement || {},
        bySalesPerson: statsData.bySalesPerson || {},
      };
      
      console.log('Final parsed stats:', parsedStats);
      setStats(parsedStats);
      return parsedStats;
    } catch (err) {
      console.error("Error fetching stats:", err);
      console.error("Error response:", err.response?.data);
      const defaultStats = {
        total: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        closed: 0,
        active: 0,
        todayFollowUps: 0,
        overdueFollowUps: 0,
        conversionRate: 0,
        monthlyConversions: 0,
        byBranch: {},
        byRequirement: {},
        bySalesPerson: {},
      };
      setStats(defaultStats);
      return defaultStats;
    }
  }, []);

  // Get analytics data
  const getAnalytics = useCallback(async (params = {}) => {
    try {
      const response = await dashboardAPI.getAnalytics(params);
      return response.data.data || response.data;
    } catch (err) {
      console.error("Error fetching analytics:", err);
      return null;
    }
  }, []);

  // Get all entries (returns current state)
  const getAllSalesEntries = useCallback(() => {
    return salesEntries;
  }, [salesEntries]);

  return (
    <SalesContext.Provider
      value={{
        salesEntries,
        stats,
        loading,
        error,
        pagination,
        fetchSalesEntries,
        getSalesEntriesByUser,
        getEntryById,
        addSalesEntry,
        updateSalesEntry,
        deleteSalesEntry,
        addFollowUp,
        getFollowUps,
        getTodayFollowUps,
        getOverdueFollowUps,
        getStats,
        getAnalytics,
        getAllSalesEntries,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
};
