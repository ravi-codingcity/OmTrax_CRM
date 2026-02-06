import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('omtrax_token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          const userData = response.data.data || response.data.user || response.data;
          setUser(userData);
          localStorage.setItem('omtrax_user', JSON.stringify(userData));
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('omtrax_token');
          localStorage.removeItem('omtrax_user');
          setUser(null);
        }
      } else {
        // No token - check if we have cached user data (shouldn't happen but be safe)
        localStorage.removeItem('omtrax_user');
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const responseData = response.data.data || response.data;
      const token = responseData.token;
      const userData = responseData.user || responseData;
      
      if (!token) {
        return { success: false, message: 'No token received from server' };
      }
      
      localStorage.setItem('omtrax_token', token);
      localStorage.setItem('omtrax_user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Invalid credentials';
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omtrax_token');
    localStorage.removeItem('omtrax_user');
  };

  const isAdmin = () => user?.role === 'admin';

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.updatePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update password';
      return { success: false, message };
    }
  };

  const getUsers = async () => {
    try {
      const response = await authAPI.getUsers();
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  };

  const updateUser = async (id, data) => {
    try {
      const response = await authAPI.updateUser(id, data);
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update user';
      return { success: false, message };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin, 
      updatePassword, 
      getUsers, 
      updateUser,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
