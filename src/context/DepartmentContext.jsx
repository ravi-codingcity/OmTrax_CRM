import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DEFAULT_DEPARTMENT } from '../config/departments';

const DepartmentContext = createContext(null);

const STORAGE_KEY = 'omtrax_department';

export const DepartmentProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [activeDepartment, setActiveDepartmentState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ''
  );

  // Persist the active department and mirror it to localStorage so the API
  // interceptor can attach it to every request.
  const setActiveDepartment = useCallback((dept) => {
    setActiveDepartmentState(dept);
    if (dept) localStorage.setItem(STORAGE_KEY, dept);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Non-admin users are locked to their own department — keep it in sync.
  useEffect(() => {
    if (user && !isAdmin() && user.department) {
      setActiveDepartment(user.department);
    }
  }, [user, isAdmin, setActiveDepartment]);

  // Admins must explicitly choose a department before entering a CRM.
  const hasSelectedDepartment = isAdmin() ? !!activeDepartment : !!(user?.department);

  const clearDepartment = useCallback(() => {
    setActiveDepartmentState('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const effectiveDepartment =
    (isAdmin() ? activeDepartment : user?.department) || DEFAULT_DEPARTMENT;

  return (
    <DepartmentContext.Provider
      value={{
        activeDepartment: effectiveDepartment,
        rawSelection: activeDepartment,
        setActiveDepartment,
        clearDepartment,
        hasSelectedDepartment,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};
