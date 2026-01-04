import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('pv_user');
    const token = localStorage.getItem('pv_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Invalid stored user, clear storage
        localStorage.removeItem('pv_user');
        localStorage.removeItem('pv_token');
      }
    }
    setLoading(false);
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