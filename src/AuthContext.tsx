import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInWithCustomToken, updateProfile } from 'firebase/auth';
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
  loginWithGoogle: (role?: string) => Promise<'popup' | 'redirect'>;
  loginWithLinkedIn: (role?: string) => Promise<string>;
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
    getRedirectResult(auth).catch((err) => {
      console.warn('[Auth] Redirect sign-in failed:', err?.code || err?.message || err);
    });
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
    const uid = auth.currentUser?.uid;
    if (uid) saveUserData(uid, { role } as any).catch(() => {});
  };

  const loginWithGoogle = async (role?: string) => {
    saveRole(role);
    // Proactive Mobile Strategy: Use redirect for ALL mobile devices to bypass Safari ITP/Popup blockers.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      sessionStorage.setItem('civicpath_auth_redirect_pending', 'true');
      await signInWithRedirect(auth, googleProvider);
      return 'redirect';
    }

    try {
      await signInWithPopup(auth, googleProvider);
      return 'popup';
    } catch (err: any) {
      console.warn('[Auth] Popup blocked, falling back to redirect:', err.code);
      sessionStorage.setItem('civicpath_auth_redirect_pending', 'true');
      await signInWithRedirect(auth, googleProvider);
      return 'redirect';
    }
  };

  const loginWithLinkedIn = async (role?: string) => {
    saveRole(role);
    const state = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('civicpath_linkedin_state', state);
    sessionStorage.setItem('civicpath_linkedin_return_to', role === 'funder' ? '/funder' : '/seeker');
    // LinkedIn always uses a full window redirect for maximum compatibility
    window.location.href = `/api/linkedin?action=authorize&state=${encodeURIComponent(state)}`;
    return 'redirect';
  };

  const loginWithEmail = async (email: string, password: string, role?: string) => {
    saveRole(role);
    try {
      // Try server-side proxy first (works from any country/ISP)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      await signInWithCustomToken(auth, data.customToken);
    } catch (err: any) {
      // If proxy fails (e.g. not deployed yet), try direct Firebase
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }
  };

  const signupWithEmail = async (name: string, email: string, password: string, role?: string) => {
    saveRole(role);
    try {
      // Try server-side proxy first (works from any country/ISP)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign up failed');
      await signInWithCustomToken(auth, data.customToken);
      await saveUserData(data.uid, {
        role: (role || 'seeker') as any,
        profile: { email, name } as any,
      }).catch(() => {});
    } catch (err: any) {
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await saveUserData(cred.user.uid, {
          role: (role || 'seeker') as any,
          profile: { email, name } as any,
        }).catch(() => {});
      } else {
        throw err;
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('civicpath_role');
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithLinkedIn, loginWithEmail, signupWithEmail, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
