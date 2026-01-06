interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Directus-token mode: no Supabase auth gate.
  return <>{children}</>;
}
