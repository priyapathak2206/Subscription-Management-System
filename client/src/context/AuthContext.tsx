import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('brightloop_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brightloop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('brightloop_token', newToken);
    localStorage.setItem('brightloop_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('brightloop_token');
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('brightloop_user', JSON.stringify(response.data.user));
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

