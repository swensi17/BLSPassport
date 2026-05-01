import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'user';

export interface UserAccount {
  username: string;
  role: UserRole;
  profileName: string;
  avatarUri?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profileName: string;
  userRole: UserRole;
  currentUser: UserAccount | null;
  login: (username: string, code: string) => boolean;
  logout: () => void;
  updateProfile: (name: string) => void;
  updateAvatar: (uri: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_CODE = 'admin';
const USER_CODE = 'service';
const SESSION_KEY = 'bls_session_v2';
const ACCOUNTS_KEY = 'bls_accounts_v2';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const user: UserAccount = JSON.parse(raw);
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (_) {
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback((username: string, code: string): boolean => {
    const trimmedCode = code.toLowerCase().trim();
    const trimmedUser = username.trim();
    if (!trimmedUser) return false;

    let role: UserRole | null = null;
    if (trimmedCode === ADMIN_CODE) role = 'admin';
    else if (trimmedCode === USER_CODE) role = 'user';
    if (!role) return false;

    // Load or create account
    const accountKey = `${ACCOUNTS_KEY}_${trimmedUser.toLowerCase()}`;
    AsyncStorage.getItem(accountKey).then(raw => {
      let account: UserAccount;
      if (raw) {
        account = JSON.parse(raw);
        // Update role if code matches
        account.role = role!;
      } else {
        account = { username: trimmedUser, role: role!, profileName: trimmedUser };
      }
      setCurrentUser(account);
      setIsAuthenticated(true);
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(account));
      AsyncStorage.setItem(accountKey, JSON.stringify(account));
    });

    // Optimistically set state for immediate UI response
    const account: UserAccount = { username: trimmedUser, role, profileName: trimmedUser };
    setCurrentUser(account);
    setIsAuthenticated(true);
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(account));
    return true;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const updateProfile = useCallback((name: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, profileName: name };
    setCurrentUser(updated);
    const accountKey = `${ACCOUNTS_KEY}_${currentUser.username.toLowerCase()}`;
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    AsyncStorage.setItem(accountKey, JSON.stringify(updated));
  }, [currentUser]);

  const updateAvatar = useCallback((uri: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, avatarUri: uri };
    setCurrentUser(updated);
    const accountKey = `${ACCOUNTS_KEY}_${currentUser.username.toLowerCase()}`;
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    AsyncStorage.setItem(accountKey, JSON.stringify(updated));
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading,
      profileName: currentUser?.profileName || '',
      userRole: currentUser?.role || 'user',
      currentUser,
      login, logout, updateProfile, updateAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
