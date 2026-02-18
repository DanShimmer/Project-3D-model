import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token with backend
  const validateToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.user || data;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('pv_user');
      const token = localStorage.getItem('pv_token');
      
      if (storedUser && token) {
        try {
          // Validate token with backend
          const validUser = await validateToken(token);
          
          if (validUser) {
            // Token is valid, use fresh user data
            setUser(validUser);
            localStorage.setItem('pv_user', JSON.stringify(validUser));
          } else {
            // Token expired or invalid, clear storage
            console.log('Token expired, clearing session');
            localStorage.removeItem('pv_user');
            localStorage.removeItem('pv_token');
            setUser(null);
          }
        } catch {
          // Error validating, clear storage
          localStorage.removeItem('pv_user');
          localStorage.removeItem('pv_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('pv_token', token);
    localStorage.setItem('pv_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pv_token');
    localStorage.removeItem('pv_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('pv_user', JSON.stringify(userData));
    setUser(userData);
  };

  const getToken = () => {
    return localStorage.getItem('pv_token');
  };

  // Computed values
  const isAuthenticated = useMemo(() => {
    return !!user && !!localStorage.getItem('pv_token');
  }, [user]);

  const isAdmin = useMemo(() => {
    return user?.isAdmin === true;
  }, [user]);

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated,
    isAdmin,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within an AuthProvider');
  return auth;
}