import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string; // Derived or field
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to fetch current user
async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_DIRECTUS_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("directus_token")}`
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("directus_token");
      if (token) {
        const userData = await fetchMe();
        if (userData) {
          setUser(userData);
        } else {
          // Token invalid
          localStorage.removeItem("directus_token");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_DIRECTUS_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || "Login failed");
      }

      const token = data.data.access_token;
      localStorage.setItem("directus_token", token);

      // Fetch user details
      const userData = await fetchMe();
      setUser(userData);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Directus usually doesn't have public registration open by default like Supabase
    // We will implement a basic creation if allowed or return error
    return { error: new Error("Registo público desativado. Contacte o administrador.") };
  };

  const signOut = async () => {
    localStorage.removeItem("directus_token");
    setUser(null);
    // Optional: Call /auth/logout if using refresh tokens
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
