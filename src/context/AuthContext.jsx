import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Dummy users data
const users = [
  { id: 1, username: 'nimit', password: 'admin123', role: 'admin', name: 'Nimit Gupta' },
  { id: 2, username: 'anchal', password: 'sales123', role: 'salesperson', name: 'Anchal Kumar', branch: 'Delhi' },
  { id: 3, username: 'sushil', password: 'sales123', role: 'salesperson', name: 'Sushil Kumar', branch: 'Mumbai' },
  { id: 4, username: 'varun', password: 'sales123', role: 'salesperson', name: 'Varun Arora', branch: 'Delhi' },
  { id: 5, username: 'manoj', password: 'sales123', role: 'salesperson', name: 'Manoj Gupta', branch: 'Bangalore' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('omtrax_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (username, password) => {
    const foundUser = users.find(
      (u) => u.username === username && u.password === password
    );
    if (foundUser) {
      const userData = { ...foundUser };
      delete userData.password;
      setUser(userData);
      localStorage.setItem('omtrax_user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omtrax_user');
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
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
