import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phoebe_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('phoebe_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const me = await AuthAPI.me(token);
        if (!canceled) setUser(prev => ({ ...(prev || {}), ...me.user }));
      } catch {
        // invalid token
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [token]);

  const login = (data) => {
    localStorage.setItem('phoebe_token', data.access_token);
    localStorage.setItem('phoebe_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('phoebe_token');
    localStorage.removeItem('phoebe_user');
    setToken(null);
    setUser(null);
  };

  const updateUserDisplay = (partial) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...partial };
      try { localStorage.setItem('phoebe_user', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const value = useMemo(() => ({ user, token, loading, login, logout, updateUserDisplay, isAuthenticated: !!token }), [user, token, loading]);
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


