import { createContext, useContext, useState, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import type { GetMeResponse } from "@workspace/api-client-react";

// Initialise synchronously at module load — this guarantees the Authorization
// header is present on the very first React Query fetch, before any useEffect
// has had a chance to run.
setAuthTokenGetter(() => localStorage.getItem("bettz_token"));

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

// Separate inner component so it can read `token` from context and pass it to
// useGetMe's `enabled` flag — this means the query automatically re-fires when
// the user logs in (token changes) without needing a full page reload.
function AuthConsumer({ children }: { children: ReactNode }) {
  const ctx = useContext(AuthContext);
  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!ctx.token },
  });

  return (
    <AuthContext.Provider value={{ ...ctx, user: user ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem("bettz_token")
  );

  const setToken = (t: string | null) => {
    if (t) {
      localStorage.setItem("bettz_token", t);
    } else {
      localStorage.removeItem("bettz_token");
    }
    setTokenState(t);
  };

  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ user: null, token, setToken, logout, isLoading: false }}>
      <AuthConsumer>{children}</AuthConsumer>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
