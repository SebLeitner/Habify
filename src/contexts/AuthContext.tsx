import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'habify-auth-user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setUser(JSON.parse(cached));
    }
    setIsLoading(false);
  }, []);

  const persistUser = useCallback((authUser: AuthUser | null) => {
    if (authUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Bitte E-Mail und Passwort angeben.');
    }
    const fakeUser: AuthUser = { id: btoa(email).slice(0, 12), email };
    persistUser(fakeUser);
    setUser(fakeUser);
  }, [persistUser]);

  const register = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    persistUser(null);
    setUser(null);
  }, [persistUser]);

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      isLoading,
    }),
    [user, login, register, logout, isLoading],
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
