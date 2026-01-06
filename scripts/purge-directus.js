/**
 * Purge Directus collections (DANGEROUS).
 *
 * Usage:
 *   DIRECTUS_URL=https://api.hotelequip.pt DIRECTUS_TOKEN=xxx node scripts/purge-directus.js --yes
 *   # or reuse Vite env names:
 *   VITE_DIRECTUS_URL=... VITE_DIRECTUS_TOKEN=... node scripts/purge-directus.js --yes
 *
 * Optional:
 *   node scripts/purge-directus.js --yes leads contactos interactions
 */

const yes = process.argv.includes("--yes");
const collections = process.argv.filter((a) => !a.startsWith("-")).slice(2);

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || process.env.VITE_DIRECTUS_TOKEN || "";

if (!yes) {
  console.error("Refusing to run without --yes (this deletes data).");
  process.exit(2);
}

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
  console.error("Missing DIRECTUS_URL/DIRECTUS_TOKEN (or VITE_* equivalents).");
  process.exit(2);
}

const defaultCollections = ["leads", "contactos", "interactions"];
const targetCollections = collections.length ? collections : defaultCollections;

function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${DIRECTUS_URL}${p}`;
}

async function req(path, init = {}) {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function listIds(collection, page, limit) {
  const qs = new URLSearchParams({
    fields: "id",
    limit: String(limit),
    page: String(page),
    sort: "-date_created",
  });
  const out = await req(`/items/${encodeURIComponent(collection)}?${qs.toString()}`);
  const data = out?.data || [];
  return data.map((x) => x.id).filter(Boolean);
}

async function deleteOne(collection, id) {
  await req(`/items/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}

async function purgeCollection(collection) {
  console.log(`\n== Purging ${collection} ==`);
  const limit = 100;
  let page = 1;
  let total = 0;

  while (true) {
    const ids = await listIds(collection, page, limit);
    if (!ids.length) break;

    // delete with small concurrency
    const concurrency = 6;
    for (let i = 0; i < ids.length; i += concurrency) {
      const chunk = ids.slice(i, i + concurrency);
      await Promise.all(chunk.map((id) => deleteOne(collection, id)));
      total += chunk.length;
      process.stdout.write(`\rdeleted: ${total}`);
    }

    // stay on same page because deletions shift pagination
  }

  console.log(`\nDone. Deleted ${total} items from ${collection}.`);
}

async function main() {
  console.log("Directus purge starting.");
  console.log(`URL: ${DIRECTUS_URL}`);
  console.log(`Collections: ${targetCollections.join(", ")}`);

  for (const c of targetCollections) {
    await purgeCollection(c);
  }

  console.log("\nAll done.");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  process.exit(1);
});

