import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentCustomer, loginCustomer, logoutCustomer, registerCustomer, type AuthUser } from '../api/auth'
import type { AuthSession, RegistrationInput, RegistrationResult } from '../types/auth'

const storageKey = 'alahly-auth-token'
interface AuthContextValue {
  currentUser?: AuthUser
  isAuthenticated: boolean
  isLoading: boolean
  error?: Error | null
  login: (username: string, password: string) => Promise<string>
  register: (input: RegistrationInput) => Promise<RegistrationResult>
  logout: () => Promise<void>
  token?: string
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey) ?? undefined)
  const client = useQueryClient()
  const user = useQuery({ queryKey: ['auth', 'current-user'], queryFn: () => getCurrentCustomer(token!), enabled: Boolean(token), retry: false })

  const acceptSession = useCallback((result: AuthSession) => {
    client.removeQueries({ queryKey: ['orders'] })
    sessionStorage.setItem(storageKey, result.token)
    setToken(result.token)
    client.setQueryData(['auth', 'current-user'], result.user)
  }, [client])

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginCustomer(username, password)
    acceptSession(result)
    return result.token
  }, [acceptSession])

  const register = useCallback(async (input: RegistrationInput) => {
    const result = await registerCustomer(input)
    if (result.authenticated) acceptSession(result)
    return result
  }, [acceptSession])

  const logout = useCallback(async () => {
    if (token) await logoutCustomer(token).catch(() => undefined)
    sessionStorage.removeItem(storageKey)
    setToken(undefined)
    client.removeQueries({ queryKey: ['auth'] })
    client.removeQueries({ queryKey: ['orders'] })
  }, [client, token])

  const value = useMemo(() => ({ currentUser: user.data, isAuthenticated: Boolean(token && user.data), isLoading: Boolean(token) && user.isLoading, error: user.error, login, register, logout, token }), [token, user.data, user.isLoading, user.error, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
