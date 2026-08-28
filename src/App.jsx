import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { SalesProvider } from './context/SalesContext';
import { NotificationProvider } from './context/NotificationContext';
import { BusinessProvider } from './context/BusinessContext';
import { RecruitmentProvider } from './context/RecruitmentContext';
import { PurchaseProvider } from './context/PurchaseContext';
import { VendorProvider } from './context/VendorContext';
import { PurchaseOrderProvider } from './context/PurchaseOrderContext';
import { RateComparisonProvider } from './context/RateComparisonContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './pages/Login';
import SelectDepartment from './pages/SelectDepartment';
import Dashboard from './pages/admin/Dashboard';
import AllSales from './pages/admin/AllSales';
import Analytics from './pages/admin/Analytics';
import AdminNewEntry from './pages/admin/AdminNewEntry';
import AssignLeads from './pages/admin/AssignLeads';
import NewEntry from './pages/sales/NewEntry';
import MyEntries from './pages/sales/MyEntries';
import SalesAnalytics from './pages/sales/SalesAnalytics';
import BusinessOverview from './pages/admin/BusinessOverview';
import UserManagement from './pages/director/UserManagement';
import MyBusiness from './pages/sales/MyBusiness';
import MyHrRequirements from './pages/sales/MyHrRequirements';
import HrDashboard from './pages/hr/HrDashboard';
import HrRequirements from './pages/hr/HrRequirements';
import HrAnalytics from './pages/hr/HrAnalytics';
import PurchaseDashboard from './pages/Purchase/PurchaseDashboard';
import PurchaseEntries from './pages/Purchase/PurchaseEntries';
import PurchaseAnalytics from './pages/Purchase/PurchaseAnalytics';
import PurchaseOrders from './pages/Purchase/PurchaseOrders';
import RateComparisons from './pages/Purchase/RateComparisons';
import VendorsPage from './pages/shared/VendorsPage';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import DirectorDashboard from './pages/director/DirectorDashboard';
import KycForm from './pages/KycForm';

function App() {
  return (
    <AuthProvider>
      <DepartmentProvider>
      <NotificationProvider>
        <SalesProvider>
          <BusinessProvider>
          <RecruitmentProvider>
          <PurchaseProvider>
          <VendorProvider>
          <PurchaseOrderProvider>
          <RateComparisonProvider>
          <Router>
            <Routes>
              {/* Public Routes — login only. Accounts and password resets are
                  managed by admins in the User Management panel. */}
              <Route path="/login" element={<Login />} />

              {/* PUBLIC — Vendor KYC form. The vendor has no CRM account; the
                  one-time token in the URL is the credential. Deliberately
                  outside ProtectedRoute and MainLayout. */}
              <Route path="/kyc/:token" element={<KycForm />} />

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
              <Route
                path="/purchase/orders"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <PurchaseOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase/vendors"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <VendorsPage department="purchase" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase/rate-comparisons"
                element={
                  <ProtectedRoute requiredDepartment="purchase">
                    <RateComparisons />
                  </ProtectedRoute>
                }
              />

              {/* Finance Routes — Finance department users + CRM Admin */}
              <Route
                path="/finance/dashboard"
                element={
                  <ProtectedRoute requiredDepartment="finance">
                    <FinanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance/vendors"
                element={
                  <ProtectedRoute requiredDepartment="finance">
                    <VendorsPage department="finance" />
                  </ProtectedRoute>
                }
              />

              {/* Operations Department — its own vendor register and KYC
                  workflow. Shares VendorsPage; the backend scopes what it
                  returns to the Operations KYC type. */}
              <Route
                path="/operations/vendors"
                element={
                  <ProtectedRoute requiredDepartment="operations">
                    <VendorsPage department="operations" />
                  </ProtectedRoute>
                }
              />

              {/* Director Department — visible only to Admin and Director.
                  ProtectedRoute's requiredRole="admin" resolves true for both,
                  since they share the same CRM authority. */}
              <Route
                path="/director/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin" requiredDepartment="director">
                    <DirectorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/director/rate-comparisons"
                element={
                  <ProtectedRoute requiredRole="admin" requiredDepartment="director">
                    <RateComparisons />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/director/orders"
                element={
                  <ProtectedRoute requiredRole="admin" requiredDepartment="director">
                    <PurchaseOrders />
                  </ProtectedRoute>
                }
              />
              {/* The single, centralised Users section. requiredRole="admin"
                  resolves true for Admin and Director alike; every other role is
                  redirected, and the API refuses them independently. */}
              <Route
                path="/director/users"
                element={
                  <ProtectedRoute requiredRole="admin" requiredDepartment="director">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
          </RateComparisonProvider>
          </PurchaseOrderProvider>
          </VendorProvider>
          </PurchaseProvider>
          </RecruitmentProvider>
          </BusinessProvider>
        </SalesProvider>
      </NotificationProvider>
      </DepartmentProvider>
    </AuthProvider>
  );
}

export default App;
