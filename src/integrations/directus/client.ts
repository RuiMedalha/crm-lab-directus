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

// Requested token (can be overridden via env)
export const DIRECTUS_TOKEN: string = import.meta.env.VITE_DIRECTUS_TOKEN || "";

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

  if (!skipAuth && !DIRECTUS_TOKEN) {
    throw new Error("Missing Directus token (VITE_DIRECTUS_TOKEN).");
  }

  const res = await fetch(directusApiUrl(path), {
    ...rest,
    headers: (() => {
      const h = new Headers(rest.headers);
      h.set("Content-Type", h.get("Content-Type") || "application/json");

      if (!skipAuth) {
        // Priority: Passed token (not impl here but consistent with rest) -> LocalStorage -> Env
        const localToken = localStorage.getItem("directus_token");
        const token = localToken || DIRECTUS_TOKEN;

        if (token) {
          h.set("Authorization", `Bearer ${token}`);
        }
      }
      return h;
    })(),
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body: unknown = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
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

