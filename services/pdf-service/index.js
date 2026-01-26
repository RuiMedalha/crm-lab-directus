import express from "express";
import puppeteer from "puppeteer-core";

function envStr(key, fallback = "") {
  const v = process.env[key];
  return v === undefined || v === null ? fallback : String(v);
}

function fmtMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return String(iso);
  }
}

async function directusGet(path) {
  const base = envStr("DIRECTUS_URL").replace(/\/+$/, "");
  const token = envStr("DIRECTUS_TOKEN");
  if (!base || !token) throw new Error("Missing DIRECTUS_URL/DIRECTUS_TOKEN");
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json?.data;
}

function buildHtml({ q, customer, settingsRow, items }) {
  const css = `
  .pdf-container { padding: 40px; font-family: Helvetica, Arial, sans-serif; color: #2c3e50; }
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

  const logoUrl = envStr("PDF_LOGO_URL", settingsRow?.logo_url || "");
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"/><style>${css}</style></head>
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
            const img = it.image_url ? `<img class="product-img" src="${it.image_url}" referrerpolicy="no-referrer" />` : ``;
            const title = it.product_name || "—";
            const details = [it.sku ? `SKU: ${it.sku}` : null].filter(Boolean).join("\\n");
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
        <div>${q.terms_conditions ? String(q.terms_conditions).replace(/\\n/g, "<br/>") : "• Orçamento válido por 30 dias • Pagamento/Entrega: a definir"}</div>
        ${q.notes ? `<div style="margin-top:10px;"><span style="font-weight:700;">Notas:</span> ${String(q.notes).replace(/\\n/g, "<br/>")}</div>` : ``}
      </div>
    </div>
  </body></html>`;

  return html;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// CORS (para o CRM conseguir fazer fetch do PDF)
// Por defeito é permissivo (evita bloqueios por preflight).
// Se quiseres restringir, define CORS_ORIGIN com lista separada por vírgulas.
const corsAllow = envStr("CORS_ORIGIN", "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsAllowAll = corsAllow.includes("*");

app.use((req, res, next) => {
  const origin = req.headers.origin ? String(req.headers.origin) : "";

  if (corsAllowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && corsAllow.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // fallback seguro para não bloquear o browser (PDF não usa cookies)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  next();
});

app.options("*", (_req, res) => res.status(204).send(""));

app.get("/health", (_req, res) => res.json({ ok: true }));

async function handleGerarPdf(req, res) {
  try {
    const quotationId = String(req.params.quotationId || "").trim();
    if (!quotationId) return res.status(400).json({ error: "quotationId em falta" });

    const q = await directusGet(`/items/quotations/${encodeURIComponent(quotationId)}?fields=*`);
    const items = await directusGet(`/items/quotation_items?limit=2000&filter[quotation_id][_eq]=${encodeURIComponent(quotationId)}&fields=*`);
    const customer = q?.customer_id ? await directusGet(`/items/contacts/${encodeURIComponent(String(q.customer_id))}?fields=*`).catch(() => null) : null;
    const settings = await directusGet(`/items/company_settings?limit=1&sort=-id&fields=*`).then((arr) => (Array.isArray(arr) ? arr[0] : arr)).catch(() => null);

    const html = buildHtml({ q, customer, settingsRow: settings, items: Array.isArray(items) ? items : [] });

    const executablePath = envStr("PUPPETEER_EXECUTABLE_PATH", "/usr/bin/chromium");
    const browser = await puppeteer.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
      });
      const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(buf.length));
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Disposition", `inline; filename="${(q?.quotation_number || quotationId)}.pdf"`);
      res.end(buf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

// aceita GET e POST (GET evita preflight em alguns cenários)
app.post("/gerar-pdf/:quotationId", handleGerarPdf);
app.get("/gerar-pdf/:quotationId", handleGerarPdf);

const port = Number(envStr("PORT", "3001")) || 3001;
app.listen(port, () => {
  console.log(`[pdf-service] listening on :${port}`);
});

