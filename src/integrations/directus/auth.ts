import {
  clearDirectusSession,
  directusRequest,
  getDirectusRefreshToken,
  setDirectusAccessToken,
  setDirectusAccessExpiresAt,
  clearDirectusRefreshToken,
  setDirectusRefreshToken,
} from "@/integrations/directus/client";

export interface DirectusLoginResponse {
  data: {
    access_token: string;
    expires: number;
    refresh_token: string;
  };
}

export interface DirectusMeResponse {
  data: {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
  };
}

export async function directusLogin(email: string, password: string) {
  const res = await directusRequest<DirectusLoginResponse>("/auth/login", {
    method: "POST",
    skipAuth: true,
    // força modo JSON (tokens no body) para evitar depender de cookies
    body: JSON.stringify({ email, password, mode: "json" }),
  });

  const access = res?.data?.access_token || "";
  const refresh = res?.data?.refresh_token || "";
  if (!access) throw new Error("Login falhou (token em falta).");

  setDirectusAccessToken(access);
  setDirectusAccessExpiresAt(res?.data?.expires);
  if (refresh) setDirectusRefreshToken(refresh);

  return res;
}

export async function directusRefreshSession(): Promise<{ access_token: string } | null> {
  const refresh_token = getDirectusRefreshToken();
  if (!refresh_token) return null;

  try {
    // não usa Authorization; depende apenas do refresh_token
    const res = await directusRequest<DirectusLoginResponse>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ refresh_token, mode: "json" }),
    });

    const access = String(res?.data?.access_token || "").trim();
    const refresh = String(res?.data?.refresh_token || "").trim();
    if (access) setDirectusAccessToken(access);
    setDirectusAccessExpiresAt(res?.data?.expires);
    if (refresh) setDirectusRefreshToken(refresh);
    return access ? { access_token: access } : null;
  } catch (e: any) {
    // Se o refresh token expirou/invalidou, para de tentar (evita spam de 401 no console)
    const msg = String(e?.message || "");
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      clearDirectusRefreshToken();
      return null;
    }
    throw e;
  }
}

export async function directusLogout() {
  // Best effort: Directus supports /auth/logout, but we always clear local tokens.
  const refresh_token = getDirectusRefreshToken();
  await directusRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  }).catch(() => undefined);

  clearDirectusSession();
}

export async function directusMe() {
  return await directusRequest<DirectusMeResponse>("/users/me");
}

export async function directusPasswordRequest(email: string, reset_url: string) {
  await directusRequest("/auth/password/request", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, reset_url }),
  });
}

export async function directusPasswordReset(token: string, password: string) {
  await directusRequest("/auth/password/reset", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ token, password }),
  });
}

