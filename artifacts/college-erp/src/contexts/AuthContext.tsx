import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, useLogin, User, LoginInput, useLogout, getGetMeQueryKey } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginInput & { rememberMe?: boolean }) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: string[]) => boolean;
  demoEnabled: boolean;
  switchDemoRole: (role: string) => Promise<User>;
  rememberMe: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_token') || sessionStorage.getItem('erp_token'));
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('erp_token')));
  const demoEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
  
  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { enabled: !!token, queryKey: getGetMeQueryKey() }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const clearSession = () => {
    localStorage.removeItem('erp_token');
    sessionStorage.removeItem('erp_token');
    localStorage.removeItem('erp_demo_session');
    setToken(null);
    queryClient.clear();
  };

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'erp_token' && !event.newValue) clearSession();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => clearSession();
    window.addEventListener("erp:session-expired", onSessionExpired);
    return () => window.removeEventListener("erp:session-expired", onSessionExpired);
  }, []);

  useEffect(() => {
    if (!token || isUserLoading || user) return;
    clearSession();
  }, [token, isUserLoading, user]);

  const login = async (data: LoginInput & { rememberMe?: boolean }) => {
    const { rememberMe: requestedRememberMe, ...credentials } = data;
    const res = await loginMutation.mutateAsync({ data: credentials });
    localStorage.removeItem('erp_token');
    sessionStorage.removeItem('erp_token');
    const storage = requestedRememberMe === false ? sessionStorage : localStorage;
    storage.setItem('erp_token', res.token);
    setRememberMe(requestedRememberMe !== false);
    setToken(res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      if (token) await logoutMutation.mutateAsync();
    } catch {
      // Local session cleanup and redirect must still happen if the server
      // session has already expired or the request is unavailable.
    } finally {
      clearSession();
    }
  };

  const switchDemoRole = async (role: string) => {
    if (!demoEnabled) throw new Error("Demo mode is disabled");
    const response = await fetch(`/api/demo/switch/${encodeURIComponent(role)}`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to switch demo role");
    localStorage.setItem("erp_token", result.token);
    sessionStorage.removeItem("erp_token");
    setToken(result.token);
    queryClient.setQueryData(getGetMeQueryKey(), result.user);
    await queryClient.invalidateQueries();
    return result.user as User;
  };

  const isLoading = isUserLoading && !!token;

  const currentUser = user || null;
  const hasPermission = (permission: string) => currentUser?.permissions?.includes(permission) ?? false;
  const isRole = (...roles: string[]) => currentUser ? roles.includes(currentUser.role) : false;

  return (
    <AuthContext.Provider value={{ user: currentUser, token, login, logout, isLoading, hasPermission, isRole, demoEnabled, switchDemoRole, rememberMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
