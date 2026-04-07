import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserResponse } from '../types/api';
import apiService from '../services/api';
import { clearAllStoredData } from '../utils/storage';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  reauthenticate: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isReauthRequired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReauthRequired, setIsReauthRequired] = useState(false);

  useEffect(() => {
    // Проверяем сохраненные данные при загрузке
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
      const isCardModalOpen = Boolean(document.querySelector('[data-card-modal="open"]'));
      if (isCardModalOpen && localStorage.getItem('token') && localStorage.getItem('user')) {
        setIsReauthRequired(true);
        return;
      }

      logout();
    });

    return () => {
      apiService.setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });
      setToken(response.token);
      setUser(response.user);
      setIsReauthRequired(false);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    }
  };

  const reauthenticate = async (email: string, password: string) => {
    const response = await apiService.login({ email, password });
    setToken(response.token);
    setUser(response.user);
    setIsReauthRequired(false);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const register = async (email: string, name: string, password: string) => {
    try {
      await apiService.register({ email, name, password });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsReauthRequired(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Очищаем все сохраненные данные о выбранных проектах и pipeline
    clearAllStoredData();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    reauthenticate,
    register,
    logout,
    isLoading,
    isReauthRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
