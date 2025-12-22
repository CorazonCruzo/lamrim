import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInAnonymously,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import type { AuthStatus } from '../types';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isConfigured: boolean;
  signInAnonymouslyHandler: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    // Если Firebase не настроен, переходим в анонимный режим без Firebase
    if (!isConfigured || !auth) {
      setStatus('anonymous');
      return;
    }

    const firebaseAuth = auth;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setStatus(firebaseUser.isAnonymous ? 'anonymous' : 'authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
        signInAnonymously(firebaseAuth).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [isConfigured]);

  const signInAnonymouslyHandler = async () => {
    if (!auth) return;
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Failed to sign in anonymously:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isConfigured,
        signInAnonymouslyHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
