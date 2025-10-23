'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { pb, AuthModel } from '@/lib/pocketbase';

interface AuthContextType {
  user: AuthModel | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mevcut oturumu kontrol et
    if (pb.authStore.isValid) {
      const authModel = pb.authStore.model;
      if (authModel) {
        setUser({
          id: authModel.id,
          email: authModel.email,
          name: authModel.name,
          avatar: authModel.avatar,
          credit: authModel.credit || 0,
          rent_paid: authModel.rent_paid || 0,
          created: authModel.created,
          updated: authModel.updated,
        });
      }
    }
    setLoading(false);

    // Auth değişikliklerini dinle
    pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        const authModel = pb.authStore.model;
        if (authModel) {
          setUser({
            id: authModel.id,
            email: authModel.email,
            name: authModel.name,
            avatar: authModel.avatar,
            credit: authModel.credit || 0,
            rent_paid: authModel.rent_paid || 0,
            created: authModel.created,
            updated: authModel.updated,
          });
        }
      } else {
        setUser(null);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password);
    } catch (error) {
      throw new Error('Giriş başarısız');
    }
  };

  const register = async (email: string, password: string, passwordConfirm: string, name: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        name,
      });
    } catch (error) {
      throw new Error('Kayıt başarısız');
    }
  };

  const logout = () => {
    pb.authStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 