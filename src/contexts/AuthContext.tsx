import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  clearSession,
  exchangeCodeForSession,
  resolveStoredUser,
} from '../utils/cognitoAuth';
import { AuthUser } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  login: (redirectPath?: string) => Promise<void>;
  register: (redirectPath?: string) => Promise<void>;
  completeLogin: (code: string, state?: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await resolveStoredUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Benutzer konnte nicht geladen werden', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, []);

  const startFlow = useCallback(async (mode: 'login' | 'register', redirectPath?: string) => {
    const url = await buildAuthorizeUrl(mode, redirectPath);
    window.location.assign(url);
  }, []);

  const login = useCallback(async (redirectPath?: string) => startFlow('login', redirectPath), [startFlow]);

  const register = useCallback(
    async (redirectPath?: string) => {
      await startFlow('register', redirectPath);
    },
    [startFlow],
  );

  const completeLogin = useCallback(async (code: string, state?: string) => {
    const { user: authenticatedUser, redirectPath } = await exchangeCodeForSession(code, state);
    setUser(authenticatedUser);
    return redirectPath;
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    setUser(null);
    try {
      const logoutUrl = buildLogoutUrl();
      window.location.assign(logoutUrl);
    } catch (error) {
      console.error('Logout-Redirect fehlgeschlagen', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      completeLogin,
      logout,
      isLoading,
    }),
    [user, login, register, completeLogin, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  }
  return context;
};
