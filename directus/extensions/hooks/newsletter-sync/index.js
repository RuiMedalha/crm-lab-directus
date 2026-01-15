/**
 * Directus Hook: newsletter-sync
 *
 * Mantém campos de newsletter/cupões sincronizados entre:
 * - contacts
 * - newsletter_subscriptions
 *
 * Regra simples (upsert):
 * - Preferir email (lowercase)
 * - Fallback para phone (opcional)
 */

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").trim();
}

export default ({ action }, { services, getSchema }) => {
  const { ItemsService } = services;

  const SYNC_FIELDS = [
    // identity
    "email",
    "phone",
    "firstname",
    "lastname",
    "full_name",
    // marketing
    "whatsapp_opt_in",
    "newsletter_source",
    "status",
    "created_at",
    "last_seen_at",
    "newsletter_notes",
    // coupon
    "coupon_code",
    "coupon_wc_id",
    "coupon_expires_at",
    // integrations
    "mautic_contact_id",
    "chatwoot_contact_id",
  ];

  function eq(a, b) {
    // treat null/undefined as equal
    if (a === undefined || a === null) return b === undefined || b === null;
    if (b === undefined || b === null) return false;
    return a === b;
  }

  function hasDiff(existing, next) {
    for (const k of Object.keys(next || {})) {
      if (!eq(existing?.[k], next?.[k])) return true;
    }
    return false;
  }

  async function upsertIdentityMap(identityMapService, input) {
    const email_normalized = normalizeEmail(input.email_normalized);
    const phone_e164 = normalizePhone(input.phone_e164);
    if (!email_normalized && !phone_e164) return null;

    const filter = {
      _or: [
        ...(email_normalized ? [{ email_normalized: { _eq: email_normalized } }] : []),
        ...(phone_e164 ? [{ phone_e164: { _eq: phone_e164 } }] : []),
      ],
    };

    const existing = await identityMapService
      .readByQuery({
        limit: 1,
        filter,
        sort: ["-date_updated", "-date_created", "-id"],
        fields: ["id", "email_normalized", "phone_e164", "directus_contact_id", "subscription_id", "confidence", "matched_by", "last_verified_at"],
      })
      .then((r) => (Array.isArray(r) ? r[0] : null))
      .catch(() => null);

    const payload = {
      ...input,
      email_normalized: email_normalized || null,
      phone_e164: phone_e164 || null,
    };

    if (existing?.id) {
      if (!hasDiff(existing, payload)) return existing;
      return await identityMapService.updateOne(existing.id, payload).catch(() => null);
    }
    return await identityMapService.createOne(payload).catch(() => null);
  }

  async function findByEmailOrPhone(itemsService, email, phone) {
    const filter = {
      _or: [
        ...(email ? [{ email: { _eq: email } }] : []),
        ...(phone ? [{ phone: { _eq: phone } }] : []),
      ],
    };
    const existing = await itemsService
      .readByQuery({ limit: 1, filter, sort: ["-date_updated", "-date_created", "-id"], fields: ["id", ...SYNC_FIELDS] })
      .then((r) => (Array.isArray(r) ? r[0] : null))
      .catch(() => null);
    return existing;
  }

  async function upsertByEmailOrPhone(itemsService, input) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (!email && !phone) return null;

    const existing = await findByEmailOrPhone(itemsService, email, phone);
    const payload = { ...input, ...(email ? { email } : {}), ...(phone ? { phone } : {}) };

    if (existing?.id) {
      // Loop prevention: if nothing changes, skip update.
      if (!hasDiff(existing, payload)) return existing;
      return await itemsService.updateOne(existing.id, payload).catch(() => null);
    }
    return await itemsService.createOne(payload).catch(() => null);
  }

  async function syncContactsToNewsletter({ accountability, key, payload }) {
    if (!payload) return;
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    if (!email && !phone) return;

    const schema = await getSchema({ accountability });
    const subs = new ItemsService("newsletter_subscriptions", { schema, accountability });
    const identityMap = new ItemsService("newsletter_identity_map", { schema, accountability });

    // Map contacts.newsletter_source -> subs.source
    const base = pick({ ...payload, email, phone }, SYNC_FIELDS);
    const toWrite = {
      ...base,
      source: payload.newsletter_source || payload.source || null,
      notes: payload.newsletter_notes || null,
    };

    const saved = await upsertByEmailOrPhone(subs, toWrite);
    if (saved?.id) {
      const matched_by = email && phone ? "both" : email ? "email" : "phone";
      const confidence = email && phone ? 90 : email ? 80 : 70;
      await upsertIdentityMap(identityMap, {
        email_normalized: email || null,
        phone_e164: phone || null,
        directus_contact_id: String(key || payload.id || ""),
        subscription_id: saved.id,
        matched_by,
        confidence,
        last_verified_at: new Date().toISOString(),
      }).catch(() => null);
    }
  }

  async function syncNewsletterToContacts({ accountability, key, payload }) {
    if (!payload) return;
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    if (!email && !phone) return;

    const schema = await getSchema({ accountability });
    const contacts = new ItemsService("contacts", { schema, accountability });
    const identityMap = new ItemsService("newsletter_identity_map", { schema, accountability });

    const base = pick({ ...payload, email, phone }, SYNC_FIELDS);
    const toWrite = {
      ...base,
      newsletter_source: payload.source || payload.newsletter_source || null,
      newsletter_notes: payload.notes || payload.newsletter_notes || null,
      // Keep the legacy field for UI consistency
      subscribed_at: payload.created_at || payload.subscribed_at || null,
    };

    const saved = await upsertByEmailOrPhone(contacts, toWrite);
    if (saved?.id) {
      const matched_by = email && phone ? "both" : email ? "email" : "phone";
      const confidence = email && phone ? 90 : email ? 80 : 70;
      await upsertIdentityMap(identityMap, {
        email_normalized: email || null,
        phone_e164: phone || null,
        directus_contact_id: String(saved.id),
        subscription_id: String(key || payload.id || ""),
        matched_by,
        confidence,
        last_verified_at: new Date().toISOString(),
      }).catch(() => null);
    }
  }

  // Contacts -> newsletter_subscriptions
  action("items.create", async (meta) => {
    if (meta?.collection !== "contacts") return;
    await syncContactsToNewsletter(meta);
  });
  action("items.update", async (meta) => {
    if (meta?.collection !== "contacts") return;
    await syncContactsToNewsletter(meta);
  });

  // newsletter_subscriptions -> contacts
  action("items.create", async (meta) => {
    if (meta?.collection !== "newsletter_subscriptions") return;
    await syncNewsletterToContacts(meta);
  });
  action("items.update", async (meta) => {
    if (meta?.collection !== "newsletter_subscriptions") return;
    await syncNewsletterToContacts(meta);
  });
};

