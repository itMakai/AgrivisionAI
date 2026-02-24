import React, { createContext, useEffect, useState } from 'react';
import { fetchProfile, loadAuthToken, setAuthToken } from '../lib/api';

export const AuthContext = createContext({ user: null, isAuth: false, setToken: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const t = loadAuthToken();
    if (!t) {
      if (mounted) {
        setIsAuth(false);
        setUser(null);
        setLoading(false);
      }
      return () => { mounted = false; };
    }

    // verify token by fetching profile
    fetchProfile().then(p => {
      if (!mounted) return;
      setUser(p);
      setIsAuth(true);
    }).catch(() => {
      // invalid token
      setAuthToken(null);
      setUser(null);
      setIsAuth(false);
    }).finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  function setToken(token) {
    setAuthToken(token);
    if (!token) {
      setIsAuth(false);
      setUser(null);
      return;
    }
    // load profile
    fetchProfile().then(p => {
      setUser(p);
      setIsAuth(true);
    }).catch(() => {
      setUser(null);
      setIsAuth(false);
    });
  }

  return (
    <AuthContext.Provider value={{ user, isAuth, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
