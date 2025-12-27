import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInAnonymously,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
  type User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import type { AuthStatus } from '../types';

const EMAIL_STORAGE_KEY = 'emailForSignIn';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isConfigured: boolean;
  sendEmailLink: (email: string) => Promise<void>;
  completeEmailSignIn: (email: string) => Promise<void>;
  linkEmail: (email: string) => Promise<void>;
  checkPendingEmailLink: () => boolean;
  getStoredEmail: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
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

  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true,
  };

  const sendEmailLink = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  };

  const checkPendingEmailLink = () => {
    if (!auth) return false;
    return isSignInWithEmailLink(auth, window.location.href);
  };

  const getStoredEmail = () => {
    return localStorage.getItem(EMAIL_STORAGE_KEY);
  };

  const completeEmailSignIn = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailLink(auth, email, window.location.href);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const linkEmail = async (email: string) => {
    if (!auth || !user) throw new Error('No user to link');
    const credential = EmailAuthProvider.credentialWithLink(email, window.location.href);
    await linkWithCredential(user, credential);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    window.history.replaceState(null, '', window.location.pathname);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isConfigured,
        sendEmailLink,
        completeEmailSignIn,
        linkEmail,
        checkPendingEmailLink,
        getStoredEmail,
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
