import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import type { GetMeResponse } from "@workspace/api-client-react";

type User = GetMeResponse;

interface AuthContextType {
  user: User | null;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  setToken: () => {},
  logout: () => {},
  isLoading: false,
});

function AuthConsumer({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!localStorage.getItem("bettz_token") },
  });

  return (
    <AuthContext.Consumer>
      {(ctx) => (
        <AuthContext.Provider value={{ ...ctx, user: user ?? null, isLoading }}>
          {children}
        </AuthContext.Provider>
      )}
    </AuthContext.Consumer>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem("bettz_token")
  );

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("bettz_token"));
  }, []);

  const setToken = (t: string | null) => {
    if (t) {
      localStorage.setItem("bettz_token", t);
    } else {
      localStorage.removeItem("bettz_token");
    }
    setTokenState(t);
    setAuthTokenGetter(() => localStorage.getItem("bettz_token"));
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user: null, token, setToken, logout, isLoading: false }}>
      <AuthConsumer>{children}</AuthConsumer>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
