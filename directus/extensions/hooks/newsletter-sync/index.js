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
    "email",
    "phone",
    "full_name",
    "whatsapp_opt_in",
    "coupon_code",
    "coupon_wc_id",
    "coupon_expires_at",
    "mautic_contact_id",
    "chatwoot_contact_id",
    "status",
    "created_at",
    "last_seen_at",
    "source",
  ];

  async function upsertByEmailOrPhone(itemsService, input) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const filter = email ? { email: { _eq: email } } : phone ? { phone: { _eq: phone } } : null;
    if (!filter) return null;

    const existing = await itemsService
      .readByQuery({ limit: 1, filter, fields: ["id"] })
      .then((r) => (Array.isArray(r) ? r[0] : null))
      .catch(() => null);

    const payload = { ...input, ...(email ? { email } : {}) };

    if (existing?.id) {
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
    const toWrite = pick({ ...payload, email, phone }, SYNC_FIELDS);
    await upsertByEmailOrPhone(subs, toWrite);
  }

  async function syncNewsletterToContacts({ accountability, key, payload }) {
    if (!payload) return;
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    if (!email && !phone) return;

    const schema = await getSchema({ accountability });
    const contacts = new ItemsService("contacts", { schema, accountability });
    const toWrite = pick({ ...payload, email, phone }, SYNC_FIELDS);
    await upsertByEmailOrPhone(contacts, toWrite);
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

