/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react';
import { clearAuthSession, fetchProfile, isSessionExpired, loadAuthToken, SESSION_TIMEOUT_MS, setAuthToken, touchSessionActivity } from '../lib/api';

export const AuthContext = createContext({ user: null, isAuth: false, setToken: () => {}, logout: () => {} });

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
      clearAuthSession();
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
      clearAuthSession();
      setUser(null);
      setIsAuth(false);
    });
  }

  function logout(message = null) {
    clearAuthSession(message);
    setUser(null);
    setIsAuth(false);
  }

  useEffect(() => {
    function syncAuthState() {
      const token = loadAuthToken();
      if (!token) {
        setUser(null);
        setIsAuth(false);
      }
    }

    window.addEventListener('auth:changed', syncAuthState);
    return () => {
      window.removeEventListener('auth:changed', syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (!isAuth) return undefined;

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'visibilitychange'];
    const handleActivity = () => {
      if (document.visibilityState && document.visibilityState === 'hidden') return;
      touchSessionActivity();
    };

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      if (isSessionExpired()) {
        logout('Your session timed out due to inactivity. Please log in again.');
      }
    }, Math.min(60000, SESSION_TIMEOUT_MS));

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.clearInterval(intervalId);
    };
  }, [isAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuth, setToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
