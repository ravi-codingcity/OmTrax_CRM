import { createContext, useContext, useState, useCallback } from 'react';
import { purchaseAPI } from '../services/api';

const PurchaseContext = createContext(null);

export const PurchaseProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await purchaseAPI.getEntries({ limit: 1000, ...params });
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.entries || [];
      setEntries(list);
      return list;
    } catch (err) {
      console.error('Error fetching purchase entries:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await purchaseAPI.getItems();
      const list = res.data.data || [];
      setItems(list);
      return { items: list, units: res.data.units, categories: res.data.categories };
    } catch (err) {
      console.error('Error fetching items:', err);
      return { items: [] };
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await purchaseAPI.getSuppliers();
      const list = res.data.data || [];
      setSuppliers(list);
      return list;
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      return [];
    }
  }, []);

  const createSupplier = useCallback(async (payload) => {
    try {
      const res = await purchaseAPI.createSupplier(payload);
      const supplier = res.data.data;
      setSuppliers((prev) => (prev.some((s) => s.name.toLowerCase() === supplier.name.toLowerCase()) ? prev : [...prev, supplier]));
      return { success: true, data: supplier };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to add supplier' };
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await purchaseAPI.getLocations();
      const list = res.data.data || [];
      setLocations(list);
      return list;
    } catch (err) {
      console.error('Error fetching storage locations:', err);
      return [];
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await purchaseAPI.getStats();
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching purchase stats:', err);
      return null;
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await purchaseAPI.getInventory();
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching inventory:', err);
      return [];
    }
  }, []);

  const createItem = useCallback(async (payload) => {
    try {
      const res = await purchaseAPI.createItem(payload);
      const item = res.data.data;
      setItems((prev) => (prev.some((i) => i.name.toLowerCase() === item.name.toLowerCase()) ? prev : [...prev, item]));
      return { success: true, data: item };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to add item' };
    }
  }, []);

  const upsertEntry = (entry) =>
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e._id === entry._id);
      if (idx === -1) return [entry, ...prev];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });

  const addEntry = useCallback(async (payload) => {
    try {
      const res = await purchaseAPI.create(payload);
      const entry = res.data.data;
      setEntries((prev) => [entry, ...prev]);
      return { success: true, data: entry };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to add entry' };
    }
  }, []);

  const updateEntry = useCallback(async (id, payload) => {
    try {
      const res = await purchaseAPI.update(id, payload);
      upsertEntry(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update entry' };
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    try {
      await purchaseAPI.delete(id);
      setEntries((prev) => prev.filter((e) => e._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to delete entry' };
    }
  }, []);

  const receiveEntry = useCallback(async (id, payload) => {
    try {
      const res = await purchaseAPI.receive(id, payload);
      upsertEntry(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update receipt status' };
    }
  }, []);

  const dispatchItem = useCallback(async (id, payload) => {
    try {
      const res = await purchaseAPI.dispatch(id, payload);
      upsertEntry(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to record dispatch' };
    }
  }, []);

  const returnItem = useCallback(async (id, payload) => {
    try {
      const res = await purchaseAPI.return(id, payload);
      upsertEntry(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to record return' };
    }
  }, []);

  return (
    <PurchaseContext.Provider
      value={{
        entries,
        items,
        suppliers,
        locations,
        loading,
        fetchEntries,
        fetchItems,
        fetchSuppliers,
        fetchLocations,
        createSupplier,
        fetchStats,
        fetchInventory,
        createItem,
        addEntry,
        updateEntry,
        deleteEntry,
        receiveEntry,
        dispatchItem,
        returnItem,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchase must be used within a PurchaseProvider');
  return ctx;
};
