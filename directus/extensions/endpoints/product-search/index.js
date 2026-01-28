/**
 * Directus Endpoint Extension: /product-search
 *
 * Purpose:
 * - Search products from the CRM without browser CORS issues
 * - Keep secrets server-side (Meilisearch key / Woo keys)
 *
 * Request:
 *   POST /product-search
 *   Body: { q: string, limit?: number }
 *
 * Response:
 *   { data: Array<{ id, name, title?, sku, price, cost?, description?, category?, image_url?, link? }> }
 *
 * Env vars (optional):
 * - MEILISEARCH_HOST (ex: https://meili.yourdomain.com)
 * - MEILISEARCH_API_KEY
 * - MEILISEARCH_INDEX (default: products_stage)
 *
 * - WOO_URL (ex: https://loja.exemplo.com)
 * - WOO_CONSUMER_KEY
 * - WOO_CONSUMER_SECRET
 */

function envStr(env, key, fallback = "") {
  const v = env?.[key];
  return v === undefined || v === null ? fallback : String(v);
}

function toNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProduct(p) {
  if (!p) return null;
  const id = p.id !== undefined && p.id !== null ? String(p.id) : "";
  const sku = String(p.sku || "");
  const title = p.title || p.name || "";
  const name = p.name || p.title || title;
  const price = toNumber(p.price ?? p.regular_price ?? p.sale_price ?? 0, 0);
  const cost = p.cost !== undefined ? toNumber(p.cost, undefined) : undefined;
  const description = p.description || p.short_description || p.content || null;
  const category =
    (Array.isArray(p.categories) && p.categories[0]?.name) ||
    p.category ||
    null;
  const image_url =
    (Array.isArray(p.images) && p.images[0]?.src) ||
    p.featured_media_url ||
    p.image_url ||
    p.media_url ||
    null;
  const link = p.permalink || p.link || null;
  return {
    id,
    name,
    title,
    sku,
    price,
    ...(cost !== undefined ? { cost } : {}),
    ...(description ? { description } : {}),
    ...(category ? { category } : {}),
    ...(image_url ? { image_url } : {}),
    ...(link ? { link } : {}),
  };
}

async function searchMeilisearch({ env, q, limit }) {
  const host = envStr(env, "MEILISEARCH_HOST");
  if (!host) return null;
  const key = envStr(env, "MEILISEARCH_API_KEY");
  const index = envStr(env, "MEILISEARCH_INDEX", "products_stage");

  const url = `${host.replace(/\/+$/, "")}/indexes/${encodeURIComponent(index)}/search`;
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      q,
      limit: Math.min(Math.max(Number(limit || 20), 1), 50),
      attributesToRetrieve: [
        "id",
        "name",
        "title",
        "sku",
        "price",
        "cost",
        "description",
        "content",
        "category",
        "image_url",
        "featured_media_url",
        "media_url",
        "link",
      ],
    }),
  });
  if (!res.ok) throw new Error(`Meilisearch HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  const hits = Array.isArray(json?.hits) ? json.hits : [];
  return hits.map(normalizeProduct).filter(Boolean);
}

async function searchWoo({ env, q, limit }) {
  const base = envStr(env, "WOO_URL");
  const ck = envStr(env, "WOO_CONSUMER_KEY");
  const cs = envStr(env, "WOO_CONSUMER_SECRET");
  if (!base || !ck || !cs) return null;

  const perPage = Math.min(Math.max(Number(limit || 20), 1), 50);
  const qs = new URLSearchParams();
  qs.set("per_page", String(perPage));
  // Woo supports either search (name) or sku filter depending on extensions; we try both.
  qs.set("search", q);
  qs.set("sku", q);
  qs.set("consumer_key", ck);
  qs.set("consumer_secret", cs);

  const url = `${base.replace(/\/+$/, "")}/wp-json/wc/v3/products?${qs.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`WooCommerce HTTP ${res.status}`);
  const data = await res.json().catch(() => []);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(normalizeProduct).filter(Boolean);
}

export default (router, { exceptions, env }) => {
  const { InvalidPayloadException, ServiceUnavailableException } = exceptions;

  router.post("/", async (req, res) => {
    const q = String(req?.body?.q || "").trim();
    const limit = Number(req?.body?.limit || 20);
    if (!q) throw new InvalidPayloadException("q em falta");

    try {
      const meili = await searchMeilisearch({ env, q, limit }).catch(() => null);
      if (meili && meili.length) return res.json({ data: meili });

      const woo = await searchWoo({ env, q, limit }).catch(() => null);
      if (woo && woo.length) return res.json({ data: woo });

      // If configured but empty, still return empty list.
      return res.json({ data: [] });
    } catch (e) {
      throw new ServiceUnavailableException(`Falha na pesquisa de produtos: ${e?.message || e}`);
    }
  });
};

