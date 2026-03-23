import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'civicpath_user';
const ACCOUNTS_KEY = 'civicpath_accounts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const signup = async (name: string, email: string, password: string) => {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    if (accounts[email]) throw new Error('An account with this email already exists.');
    accounts[email] = { name, password };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    setUser({ email, name });
  };

  const login = async (email: string, password: string) => {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    const account = accounts[email];
    if (!account || account.password !== password) {
      throw new Error('Invalid email or password.');
    }
    setUser({ email, name: account.name });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
