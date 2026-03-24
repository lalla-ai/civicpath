import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { saveUserData } from './lib/db';

interface User {
  email: string;
  name: string;
  photo?: string;
  role?: 'seeker' | 'funder';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (role?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string, role?: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, password: string, role?: string) => Promise<void>;
  setRole: (role: 'seeker' | 'funder') => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedRole = localStorage.getItem('civicpath_role') as 'seeker' | 'funder' | null;
        setUser({
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          photo: firebaseUser.photoURL || undefined,
          role: savedRole || undefined,
        });
        // Always persist email to Firestore so Stripe webhook can look up the user
        saveUserData(firebaseUser.uid, {
          profile: {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
          },
        }).catch(() => {});
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveRole = (role?: string) => {
    if (role) localStorage.setItem('civicpath_role', role);
  };

  const setRole = (role: 'seeker' | 'funder') => {
    localStorage.setItem('civicpath_role', role);
    setUser(prev => prev ? { ...prev, role } : prev);
    // Persist role to Firestore so it survives device switches
    const uid = auth.currentUser?.uid;
    if (uid) saveUserData(uid, { role } as any).catch(() => {});
  };

  const loginWithGoogle = async (role?: string) => {
    saveRole(role);
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string, role?: string) => {
    saveRole(role);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (name: string, email: string, password: string, role?: string) => {
    saveRole(role);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Seed the user document in Firestore with email + role on signup
    await saveUserData(cred.user.uid, {
      role: (role || 'seeker') as any,
      profile: { email, name } as any,
    }).catch(() => {});
  };

  const logout = () => {
    localStorage.removeItem('civicpath_role');
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
