type DirectusErrorPayload =
  | {
      errors?: Array<{
        message?: string;
        extensions?: { code?: string };
      }>;
    }
  | { error?: string; message?: string };

const DEFAULT_DIRECTUS_URL = "http://localhost:8055";

export const DIRECTUS_URL: string =
  import.meta.env.VITE_DIRECTUS_URL || DEFAULT_DIRECTUS_URL;

// Optional fallback token (service-token mode). Prefer user session token.
const DIRECTUS_FALLBACK_TOKEN: string = import.meta.env.VITE_DIRECTUS_TOKEN || "";

const DIRECTUS_ACCESS_TOKEN_STORAGE_KEY = "directus_access_token";
const DIRECTUS_REFRESH_TOKEN_STORAGE_KEY = "directus_refresh_token";

export function getDirectusAccessToken(): string {
  try {
    const t = localStorage.getItem(DIRECTUS_ACCESS_TOKEN_STORAGE_KEY) || "";
    return t.trim();
  } catch {
    return "";
  }
}

export function setDirectusAccessToken(token: string) {
  try {
    localStorage.setItem(DIRECTUS_ACCESS_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearDirectusAccessToken() {
  try {
    localStorage.removeItem(DIRECTUS_ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getDirectusRefreshToken(): string {
  try {
    const t = localStorage.getItem(DIRECTUS_REFRESH_TOKEN_STORAGE_KEY) || "";
    return t.trim();
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

export function clearDirectusSession() {
  clearDirectusAccessToken();
  clearDirectusRefreshToken();
}

export function getDirectusTokenForRequest(): string {
  return getDirectusAccessToken() || DIRECTUS_FALLBACK_TOKEN || "";
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export function directusApiUrl(path: string) {
  return joinUrl(DIRECTUS_URL, path);
}

export async function directusRequest<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...rest } = init;

  const token = skipAuth ? "" : getDirectusTokenForRequest();
  if (!skipAuth && !token) throw new Error("Sem sessão. Faça login para continuar.");

  const res = await fetch(directusApiUrl(path), {
    ...rest,
    headers: (() => {
      const h = new Headers(rest.headers);
      h.set("Content-Type", h.get("Content-Type") || "application/json");
      if (!skipAuth) h.set("Authorization", `Bearer ${token}`);
      return h;
    })(),
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body: unknown = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    // If the session is invalid, clear stored tokens to avoid endless 401 loops.
    if (!skipAuth && res.status === 401) {
      // Only clear on 401 (invalid/expired session). 403 is commonly a permissions issue and
      // clearing the session causes annoying "logout loops" on refresh.
      clearDirectusSession();
    }
    const payload = (body || {}) as DirectusErrorPayload;
    const message = (() => {
      if (typeof body === "string" && body.trim()) return body;
      const first = (payload as { errors?: Array<{ message?: string }> }).errors?.[0]?.message;
      if (first) return first;
      if ("message" in payload && typeof payload.message === "string") return payload.message;
      if ("error" in payload && typeof payload.error === "string") return payload.error;
      return `Directus request failed (${res.status})`;
    })();
    throw new Error(message);
  }

  return body as T;
}

