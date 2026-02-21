import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withCsrfToken } from '@/webserver/middleware/csrfClient';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  id: string;
  username: string;
}

interface LoginParams {
  username: string;
  password: string;
  remember?: boolean;
}

interface RegisterParams {
  username: string;
  password: string;
}

type LoginErrorCode = 'invalidCredentials' | 'tooManyAttempts' | 'serverError' | 'networkError' | 'unknown';
type RegisterErrorCode = 'usernameTaken' | 'validationError' | 'serverError' | 'networkError' | 'unknown';

interface LoginResult {
  success: boolean;
  message?: string;
  code?: LoginErrorCode;
}

interface RegisterResult {
  success: boolean;
  message?: string;
  code?: RegisterErrorCode;
}

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  login: (params: LoginParams) => Promise<LoginResult>;
  register: (params: RegisterParams) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_ENDPOINT = '/api/auth/user';

const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.electronAPI);

type WebSocketHookWindow = Window & {
  __websocketReconnect?: () => void;
  __websocketDisconnect?: () => void;
};

function getWebSocketHookWindow(): WebSocketHookWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as WebSocketHookWindow;
}

async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    const response = await fetch(AUTH_USER_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { success: boolean; user?: AuthUser };
    if (data.success && data.user) {
      return data.user;
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    console.error('Failed to fetch current user:', error);
  }

  return null;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (isDesktopRuntime) {
      setStatus('authenticated');
      setUser(null);
      setReady(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('checking');

    const currentUser = await fetchCurrentUser(controller.signal);
    if (currentUser) {
      setUser(currentUser);
      setStatus('authenticated');
      const wsWindow = getWebSocketHookWindow();
      if (wsWindow?.__websocketReconnect) {
        wsWindow.__websocketReconnect();
      }
    } else {
      setUser(null);
      setStatus('unauthenticated');
      const wsWindow = getWebSocketHookWindow();
      if (wsWindow?.__websocketDisconnect) {
        wsWindow.__websocketDisconnect();
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  const login = useCallback(async ({ username, password, remember }: LoginParams): Promise<LoginResult> => {
    try {
      if (isDesktopRuntime) {
        setReady(true);
        return { success: true };
      }

      // P1 安全修复：登录请求需要 CSRF Token / P1 Security fix: Login needs CSRF token
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(withCsrfToken({ username, password, remember })),
      });

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        user?: AuthUser;
      };

      if (!response.ok || !data.success || !data.user) {
        let code: LoginErrorCode = 'unknown';
        if (response.status === 401) {
          code = 'invalidCredentials';
        } else if (response.status === 429) {
          code = 'tooManyAttempts';
        } else if (response.status >= 500) {
          code = 'serverError';
        }

        return {
          success: false,
          message: data?.message ?? 'Login failed',
          code,
        };
      }

      setUser(data.user);
      setStatus('authenticated');
      setReady(true);

      // Re-enable WebSocket reconnection after successful login (WebUI mode only)
      const wsWindow = getWebSocketHookWindow();
      if (wsWindow?.__websocketReconnect) {
        wsWindow.__websocketReconnect();
      }

      return { success: true };
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
        code: 'networkError',
      };
    }
  }, []);

  const register = useCallback(async ({ username, password }: RegisterParams): Promise<RegisterResult> => {
    try {
      if (isDesktopRuntime) {
        setReady(true);
        return { success: true };
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(withCsrfToken({ username, password })),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        message?: string;
        user?: AuthUser;
      };

      if (!response.ok || !data.success || !data.user) {
        let code: RegisterErrorCode = 'unknown';
        if (response.status === 409) {
          code = 'usernameTaken';
        } else if (response.status === 400) {
          code = 'validationError';
        } else if (response.status >= 500) {
          code = 'serverError';
        }

        return {
          success: false,
          message: data?.error ?? data?.message ?? 'Register failed',
          code,
        };
      }

      setUser(data.user);
      setStatus('authenticated');
      setReady(true);

      const wsWindow = getWebSocketHookWindow();
      if (wsWindow?.__websocketReconnect) {
        wsWindow.__websocketReconnect();
      }

      return { success: true };
    } catch (error) {
      console.error('Register request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
        code: 'networkError',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDesktopRuntime) {
      setUser(null);
      setStatus('authenticated');
      setReady(true);
      return;
    }

    try {
      await fetch('/logout', {
        method: 'POST',
        // Logout also needs CSRF token / 登出同样需要 CSRF Token
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(withCsrfToken({})),
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      const wsWindow = getWebSocketHookWindow();
      if (wsWindow?.__websocketDisconnect) {
        wsWindow.__websocketDisconnect();
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      status,
      login,
      register,
      logout,
      refresh,
    }),
    [login, logout, ready, refresh, register, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
