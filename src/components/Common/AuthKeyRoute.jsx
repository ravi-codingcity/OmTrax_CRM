import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { authAPI } from '../../services/api';

// URL-based authentication guard for the Sign Up / Reset Password pages.
//
// The secret lives in the page URL only — never in the frontend bundle — and is
// validated by the API, which answers 404 for a wrong key. A visitor without the
// exact link is sent to /login, so the pages cannot be found by guessing.
const AuthKeyRoute = ({ children }) => {
  const { accessKey } = useParams();
  const [status, setStatus] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    let active = true;
    setStatus('checking');
    authAPI
      .verifyAccessKey(accessKey)
      .then(() => active && setStatus('allowed'))
      .catch(() => active && setStatus('denied'));
    return () => { active = false; };
  }, [accessKey]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/login" replace />;

  return children;
};

export default AuthKeyRoute;
