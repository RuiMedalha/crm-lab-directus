import crypto from "node:crypto";

/**
 * Directus Hook: orcamento-automation
 *
 * Triggers outbound webhooks to n8n when quotation status changes.
 *
 * - status: "sent"     -> N8N_WEBHOOK_QUOTATION_SENT
 * - status: "approved" -> N8N_WEBHOOK_QUOTATION_APPROVED
 *
 * Payload includes:
 * - quotation (full)
 * - customer moloni_client_id
 * - items with supplier_email + manual_entry
 * - pdf_url (generated endpoint url)
 */

function envStr(env, key, fallback = "") {
  const v = env?.[key];
  return (v === undefined || v === null) ? fallback : String(v);
}

function signPayload(secret, body) {
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export default ({ filter, action }, { services, exceptions, env, getSchema, logger }) => {
  const { ItemsService } = services;

  action("items.update", async (meta, ctx) => {
    try {
      if (meta.collection !== "quotations") return;
      const keys = Array.isArray(meta.keys) ? meta.keys : [];
      if (!keys.length) return;

      const schema = await getSchema({ accountability: ctx.accountability });
      const quotations = new ItemsService("quotations", { schema, accountability: ctx.accountability });
      const quotationItems = new ItemsService("quotation_items", { schema, accountability: ctx.accountability });
      const contacts = new ItemsService("contacts", { schema, accountability: ctx.accountability });

      for (const id of keys) {
        // Read latest quotation with status
        const q = await quotations.readOne(id, {
          fields: ["id", "quotation_number", "status", "deal_id", "customer_id", "total_amount", "subtotal", "valid_until", "notes", "terms_conditions", "date_created", "date_updated"],
        });
        if (!q) continue;

        const nextStatus = String(q.status || "");
        if (!["sent", "approved"].includes(nextStatus)) continue;

        const webhookUrl =
          nextStatus === "sent"
            ? envStr(env, "N8N_WEBHOOK_QUOTATION_SENT")
            : envStr(env, "N8N_WEBHOOK_QUOTATION_APPROVED");
        if (!webhookUrl) {
          logger.warn(`[orcamento-automation] Missing webhook url for status=${nextStatus}`);
          continue;
        }

        const items = await quotationItems.readByQuery({
          filter: { quotation_id: { _eq: id } },
          limit: 2000,
          sort: ["sort_order", "id"],
          fields: [
            "id",
            "product_id",
            "product_name",
            "sku",
            "quantity",
            "unit_price",
            "iva_percent",
            "line_total",
            "supplier_email",
            "manual_entry",
            "ficha_tecnica_url",
          ],
        });

        const customer = q.customer_id
          ? await contacts.readOne(q.customer_id, { fields: ["id", "company_name", "email", "phone", "moloni_client_id"] }).catch(() => null)
          : null;

        const publicUrl = envStr(env, "PUBLIC_URL", "http://localhost:8055").replace(/\/+$/, "");
        const pdfUrl = `${publicUrl}/gerar-pdf/${encodeURIComponent(String(id))}`;

        const payload = {
          event: "quotation.status_changed",
          status: nextStatus,
          pdf_url: pdfUrl,
          quotation: q,
          customer: customer
            ? {
                id: customer.id,
                company_name: customer.company_name,
                email: customer.email,
                phone: customer.phone,
                moloni_client_id: customer.moloni_client_id,
              }
            : null,
          items: (items || []).map((it) => ({
            id: it.id,
            product_id: it.product_id || null,
            product_name: it.product_name || null,
            sku: it.sku || null,
            quantity: it.quantity || 0,
            unit_price: it.unit_price || 0,
            iva_percent: it.iva_percent ?? 0,
            line_total: it.line_total || 0,
            fornecedor_email: it.supplier_email || null,
            manual_entry: !!it.manual_entry,
            ficha_tecnica_url: it.ficha_tecnica_url || null,
          })),
        };

        const body = JSON.stringify(payload);
        const secret = envStr(env, "N8N_WEBHOOK_SHARED_SECRET");
        const sig = signPayload(secret, body);

        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sig ? { "X-Signature": sig } : {}),
          },
          body,
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          logger.error(`[orcamento-automation] webhook failed status=${resp.status} body=${text}`);
        } else {
          logger.info(`[orcamento-automation] webhook sent status=${nextStatus} quotation=${id}`);
        }
      }
    } catch (e) {
      logger.error(`[orcamento-automation] failed: ${e?.message || e}`);
    }
  });
};

