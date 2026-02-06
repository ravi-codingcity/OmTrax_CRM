import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SalesProvider } from './context/SalesContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import AllSales from './pages/admin/AllSales';
import Analytics from './pages/admin/Analytics';
import AdminNewEntry from './pages/admin/AdminNewEntry';
import NewEntry from './pages/sales/NewEntry';
import MyEntries from './pages/sales/MyEntries';
import SalesAnalytics from './pages/sales/SalesAnalytics';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SalesProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/sales"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AllSales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/new-entry"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminNewEntry />
                  </ProtectedRoute>
                }
              />

              {/* Sales Routes */}
              <Route
                path="/sales/new-entry"
                element={
                  <ProtectedRoute requiredRole="salesperson">
                    <NewEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales/my-entries"
                element={
                  <ProtectedRoute requiredRole="salesperson">
                    <MyEntries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales/analytics"
                element={
                  <ProtectedRoute requiredRole="salesperson">
                    <SalesAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </SalesProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
