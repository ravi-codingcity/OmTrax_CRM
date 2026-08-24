import { createContext, useContext, useState, useCallback } from 'react';
import { purchaseOrderAPI } from '../services/api';

const PurchaseOrderContext = createContext(null);

export const PurchaseOrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await purchaseOrderAPI.getAll({ limit: 1000, ...params });
      const data = res.data.data || res.data;
      const list = Array.isArray(data) ? data : data.entries || [];
      setOrders(list);
      return list;
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await purchaseOrderAPI.getStats();
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching PO stats:', err);
      return null;
    }
  }, []);

  const fetchTermsSuggestions = useCallback(async () => {
    try {
      const res = await purchaseOrderAPI.getTermsSuggestions();
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching terms suggestions:', err);
      return [];
    }
  }, []);

  const getOrder = useCallback(async (id) => {
    try {
      const res = await purchaseOrderAPI.getById(id);
      return res.data.data || null;
    } catch (err) {
      console.error('Error fetching purchase order:', err);
      return null;
    }
  }, []);

  const upsert = (po) =>
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o._id === po._id);
      if (idx === -1) return [po, ...prev];
      const next = [...prev];
      next[idx] = po;
      return next;
    });

  const addOrder = useCallback(async (payload) => {
    try {
      const res = await purchaseOrderAPI.create(payload);
      const po = res.data.data;
      setOrders((prev) => [po, ...prev]);
      return { success: true, data: po };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create purchase order',
      };
    }
  }, []);

  const updateOrder = useCallback(async (id, payload) => {
    try {
      const res = await purchaseOrderAPI.update(id, payload);
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update purchase order' };
    }
  }, []);

  // status: generated | sent | acknowledged | completed | cancelled
  const setStatus = useCallback(async (id, payload) => {
    try {
      const res = await purchaseOrderAPI.setStatus(id, payload);
      upsert(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update status' };
    }
  }, []);

  const deleteOrder = useCallback(async (id) => {
    try {
      await purchaseOrderAPI.delete(id);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to delete purchase order' };
    }
  }, []);

  return (
    <PurchaseOrderContext.Provider
      value={{ orders, loading, fetchOrders, fetchStats, fetchTermsSuggestions, getOrder, addOrder, updateOrder, setStatus, deleteOrder }}
    >
      {children}
    </PurchaseOrderContext.Provider>
  );
};

export const usePurchaseOrders = () => {
  const ctx = useContext(PurchaseOrderContext);
  if (!ctx) throw new Error('usePurchaseOrders must be used within a PurchaseOrderProvider');
  return ctx;
};
