import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';

const ProtectedRoute = ({ children, requiredRole, requiredDepartment, allowWithoutDepartment = false, allowBusinessSub = false }) => {
  const { user, isAdmin, loading } = useAuth();
  const { hasSelectedDepartment, activeDepartment } = useDepartment();

  // Home path for a non-admin user based on their department
  const homePath = () =>
    ({
      hr: '/hr/dashboard',
      purchase: '/purchase/dashboard',
      finance: '/finance/dashboard',
      director: '/director/dashboard',
    }[activeDepartment] || '/sales/new-entry');

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Sandboxed sub-user: confined to the Business page only. Any other route
  // bounces back to it. Removing the account removes this restriction entirely.
  if (user.role === 'business_sub' && !allowBusinessSub) {
    return <Navigate to="/sales/business" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to={homePath()} replace />;
  }

  if (requiredRole === 'salesperson' && isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Admins must pick a department before entering any CRM screen.
  if (isAdmin() && !allowWithoutDepartment && !hasSelectedDepartment) {
    return <Navigate to="/select-department" replace />;
  }

  // Department-scoped routes: send users to their correct CRM if mismatched.
  if (requiredDepartment && activeDepartment !== requiredDepartment) {
    if (isAdmin()) return <Navigate to="/select-department" replace />;
    return <Navigate to={homePath()} replace />;
  }

  return children;
};

export default ProtectedRoute;
