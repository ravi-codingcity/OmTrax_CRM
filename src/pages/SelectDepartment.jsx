import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDepartment } from '../context/DepartmentContext';
import { DEPARTMENTS } from '../config/departments';
import omtrax_logo from '../assets/OmTrax.png';

const colorClasses = {
  blue: {
    ring: 'hover:border-blue-500 hover:shadow-blue-100',
    icon: 'bg-blue-100 text-blue-600',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  purple: {
    ring: 'hover:border-purple-500 hover:shadow-purple-100',
    icon: 'bg-purple-100 text-purple-600',
    btn: 'bg-purple-600 hover:bg-purple-700',
  },
};

const SelectDepartment = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { setActiveDepartment } = useDepartment();

  // Only admins choose a department; everyone else is routed to their own CRM.
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!isAdmin()) {
      navigate('/sales/new-entry', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const handleSelect = (deptKey) => {
    setActiveDepartment(deptKey);
    navigate(deptKey === 'hr' ? '/hr/dashboard' : '/admin/dashboard', { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <img src={omtrax_logo} alt="OmTrax Logo" className="h-12 w-auto mx-auto" />
          <h1 className="text-2xl font-bold text-gray-800 mt-4">Select a Department</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome{user?.name ? `, ${user.name}` : ''}. Choose which CRM you want to open.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {DEPARTMENTS.map((dept) => {
            const c = colorClasses[dept.color] || colorClasses.blue;
            return (
              <button
                key={dept.key}
                onClick={() => handleSelect(dept.key)}
                className={`bg-white rounded-2xl shadow-sm border-2 border-transparent p-6 text-left transition-all hover:shadow-lg ${c.ring} group`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${c.icon}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={dept.icon} />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">{dept.label}</h2>
                <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                <div className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg transition-all ${c.btn}`}>
                  Open CRM
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectDepartment;
