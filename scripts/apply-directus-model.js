/**
 * Apply a Directus "Data Model export" JSON to a running Directus instance.
 *
 * Why: Directus v11 UI may not expose "Import Data Model", but API always works.
 *
 * Usage:
 *   DIRECTUS_URL="https://directus.example.com" DIRECTUS_TOKEN="..." \
 *     node scripts/apply-directus-model.js directus/collections.crm-full.json
 *
 * Notes:
 * - Token should be an Admin user token.
 * - Script is idempotent-ish: creates missing collections/fields and skips existing.
 */

import fs from "node:fs/promises";
import path from "node:path";

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || "";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || process.env.VITE_DIRECTUS_TOKEN || "";

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!DIRECTUS_URL) die("Missing DIRECTUS_URL (ex: https://directus.yourdomain.com)");
if (!DIRECTUS_TOKEN) die("Missing DIRECTUS_TOKEN (Admin user token recommended)");

function joinUrl(base, p) {
  const b = base.replace(/\/+$/, "");
  const pp = p.startsWith("/") ? p : `/${p}`;
  return `${b}${pp}`;
}

async function api(method, p, body) {
  const url = joinUrl(DIRECTUS_URL, p);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  const data = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text || null;
    }
  })();

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && Array.isArray(data.errors) && data.errors[0]?.message) ||
      (data && typeof data === "object" && typeof data.message === "string" && data.message) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    const err = new Error(`${method} ${p} -> ${msg}`);
    err.status = res.status;
    err.payload = data;
    err.url = url;
    throw err;
  }

  return data;
}

async function listAllCollections() {
  // Avoid /collections/{collection} (some policies allow list but forbid detail)
  const res = await api("GET", "/collections?limit=1000");
  const data = Array.isArray(res?.data) ? res.data : [];
  return new Set(data.map((c) => c?.collection).filter(Boolean));
}

async function listCollectionFields(collection) {
  // Avoid /fields/{collection}/{field} (some policies forbid detail endpoint)
  const res = await api("GET", `/fields/${encodeURIComponent(collection)}`);
  const data = Array.isArray(res?.data) ? res.data : [];
  return new Set(data.map((f) => f?.field).filter(Boolean));
}

function normalizeFieldForDirectus(input) {
  const out = { ...input };

  // Directus m2o usually needs meta.special=["m2o"] + foreign_key_column
  const fkTable = out?.schema?.foreign_key_table;
  if (fkTable) {
    out.meta = { ...(out.meta || {}) };
    if (!Array.isArray(out.meta.special)) out.meta.special = ["m2o"];
    if (Array.isArray(out.meta.special) && !out.meta.special.includes("m2o")) out.meta.special.push("m2o");
    out.schema = { ...(out.schema || {}) };
    if (!out.schema.foreign_key_column) out.schema.foreign_key_column = "id";
  }

  return out;
}

async function main() {
  const modelPath = process.argv[2] || "directus/collections.crm-full.json";
  const abs = path.isAbsolute(modelPath) ? modelPath : path.join(process.cwd(), modelPath);
  const raw = await fs.readFile(abs, "utf8");
  const json = JSON.parse(raw);

  const collections = Array.isArray(json?.collections) ? json.collections : [];
  if (!collections.length) die(`No collections found in ${modelPath}`);

  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log(`Applying model from: ${modelPath}`);

  const existingCollections = await listAllCollections().catch((e) => {
    console.error("Failed to list collections:", e?.message || e);
    throw e;
  });

  for (const c of collections) {
    const name = c?.collection;
    if (!name) continue;

    const has = existingCollections.has(name);
    if (!has) {
      console.log(`+ create collection: ${name}`);
      await api("POST", "/collections", {
        collection: name,
        meta: c?.meta || {},
        schema: c?.schema || { name },
      });
      existingCollections.add(name);
    } else {
      console.log(`= collection exists: ${name}`);
    }

    let existingFields = new Set();
    try {
      existingFields = await listCollectionFields(name);
    } catch (e) {
      // If we can't list fields due to policies, we'll try to create them blindly.
      console.warn(`! could not list fields for ${name}: ${e?.message || e}`);
    }

    const fields = Array.isArray(c?.fields) ? c.fields : [];
    for (const f0 of fields) {
      const field = f0?.field;
      if (!field) continue;

      const f = normalizeFieldForDirectus(f0);
      const fExists = existingFields.size ? existingFields.has(field) : false;

      if (!fExists) {
        console.log(`  + field: ${name}.${field}`);
        try {
          await api("POST", `/fields/${encodeURIComponent(name)}`, {
            field: f.field,
            type: f.type,
            meta: f.meta || {},
            schema: f.schema || {},
          });
          existingFields.add(field);
        } catch (e) {
          // If we couldn't list fields, POST might fail because it already exists.
          // Don't fail the whole run on "already exists" scenarios.
          const msg = String(e?.message || "");
          if (msg.includes("already exists") || msg.includes("ALREADY_EXISTS") || e?.status === 409) {
            console.log(`  = field already exists: ${name}.${field}`);
          } else {
            throw e;
          }
        }
      } else {
        // Patch meta/schema only; avoid fighting Directus' internal system fields.
        console.log(`  = field exists: ${name}.${field}`);
      }
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("Failed:", e?.message || e);
  if (e?.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});

