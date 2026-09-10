import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './config';

export interface AuthContextType {
  user: User | null;
  isAuthReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setIsAuthReady(true);
      },
      (error) => {
        console.error('Firebase Auth state error:', error);
        setAuthError(error.message);
        setIsAuthReady(true);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Friendly message for popup closed or blocked
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('تم حظر النافذة المنبثقة من قِبل المتصفح. يُرجى السماح بالنوافذ المنبثقة.');
      } else {
        setAuthError(err.message || 'فشل تسجيل الدخول عبر Google.');
      }
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setAuthError(err.message || 'فشل تسجيل الخروج.');
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthReady,
        signInWithGoogle,
        signOutUser,
        authError,
        clearAuthError,
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
