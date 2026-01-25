async function getPuppeteer() {
  try {
    const mod = await import("puppeteer");
    return mod.default || mod;
  } catch (e1) {
    try {
      const mod = await import("puppeteer-core");
      return mod.default || mod;
    } catch (e2) {
      const err = new Error(
        `Puppeteer não disponível no container (tentado puppeteer e puppeteer-core). Instala no image ou adiciona como dependência.`
      );
      err.cause = e2 || e1;
      throw err;
    }
  }
}

/**
 * Directus Endpoint Extension: /gerar-pdf
 *
 * POST /gerar-pdf/:quotationId
 * Body (optional): { store_pdf?: boolean }
 *
 * Generates a professional PDF for a quotation and (optionally) appends technical sheets PDFs
 * from local uploads if `ficha_tecnica_url` is present on quotation_items.
 */

function envStr(env, key, fallback = "") {
  const v = env?.[key];
  return (v === undefined || v === null) ? fallback : String(v);
}

function fmtMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return String(iso);
  }
}

function extractAssetId(url) {
  if (!url) return "";
  try {
    const u = new URL(url, "http://localhost");
    // /assets/<uuid> or /assets/<uuid>?download=1
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("assets");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return "";
  } catch {
    return "";
  }
}

export default (router, { services, exceptions, env, getSchema, logger }) => {
  const { ItemsService, FilesService } = services;
  const { ForbiddenException, InvalidPayloadException, ServiceUnavailableException } = exceptions;

  try {
    logger?.info?.(`[gerar-pdf] endpoint carregado (EXTENSIONS_PATH=${String(process.env.EXTENSIONS_PATH || "")})`);
  } catch {
    // ignore
  }

  router.post("/:quotationId", async (req, res) => {
    const { quotationId } = req.params;
    if (!quotationId) throw new InvalidPayloadException("quotationId em falta");

    const schema = await getSchema({ accountability: req.accountability });
    const quotations = new ItemsService("quotations", { schema, accountability: req.accountability });
    const quotationItems = new ItemsService("quotation_items", { schema, accountability: req.accountability });
    const contacts = new ItemsService("contacts", { schema, accountability: req.accountability });
    const companySettings = new ItemsService("company_settings", { schema, accountability: req.accountability });
    const files = new FilesService({ schema, accountability: req.accountability });

    const q = await quotations.readOne(quotationId, {
      fields: [
        "id",
        "quotation_number",
        "status",
        "valid_until",
        "notes",
        "terms_conditions",
        "internal_notes",
        "subtotal",
        "total_amount",
        "date_created",
        "customer_id",
      ],
    });
    if (!q) throw new ForbiddenException("Orçamento não encontrado");

    const customer = q.customer_id ? await contacts.readOne(q.customer_id, {
      fields: ["id", "company_name", "contact_name", "address", "postal_code", "city", "nif", "email", "phone", "moloni_client_id"],
    }).catch(() => null) : null;

    const settingsRow = await companySettings.readByQuery({
      limit: 1,
      sort: ["-id"],
      fields: ["name", "vat_number", "phone", "email", "logo_url", "address"],
    }).then((r) => r?.[0] || null).catch(() => null);

    const items = await quotationItems.readByQuery({
      filter: { quotation_id: { _eq: quotationId } },
      sort: ["sort_order", "id"],
      limit: 2000,
      fields: [
        "id",
        "product_name",
        "technical_details",
        "image_url",
        "sku",
        "quantity",
        "unit_price",
        "iva_percent",
        "discount_percent",
        "notes",
        "line_total",
        "supplier_email",
        "manual_entry",
        "ficha_tecnica_url",
      ],
    });

    const css = `
/* Estilo Profissional Hotelequip */
.pdf-container { padding: 40px; font-family: 'Helvetica', sans-serif; color: #2c3e50; }
.header { border-bottom: 3px solid #e2001a; display: flex; justify-content: space-between; padding-bottom: 20px; gap: 20px; }
.logo-area img { max-width: 200px; max-height: 60px; object-fit: contain; }
.company-info { text-align: right; font-size: 12px; line-height: 1.5; white-space: nowrap; }

.client-box { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0; display: flex; justify-content: space-between; gap: 20px; }
.quote-title { color: #e2001a; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
.muted { color: #7f8c8d; font-size: 12px; }

table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th { background-color: #e2001a; color: white; padding: 12px; text-align: left; text-transform: uppercase; font-size: 11px; }
td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
.product-img { width: 50px; height: 50px; object-fit: contain; border-radius: 4px; background: #f2f3f4; border: 1px solid #e6e8ea; }
.desc-title { font-weight: 700; margin-bottom: 4px; }
.desc-sub { color: #566573; font-size: 11px; white-space: pre-wrap; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.totals-area { margin-top: 30px; margin-left: auto; width: 300px; }
.total-row { display: flex; justify-content: space-between; padding: 8px 0; }
.total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
.footer { margin-top: 30px; font-size: 11px; color: #566573; }
`;

    const logoUrl = envStr(env, "PDF_LOGO_URL", settingsRow?.logo_url || "");

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
  </head>
  <body>
    <div class="pdf-container">
      <div class="header">
        <div class="logo-area">
          ${logoUrl ? `<img src="${logoUrl}" />` : `<div style="font-weight:700;color:#e2001a;">Hotelequip</div>`}
        </div>
        <div class="company-info">
          <div style="font-weight:700;">${settingsRow?.name || "Hotelequip"}</div>
          ${settingsRow?.address ? `<div>${settingsRow.address}</div>` : ``}
          <div>NIF: ${settingsRow?.vat_number || "—"}</div>
          <div>Tel: ${settingsRow?.phone || "—"}</div>
          <div>Email: ${settingsRow?.email || "—"}</div>
        </div>
      </div>

      <div class="client-box">
        <div>
          <div class="muted">CLIENTE</div>
          <div class="desc-title">${customer?.company_name || "—"}</div>
          ${customer?.contact_name ? `<div class="muted">Att: ${customer.contact_name}</div>` : ``}
          ${customer?.address ? `<div>${customer.address}</div>` : ``}
          ${(customer?.postal_code || customer?.city) ? `<div>${customer?.postal_code || ""} ${customer?.city || ""}</div>` : ``}
          ${customer?.nif ? `<div class="muted">NIF: ${customer.nif}</div>` : ``}
        </div>
        <div style="text-align:right;">
          <div class="quote-title">ORÇAMENTO</div>
          <div class="mono" style="font-size:14px;font-weight:700;">${q.quotation_number || q.id}</div>
          <div class="muted">Data: ${safeDate(q.date_created)}</div>
          ${q.valid_until ? `<div class="muted">Válido até: ${safeDate(q.valid_until)}</div>` : ``}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:60px;">Imagem</th>
            <th>Descrição</th>
            <th style="width:50px;text-align:right;">Qtd</th>
            <th style="width:90px;text-align:right;">Preço Unit.</th>
            <th style="width:60px;text-align:right;">IVA</th>
            <th style="width:90px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(items || []).map((it) => {
            const img = it.image_url ? `<img class="product-img" src="${it.image_url}" loading="lazy" referrerpolicy="no-referrer" />` : ``;
            const title = it.product_name || "—";
            const parts = [];
            if (it.sku) parts.push(`SKU: ${it.sku}`);
            if (it.discount_percent && Number(it.discount_percent) > 0) parts.push(`Desc: ${Number(it.discount_percent)}%`);
            if (it.technical_details) parts.push(String(it.technical_details));
            if (it.notes) parts.push(`Notas: ${String(it.notes)}`);
            const details = parts.filter(Boolean).join("\n");
            return `
              <tr>
                <td>${img}</td>
                <td>
                  <div class="desc-title">${title}</div>
                  ${details ? `<div class="desc-sub">${details}</div>` : ``}
                </td>
                <td style="text-align:right;">${Number(it.quantity || 0)}</td>
                <td style="text-align:right;">${fmtMoney(it.unit_price || 0)}</td>
                <td style="text-align:right;">${(it.iva_percent ?? 0)}%</td>
                <td style="text-align:right;font-weight:700;">${fmtMoney(it.line_total || 0)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div class="totals-area">
        <div class="total-row"><span>Subtotal</span><span>${fmtMoney(q.subtotal || 0)}</span></div>
        <div class="total-row total-final"><span>Total</span><span>${fmtMoney(q.total_amount || 0)}</span></div>
      </div>

      <div class="footer">
        <div style="font-weight:700;margin-bottom:6px;">Condições</div>
        <div>${q.terms_conditions ? String(q.terms_conditions).replace(/\n/g, "<br/>") : "• Orçamento válido por 30 dias • Pagamento: 50% encomenda, 50% antes entrega"}</div>
        ${q.notes ? `<div style="margin-top:10px;"><span style="font-weight:700;">Notas:</span> ${String(q.notes).replace(/\n/g, "<br/>")}</div>` : ``}
      </div>
    </div>
  </body>
</html>
`;

    // 1) Generate PDF via Puppeteer
    let browser;
    let pdfBuffer;
    try {
      const puppeteer = await getPuppeteer();
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
    } catch (e) {
      throw new ServiceUnavailableException(`Falha ao gerar PDF (Puppeteer): ${e?.message || e}`);
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }

    // 2) Anexos (fichas técnicas) desativados por compatibilidade.
    // Mantemos o PDF base (Puppeteer) para garantir que o endpoint carrega e funciona.
    const merged = pdfBuffer;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${q.quotation_number || q.id}.pdf"`);
    res.send(Buffer.from(merged));
  });
};

