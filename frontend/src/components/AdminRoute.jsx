import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Renders child routes only for authenticated users with the 'admin' role.
 * Regular users see a 403-style access denied page instead.
 */
export default function AdminRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-btn-glow animate-pulse">
            <span className="text-void font-bold text-lg font-mono">B</span>
          </div>
          <span className="text-text-secondary text-sm font-mono animate-pulse">Authenticating…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-secondary text-sm max-w-sm leading-relaxed">
            The Admin Panel requires administrator privileges.<br/>
            Your account role is <span className="font-mono text-accent">{user?.role || 'user'}</span>.
          </p>
        </div>
        <a href="/" className="btn-secondary text-sm px-6 py-2.5">← Back to Dashboard</a>
      </div>
    );
  }

  return <Outlet />;
}
