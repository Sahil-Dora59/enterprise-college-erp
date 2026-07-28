import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useGetMe, useLogin, User, LoginInput, useLogout, getGetMeQueryKey } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginInput) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  
  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { enabled: !!token, queryKey: getGetMeQueryKey() }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem('erp_token', res.token);
    setToken(res.token);
  };

  const logout = async () => {
    try {
      if (token) await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem('erp_token');
      setToken(null);
    }
  };

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider value={{ user: user || null, token, login, logout, isLoading }}>
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
