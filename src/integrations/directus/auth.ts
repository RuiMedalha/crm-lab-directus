import {
  clearDirectusAccessToken,
  directusRequest,
  setDirectusAccessToken,
} from "@/integrations/directus/client";

const DIRECTUS_REFRESH_TOKEN_STORAGE_KEY = "directus_refresh_token";

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

export function getDirectusRefreshToken(): string {
  try {
    return (localStorage.getItem(DIRECTUS_REFRESH_TOKEN_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setDirectusRefreshToken(token: string) {
  try {
    localStorage.setItem(DIRECTUS_REFRESH_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearDirectusRefreshToken() {
  try {
    localStorage.removeItem(DIRECTUS_REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function directusLogin(email: string, password: string) {
  const res = await directusRequest<DirectusLoginResponse>("/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });

  const access = res?.data?.access_token || "";
  const refresh = res?.data?.refresh_token || "";
  if (!access) throw new Error("Login falhou (token em falta).");

  setDirectusAccessToken(access);
  if (refresh) setDirectusRefreshToken(refresh);

  return res;
}

export async function directusLogout() {
  // Best effort: Directus supports /auth/logout, but we always clear local tokens.
  const refresh_token = getDirectusRefreshToken();
  await directusRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  }).catch(() => undefined);

  clearDirectusAccessToken();
  clearDirectusRefreshToken();
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

