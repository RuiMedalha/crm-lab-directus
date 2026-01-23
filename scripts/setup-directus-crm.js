/**
 * Setup Directus CRM schema + permissions (idempotent).
 *
 * What it does:
 * - Ensures `follow_ups` collection exists (and creates its fields)
 * - Ensures `deals` has: owner_employee_id, assigned_employee_id, assigned_by_employee_id, assigned_at
 * - Ensures CRM role permissions:
 *   - follow_ups: read/create/update/share (fields "*")
 *   - employees: read (fields "*")
 *   - deals: read/update include new assignment fields (merges if needed)
 *   - quotations: read includes tracking/pdf fields that commonly 403
 *
 * Usage (run from VPS or anywhere with network access):
 *   DIRECTUS_URL="https://api.hotelequip.pt" DIRECTUS_TOKEN="ADMIN_TOKEN" \
 *   CRM_ROLE_NAME="CRM" node scripts/setup-directus-crm.js --yes
 *
 * Optional:
 *   SNAPSHOT_FILE="directus/collections.crm-full.json"
 *   CRM_ROLE_ID="xxxxxxxx-...."   # if you prefer role id instead of name
 */

const yes = process.argv.includes("--yes");
if (!yes) {
  console.error("Refusing to run without --yes (this changes Directus schema/permissions).");
  process.exit(2);
}

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || "").replace(/\/+$/, "");
let DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || process.env.VITE_DIRECTUS_TOKEN || "";
const SNAPSHOT_FILE = process.env.SNAPSHOT_FILE || "directus/collections.crm-full.json";
const CRM_ROLE_NAME = process.env.CRM_ROLE_NAME || "CRM";
const CRM_ROLE_ID = process.env.CRM_ROLE_ID || "";
const DIRECTUS_EMAIL = process.env.DIRECTUS_EMAIL || "";
const DIRECTUS_PASSWORD = process.env.DIRECTUS_PASSWORD || "";
const FORCE_LOGIN = String(process.env.FORCE_LOGIN || "") === "1";

if (!DIRECTUS_URL) {
  console.error("Missing DIRECTUS_URL (or VITE_DIRECTUS_URL).");
  process.exit(2);
}

// Some VPS have flaky IPv4/IPv6 routing via Cloudflare; allow forcing DNS result order.
// Usage:
//   DNS_IPV6FIRST=1 node scripts/setup-directus-crm.js --yes
//   DNS_IPV4FIRST=1 node scripts/setup-directus-crm.js --yes
if (String(process.env.DNS_IPV6FIRST || "") === "1" || String(process.env.DNS_IPV4FIRST || "") === "1") {
  const order = String(process.env.DNS_IPV4FIRST || "") === "1" ? "ipv4first" : "ipv6first";
  try {
    const dns = await import("node:dns");
    if (typeof dns.setDefaultResultOrder === "function") dns.setDefaultResultOrder(order);
    console.log(`DNS result order: ${order}`);
  } catch {
    // ignore
  }
}

function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${DIRECTUS_URL}${p}`;
}

async function loginIfNeeded() {
  if (!DIRECTUS_EMAIL || !DIRECTUS_PASSWORD) return;
  if (DIRECTUS_TOKEN && !FORCE_LOGIN) return;

  console.log(`Logging in as ${DIRECTUS_EMAIL}...`);
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DIRECTUS_EMAIL, password: DIRECTUS_PASSWORD }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || body?.message || `Login failed (${res.status})`;
    throw new Error(msg);
  }
  const token = body?.data?.access_token;
  if (!token) throw new Error("Login succeeded but access_token missing.");
  DIRECTUS_TOKEN = String(token);
}

async function req(path, init = {}) {
  await loginIfNeeded();
  if (!DIRECTUS_TOKEN) {
    throw new Error("Missing DIRECTUS_TOKEN (or VITE_DIRECTUS_TOKEN). If you have admin credentials, set DIRECTUS_EMAIL/DIRECTUS_PASSWORD.");
  }
  const url = apiUrl(path);
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    // Undici (Node fetch) wraps network failures; expose root cause.
    const cause = e?.cause || e;
    const details = [
      `Fetch failed: ${url}`,
      cause?.code ? `code=${cause.code}` : null,
      cause?.errno ? `errno=${cause.errno}` : null,
      cause?.address ? `address=${cause.address}` : null,
      cause?.port ? `port=${cause.port}` : null,
      cause?.message ? `message=${cause.message}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    const err = new Error(details);
    err.cause = e;
    throw err;
  }

  const text = await res.text();
  const json = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

async function tryGet(path) {
  try {
    return await req(path);
  } catch (e) {
    if (e?.status === 404) return null;
    throw e;
  }
}

function pickCollection(snapshot, name) {
  const col = (snapshot?.collections || []).find((c) => c?.collection === name);
  if (!col) throw new Error(`Snapshot missing collection "${name}"`);
  return col;
}

async function ensureCollection(collectionDef) {
  const name = String(collectionDef.collection);
  const existing = await tryGet(`/collections/${encodeURIComponent(name)}`);
  if (existing) return existing;

  console.log(`Creating collection: ${name}`);
  return await req(`/collections`, {
    method: "POST",
    body: JSON.stringify({
      collection: name,
      meta: collectionDef.meta || {},
      schema: collectionDef.schema || { name },
    }),
  });
}

async function ensureField(collection, fieldDef) {
  const col = String(collection);
  const field = String(fieldDef.field);
  const existing = await tryGet(`/fields/${encodeURIComponent(col)}/${encodeURIComponent(field)}`);
  if (existing) return existing;

  console.log(`Creating field: ${col}.${field}`);
  return await req(`/fields/${encodeURIComponent(col)}`, {
    method: "POST",
    body: JSON.stringify({
      field,
      type: fieldDef.type,
      meta: fieldDef.meta || {},
      schema: fieldDef.schema || {},
    }),
  });
}

async function getOrCreateRoleId() {
  if (CRM_ROLE_ID) return CRM_ROLE_ID;

  const out = await req(
    `/roles?${new URLSearchParams({
      limit: "1",
      fields: "id,name",
      "filter[name][_eq]": CRM_ROLE_NAME,
    }).toString()}`
  );
  const role = out?.data?.[0];
  if (role?.id) return role.id;

  console.log(`Creating role: ${CRM_ROLE_NAME}`);
  const created = await req(`/roles`, {
    method: "POST",
    body: JSON.stringify({ name: CRM_ROLE_NAME }),
  });
  return created?.data?.id;
}

async function getPermission(roleId, collection, action) {
  const out = await req(
    `/permissions?${new URLSearchParams({
      limit: "1",
      fields: "id,role,collection,action,fields",
      "filter[role][_eq]": roleId,
      "filter[collection][_eq]": collection,
      "filter[action][_eq]": action,
    }).toString()}`
  );
  return out?.data?.[0] || null;
}

function mergeFields(existingFields, requiredFields) {
  if (!existingFields) return requiredFields;
  if (existingFields === "*" || (Array.isArray(existingFields) && existingFields.includes("*"))) return "*";
  if (!Array.isArray(existingFields)) return requiredFields;
  const set = new Set(existingFields);
  for (const f of requiredFields) set.add(f);
  return Array.from(set);
}

async function upsertPermission({ roleId, collection, action, fields, mergeWithExisting = false }) {
  const existing = await getPermission(roleId, collection, action);
  if (!existing) {
    console.log(`Creating permission: ${collection}.${action}`);
    return await req(`/permissions`, {
      method: "POST",
      body: JSON.stringify({
        role: roleId,
        collection,
        action,
        fields,
        permissions: {},
        validation: {},
        presets: {},
      }),
    });
  }

  const nextFields = mergeWithExisting ? mergeFields(existing.fields, Array.isArray(fields) ? fields : [fields]) : fields;
  const same = JSON.stringify(existing.fields) === JSON.stringify(nextFields);
  if (same) return existing;

  console.log(`Updating permission fields: ${collection}.${action}`);
  return await req(`/permissions/${encodeURIComponent(existing.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: nextFields }),
  });
}

async function main() {
  console.log("Directus CRM setup starting.");
  console.log(`URL: ${DIRECTUS_URL}`);
  console.log(`Snapshot: ${SNAPSHOT_FILE}`);

  const fs = await import("node:fs/promises");
  const snapshot = JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf8"));

  // 1) Schema
  const deals = pickCollection(snapshot, "deals");
  const followUps = pickCollection(snapshot, "follow_ups");

  await ensureCollection(followUps);

  // Create follow_ups fields
  for (const f of followUps.fields || []) {
    await ensureField("follow_ups", f);
  }

  // Ensure deals assignment fields
  const dealAssignmentFields = new Set([
    "owner_employee_id",
    "assigned_employee_id",
    "assigned_by_employee_id",
    "assigned_at",
  ]);
  for (const f of deals.fields || []) {
    if (dealAssignmentFields.has(String(f.field))) {
      await ensureField("deals", f);
    }
  }

  // 2) Permissions
  const roleId = await getOrCreateRoleId();
  if (!roleId) throw new Error("Could not resolve/create CRM role id");
  console.log(`CRM role id: ${roleId}`);

  // follow_ups full access needed by CRM app
  for (const action of ["read", "create", "update", "share"]) {
    await upsertPermission({ roleId, collection: "follow_ups", action, fields: "*" });
  }

  // employees read needed to resolve assignments
  await upsertPermission({ roleId, collection: "employees", action: "read", fields: "*" });

  // deals: ensure the new fields are readable/updatable even if role uses a field allowlist
  const requiredDealFields = [
    "owner_employee_id",
    "assigned_employee_id",
    "assigned_by_employee_id",
    "assigned_at",
  ];
  await upsertPermission({
    roleId,
    collection: "deals",
    action: "read",
    fields: requiredDealFields,
    mergeWithExisting: true,
  });
  await upsertPermission({
    roleId,
    collection: "deals",
    action: "update",
    fields: requiredDealFields,
    mergeWithExisting: true,
  });

  // quotations: avoid 403 when requesting these fields (common)
  const requiredQuotationFields = [
    "sent_to_email",
    "sent_at",
    "follow_up_at",
    "follow_up_notes",
    "pdf_file",
    "pdf_link",
  ];
  await upsertPermission({
    roleId,
    collection: "quotations",
    action: "read",
    fields: requiredQuotationFields,
    mergeWithExisting: true,
  });

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  // Print extra debug info if present
  if (e?.cause) console.error("CAUSE:", e.cause);
  process.exit(1);
});

