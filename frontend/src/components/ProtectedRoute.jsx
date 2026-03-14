import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Renders child routes only for authenticated users.
 * Uses the `loading` flag from AuthContext to avoid a flash-redirect to /login
 * on page refresh while the stored JWT is being validated.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Token check in progress — render nothing (no redirect, no flash)
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

  return <Outlet />;
}
