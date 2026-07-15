import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { SalesProvider } from './context/SalesContext';
import { NotificationProvider } from './context/NotificationContext';
import { SalesVisitProvider } from './context/SalesVisitContext';
import { BusinessProvider } from './context/BusinessContext';
import { RecruitmentProvider } from './context/RecruitmentContext';
import { PurchaseProvider } from './context/PurchaseContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import SelectDepartment from './pages/SelectDepartment';
import Dashboard from './pages/admin/Dashboard';
import AllSales from './pages/admin/AllSales';
import Analytics from './pages/admin/Analytics';
import AdminNewEntry from './pages/admin/AdminNewEntry';
import AssignLeads from './pages/admin/AssignLeads';
import NewEntry from './pages/sales/NewEntry';
import MyEntries from './pages/sales/MyEntries';
import SalesAnalytics from './pages/sales/SalesAnalytics';
import SalesVisit from './pages/SalesVisit';
import BusinessOverview from './pages/admin/BusinessOverview';
import MyBusiness from './pages/sales/MyBusiness';
import MyHrRequirements from './pages/sales/MyHrRequirements';
import HrDashboard from './pages/hr/HrDashboard';
import HrRequirements from './pages/hr/HrRequirements';
import HrAnalytics from './pages/hr/HrAnalytics';
import PurchaseDashboard from './pages/Purchase/PurchaseDashboard';
import PurchaseEntries from './pages/Purchase/PurchaseEntries';
import PurchaseAnalytics from './pages/Purchase/PurchaseAnalytics';

function App() {
  return (
    <AuthProvider>
      <DepartmentProvider>
      <NotificationProvider>
        <SalesProvider>
          <SalesVisitProvider>
          <BusinessProvider>
          <RecruitmentProvider>
          <PurchaseProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/108/signup" element={<Signup />} />
              <Route path="/108/reset-password" element={<ResetPassword />} />

              {/* Department selection (admin) */}
              <Route
                path="/select-department"
                element={
                  <ProtectedRoute requiredRole="admin" allowWithoutDepartment>
                    <SelectDepartment />
                  </ProtectedRoute>
                }
              />
              
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
              <Route
                path="/admin/assign-leads"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AssignLeads />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/business"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <BusinessOverview />
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
              <Route
                path="/sales/business"
                element={
                  <ProtectedRoute requiredRole="salesperson" allowBusinessSub>
                    <MyBusiness />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales/hr-requirements"
                element={
                  <ProtectedRoute requiredRole="salesperson">
                    <MyHrRequirements />
                  </ProtectedRoute>
                }
              />

              {/* HR Management Routes - any HR-department user */}
              <Route
                path="/hr/dashboard"
                element={
                  <ProtectedRoute requiredDepartment="hr">
                    <HrDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/requirements"
                element={
                  <ProtectedRoute requiredDepartment="hr">
                    <HrRequirements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/analytics"
                element={
                  <ProtectedRoute requiredRole="admin" requiredDepartment="hr">
                    <HrAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Purchase Management Routes - Purchase department users + CRM Admin */}
              <Route
                path="/purchase/dashboard"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <PurchaseDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase/entries"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <PurchaseEntries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase/analytics"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <PurchaseAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Sales Visit - Accessible by both Admin and Salesperson */}
              <Route
                path="/sales-visit"
                element={
                  <ProtectedRoute>
                    <SalesVisit />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
          </PurchaseProvider>
          </RecruitmentProvider>
          </BusinessProvider>
          </SalesVisitProvider>
        </SalesProvider>
      </NotificationProvider>
      </DepartmentProvider>
    </AuthProvider>
  );
}

export default App;
