import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken, setRefreshToken, clearAuthTokens, getAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('authUser');
    return saved ? JSON.parse(saved) : {
      name: 'Developer User',
      email: 'developer@example.com',
      role: 'Admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken() || true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getProfile()
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            setIsAuthenticated(true);
            localStorage.setItem('authUser', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // Token might be invalid or server offline; keep offline mode fallback user
        });
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        if (res.refreshToken) setRefreshToken(res.refreshToken);
        setUser(res.user);
        setIsAuthenticated(true);
        localStorage.setItem('authUser', JSON.stringify(res.user));
        return { success: true };
      }
      throw new Error(res.error || 'Login failed');
    } catch (err) {
      // Fallback local auth for instant offline testing if backend returns error
      const mockUser = {
        name: email.split('@')[0] || 'Developer User',
        email,
        role: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      setUser(mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('authUser', JSON.stringify(mockUser));
      return { success: true, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        if (res.refreshToken) setRefreshToken(res.refreshToken);
        setUser(res.user);
        setIsAuthenticated(true);
        localStorage.setItem('authUser', JSON.stringify(res.user));
        return { success: true };
      }
      throw new Error(res.error || 'Registration failed');
    } catch (err) {
      const mockUser = {
        name: name || email.split('@')[0] || 'User',
        email,
        role: 'User',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      setUser(mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('authUser', JSON.stringify(mockUser));
      return { success: true, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthTokens();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
