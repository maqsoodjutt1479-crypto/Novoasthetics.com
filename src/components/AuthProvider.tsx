import React, { createContext, useContext, useMemo, useState } from 'react';

type Role = 'admin' | 'doctor' | 'fdo';

type User = {
  role: Role;
  doctorName?: string;
};

type AuthContextValue = {
  user: User | null;
  setRole: (role: Role, doctorName?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_USER: User | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);

  const setRole = (role: Role, doctorName?: string) => {
    setUser({ role, doctorName });
  };

  const logout = () => {
    setUser(DEFAULT_USER);
  };

  const value = useMemo(() => ({ user, setRole, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
