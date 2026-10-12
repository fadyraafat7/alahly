import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentCustomer,
  loginCustomer,
  logoutWithWordPressHandoff,
  registerCustomer,
  type AuthUser,
} from "../api/auth";
import type {
  AuthSession,
  RegistrationInput,
  RegistrationResult,
} from "../types/auth";
import { useHydrated } from "../hooks/useHydrated";
import { ApiError } from '../api/client';
import { clearPrivateCache, createSessionEpoch, isPrivateKey, profileKey } from '../query/privateSession';

const storageKey = "alahly-auth-token";
interface AuthContextValue {
  currentUser?: AuthUser;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: Error | null;
  login: (username: string, password: string) => Promise<string>;
  register: (input: RegistrationInput) => Promise<RegistrationResult>;
  logout: () => Promise<void>;
  token?: string;
  sessionScope: number;
  isSessionExpired: boolean;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [session, setSession] = useState(() => ({
    token: typeof window === 'undefined' ? undefined : sessionStorage.getItem(storageKey) ?? undefined,
    scope: 0,
  }));
  const { token, scope } = session;
  const [isSessionExpired, setSessionExpired] = useState(false);
  const epoch = useRef(createSessionEpoch());
  const client = useQueryClient();
  const user = useQuery({
    queryKey: profileKey(scope),
    queryFn: ({ signal }) => getCurrentCustomer(token!, signal),
    enabled: hydrated && Boolean(token),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const clearSession = useCallback((expired = false) => {
    const next = epoch.current.advance();
    sessionStorage.removeItem(storageKey);
    setSession({ token: undefined, scope: next });
    setSessionExpired(expired);
    clearPrivateCache(client);
  }, [client]);

  useEffect(() => client.getQueryCache().subscribe((event) => {
    const query = event.query;
    if (event.type !== 'updated' || event.action.type !== 'error' || !token || !isPrivateKey(query.queryKey)) return;
    const queryScope = query.queryKey[0] === 'orders' ? query.queryKey[1] : query.queryKey[2];
    if (queryScope === scope && query.state.error instanceof ApiError && query.state.error.status === 401) {
      clearSession(true);
    }
  }), [client, token, scope, clearSession]);

  const acceptSession = useCallback(
    (result: AuthSession, next: number) => {
      if (!epoch.current.isCurrent(next)) throw new Error('Sign-in was superseded. Please try again.');
      clearPrivateCache(client);
      sessionStorage.setItem(storageKey, result.token);
      client.setQueryData(profileKey(next), result.user);
      setSession({ token: result.token, scope: next });
      setSessionExpired(false);
    },
    [client],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const next = epoch.current.advance();
      const result = await loginCustomer(username, password);
      acceptSession(result, next);
      return result.token;
    },
    [acceptSession],
  );

  const register = useCallback(
    async (input: RegistrationInput) => {
      const next = epoch.current.advance();
      const result = await registerCustomer(input);
      if (result.authenticated) acceptSession(result, next);
      return result;
    },
    [acceptSession],
  );

  const logout = useCallback(async () => {
    // Clear private UI/cache immediately, even if remote revocation is unavailable.
    await logoutWithWordPressHandoff(() => clearSession(), token);
  }, [clearSession, token]);

  const unauthorized = user.error instanceof ApiError && user.error.status === 401;
  const value = useMemo(
    () => ({
      currentUser: hydrated && token && !unauthorized ? user.data : undefined,
      isAuthenticated: hydrated && !unauthorized && Boolean(token && user.data),
      isLoading: !hydrated || (Boolean(token) && user.isPending),
      error: user.error,
      login,
      register,
      logout,
      token: hydrated ? token : undefined,
      sessionScope: scope,
      isSessionExpired,
    }),
    [
      hydrated,
      token,
      user.data,
      user.isPending,
      user.error,
      login,
      register,
      logout,
      scope,
      unauthorized,
      isSessionExpired,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
