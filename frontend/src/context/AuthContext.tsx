'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

export interface Profile {
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface SellerProfile {
  storeName: string;
  storeDescription?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  profile?: Profile | null;
  sellerProfile?: SellerProfile | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    role: 'CUSTOMER' | 'SELLER' | 'ADMIN',
    firstName: string,
    lastName: string,
    storeName?: string,
    storeDescription?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Validate and fetch fresh user profile from backend
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Failed to validate initial token', err);
          // If JWT validation fails, try to refresh immediately
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const res = await api.post('/auth/refresh', { refreshToken });
              const { accessToken, refreshToken: newRefreshToken, user: freshUser } = res.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              localStorage.setItem('user', JSON.stringify(freshUser));
              setUser(freshUser);
            } else {
              handleClearAuth();
            }
          } catch {
            handleClearAuth();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleClearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: loggedUser } = res.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);

      // Redirect based on role
      if (loggedUser.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (loggedUser.role === 'SELLER') {
        router.push('/seller/dashboard');
      } else {
        router.push('/profile');
      }
    } catch (err) {
      handleClearAuth();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    role: 'CUSTOMER' | 'SELLER' | 'ADMIN',
    firstName: string,
    lastName: string,
    storeName?: string,
    storeDescription?: string,
  ) => {
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email,
        password,
        role,
        firstName,
        lastName,
        storeName,
        storeDescription,
      });

      // Automatically login after successful registration
      await login(email, password);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error on server', err);
    } finally {
      handleClearAuth();
      router.push('/login');
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      console.error('Error refreshing profile info', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
