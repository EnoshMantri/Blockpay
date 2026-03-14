import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const TOKEN_KEY = 'blockpay_token';

function decodeToken(token) {
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) return null; // already expired
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Eagerly decode the stored token on first render to avoid a loading flash
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? decodeToken(stored) : null;
  });
  // loading stays true ONLY on the very first render when a token is present.
  // Once we've verified it synchronously above, we're never in a loading state.
  const [loading, setLoading] = useState(false);

  const expiryTimerRef = useRef(null);

  /**
   * Schedules an automatic logout exactly when the JWT expires.
   */
  const scheduleExpiry = useCallback((decoded, logoutFn) => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    const msUntilExpiry = decoded.exp * 1000 - Date.now();
    if (msUntilExpiry > 0) {
      expiryTimerRef.current = setTimeout(() => {
        logoutFn();
      }, msUntilExpiry);
    }
  }, []);

  const logout = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Store token immediately in localStorage so that the api.js interceptor
   * can read it on the very next request (before the React re-render cycle).
   */
  const login = useCallback((newToken) => {
    const decoded = decodeToken(newToken);
    if (!decoded) {
      // Token is already invalid or expired — treat as a failed login
      return;
    }
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(decoded);
    scheduleExpiry(decoded, logout);
  }, [scheduleExpiry, logout]);

  // On mount or token change, keep the expiry timer in sync.
  useEffect(() => {
    if (!token) return;
    const decoded = decodeToken(token);
    if (!decoded) {
      logout();
      return;
    }
    scheduleExpiry(decoded, logout);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [token, logout, scheduleExpiry]);

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
