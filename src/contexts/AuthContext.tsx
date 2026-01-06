import { createContext, useContext, useMemo, useState, ReactNode } from "react";

interface AuthContextType {
  user: { email?: string } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Directus-token mode: we rely on VITE_DIRECTUS_TOKEN and do not use Supabase auth.
  // Later we can replace this with Directus login if needed.
  const [loading] = useState(false);
  const user = useMemo(() => ({ email: "directus-token" }), []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
