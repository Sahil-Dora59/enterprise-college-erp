import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, useLogin, User, LoginInput, useLogout, getGetMeQueryKey } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: string[]) => boolean;
  demoEnabled: boolean;
  switchDemoRole: (role: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  const demoEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
  
  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { enabled: !!token, queryKey: getGetMeQueryKey() }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem('erp_token', res.token);
    setToken(res.token);
    return res.user;
  };

  const logout = async () => {
    try {
      if (token) await logoutMutation.mutateAsync();
    } catch {
      // Local session cleanup and redirect must still happen if the server
      // session has already expired or the request is unavailable.
    } finally {
      localStorage.removeItem('erp_token');
      setToken(null);
    }
  };

  const switchDemoRole = async (role: string) => {
    if (!demoEnabled) throw new Error("Demo mode is disabled");
    const response = await fetch(`/api/demo/switch/${encodeURIComponent(role)}`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to switch demo role");
    localStorage.setItem("erp_token", result.token);
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
    <AuthContext.Provider value={{ user: currentUser, token, login, logout, isLoading, hasPermission, isRole, demoEnabled, switchDemoRole }}>
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
