import express from "express";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";

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

function fmtPct(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0%";
  // 23 -> "23%", 6.5 -> "6,5%"
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return `${isInt ? String(Math.round(n)) : n.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;
}

function safeDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return String(iso);
  }
}

function safeDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-PT");
  } catch {
    return String(iso);
  }
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildProductUrl({ sku, product_id }) {
  const tpl = envStr("PDF_PRODUCT_URL_TEMPLATE", "https://hotelequip.pt/?s={sku}");
  const safeSku = encodeURIComponent(String(sku || "").trim());
  const safeId = encodeURIComponent(String(product_id || "").trim());
  return tpl
    .replace(/\{sku\}/g, safeSku)
    .replace(/\{product_id\}/g, safeId);
}

function buildCartUrl({ quotationNumber, quotationId, rows, customer }) {
  const items = rows
    .map((r) => `${String(r.sku || "").trim()}:${String(r.qty || 0)}`)
    .filter((x) => !x.startsWith(":"))
    .join(",");

  const tpl = envStr(
    "PDF_CART_URL_TEMPLATE",
    "https://hotelequip.pt/cart?quote={quotation_number}&items={items}&customer_nif={customer_nif}&customer_email={customer_email}"
  );

  return tpl
    .replace(/\{quotation_number\}/g, encodeURIComponent(String(quotationNumber || "")))
    .replace(/\{quotation_id\}/g, encodeURIComponent(String(quotationId || "")))
    .replace(/\{items\}/g, encodeURIComponent(items))
    .replace(/\{customer_nif\}/g, encodeURIComponent(String(customer?.nif || "")))
    .replace(/\{customer_email\}/g, encodeURIComponent(String(customer?.email || "")));
}

function extractBetween(html, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = String(html || "").match(re);
  return m ? String(m[1] || "") : "";
}

function extractBodyInner(fullHtml) {
  const body = extractBetween(fullHtml, "body");
  if (body) return body;
  return String(fullHtml || "");
}

function stripPageAndBodyCss(css) {
  let out = String(css || "");
  // remove @page blocks
  out = out.replace(/@page[\s\S]*?\}\s*/gi, "");
  // remove body { ... } blocks (don't affect page 1)
  out = out.replace(/body\s*\{[\s\S]*?\}\s*/gi, "");
  return out;
}

function scopeCssByLine(css, scopeClass) {
  const scope = `.${scopeClass}`;
  const lines = String(css || "").split("\n");
  const out = [];
  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();
    // keep @-rules untouched
    if (trimmed.startsWith("@")) {
      out.push(line);
      continue;
    }
    // selector lines usually contain "{" and not ":" before "{"
    const braceIdx = line.indexOf("{");
    if (braceIdx >= 0) {
      const before = line.slice(0, braceIdx);
      if (!before.includes(":")) {
        const selectors = before
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `${scope} ${s}`)
          .join(", ");
        out.push(`${line.slice(0, 0)}${selectors} ${line.slice(braceIdx)}`);
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

let cachedTerms = null;

async function getTermsTemplate() {
  if (cachedTerms) return cachedTerms;

  const forceFile = String(envStr("PDF_TERMS_FORCE_FILE", "1")).trim() === "1";
  const fromEnvRaw = envStr("PDF_TERMS_HTML", "").trim();
  const fromEnvLooksPlaceholder =
    !fromEnvRaw ||
    fromEnvRaw.includes("Aqui os teus termos") ||
    fromEnvRaw.includes("Linha 2") ||
    fromEnvRaw.includes("Linha 3");

  const filePath = envStr("PDF_TERMS_FILE", "/app/terms-hotelequip.html").trim();
  try {
    const full = await readFile(filePath, "utf-8");
    const css = extractBetween(full, "style");
    const bodyInner = extractBodyInner(full);
    // Se o env vier com placeholder, ignora e usa ficheiro.
    // Se forceFile=1, usa sempre ficheiro (mais “profissional” e estável).
    if (!forceFile && fromEnvRaw && !fromEnvLooksPlaceholder) {
      cachedTerms = { html: fromEnvRaw, css: "" };
      return cachedTerms;
    }
    cachedTerms = { html: bodyInner, css };
    return cachedTerms;
  } catch {
    // Se não houver ficheiro, cai para env (se existir)
    if (fromEnvRaw && !fromEnvLooksPlaceholder) {
      cachedTerms = { html: fromEnvRaw, css: "" };
      return cachedTerms;
    }
    cachedTerms = { html: "", css: "" };
    return cachedTerms;
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

function buildHtml({ q, customer, settingsRow, items, qrDataUrl, cartUrl, termsHtml, termsScopedCss }) {
  const css = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .pdf { padding: 28px 32px; font-family: Helvetica, Arial, sans-serif; color: #111827; }
  .top { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .brand img { max-width: 360px; max-height: 110px; object-fit: contain; }
  .muted { color: #6b7280; font-size: 12px; }
  .block-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .06em; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .line { font-size: 12px; line-height: 1.4; }
  .h1 { font-size: 18px; font-weight: 800; }
  .right { text-align: right; }
  .kv { display: grid; grid-template-columns: 140px 1fr; gap: 6px 10px; margin-top: 8px; }
  .kv .k { color: #6b7280; font-size: 12px; text-align: right; }
  .kv .v { font-size: 12px; text-align: left; }
  .sep { margin: 16px 0; border: 0; border-top: 1px solid #e5e7eb; }

  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #111827; color: #fff; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .02em; }
  td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; font-size: 12px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .sku { color: #6b7280; font-size: 11px; margin-top: 2px; }
  .product { font-weight: 700; }
  .product-img { width: 46px; height: 46px; object-fit: contain; border-radius: 6px; background: #f3f4f6; border: 1px solid #e5e7eb; }
  .desc-wrap { display: flex; gap: 10px; align-items: flex-start; }
  .desc-text { min-width: 0; }
  a, a:visited { color: inherit; text-decoration: none; }
  a.underline { text-decoration: underline; }

  .summary { margin-top: 14px; display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
  .totals { margin-left: auto; width: 340px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; }
  .totals .row strong { font-size: 13px; }
  .totals .final { border-top: 2px solid #111827; margin-top: 8px; padding-top: 10px; }
  .footer { margin-top: 16px; font-size: 11px; color: #6b7280; }
  .terms-page { page-break-before: always; padding-top: 6px; }
  .terms-title { font-size: 14px; font-weight: 900; margin-bottom: 8px; }
  .terms-body { font-size: 11px; color: #111827; line-height: 1.5; }
  .qr { display: flex; gap: 12px; align-items: center; margin-top: 10px; }
  .qr img { width: 96px; height: 96px; }
  `;

  const logoUrl = envStr("PDF_LOGO_URL", settingsRow?.logo_url || "");
  const issueDate = safeDate(q.date_created || q.date_updated || q.created_at || new Date().toISOString());

  // Totais: usar SEM IVA (ignorando line_total do Directus, que pode vir com IVA).
  const rows = (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it.quantity ?? 0) || 0;
    const unit = Number(it.unit_price ?? 0) || 0;
    const base = qty * unit;
    const ivaPct = Number(it.iva_percent ?? 0) || 0;
    const iva = base * (ivaPct / 100);
    return { ...it, qty, unit, base, ivaPct, iva };
  });

  const subtotal = rows.reduce((s, r) => s + (Number(r.base) || 0), 0);
  const ivaTotal = rows.reduce((s, r) => s + r.iva, 0);
  const total = subtotal + ivaTotal;

  // Empresa fixa (podes sobrescrever por env no stack)
  const companyTitle = envStr("PDF_COMPANY_TITLE", "HOTELEQUIP.PT");
  const companyName = envStr("PDF_COMPANY_NAME", settingsRow?.name || "Hotelequip.pt");
  const companyVat = envStr("PDF_COMPANY_VAT", settingsRow?.vat_number || settingsRow?.vat || settingsRow?.nif || "—");
  const companyPhone = envStr("PDF_COMPANY_PHONE", settingsRow?.phone || "—");
  const companyEmail = envStr("PDF_COMPANY_EMAIL", settingsRow?.email || "—");
  const companyAddress = envStr("PDF_COMPANY_ADDRESS", settingsRow?.address || settingsRow?.morada || "");
  const companyWebsite = envStr("PDF_COMPANY_WEBSITE", "https://hotelequip.pt");

  const customerName = customer?.company_name || customer?.contact_name || "—";
  const customerVat = customer?.nif || "—";
  const customerPhone = customer?.phone || "—";
  const customerEmail = customer?.email || "—";
  const customerAddress = customer?.address || "";
  const customerCityLine =
    (customer?.postal_code || customer?.city) ? `${customer?.postal_code || ""} ${customer?.city || ""}`.trim() : "";

  const termsHtmlSafe = String(termsHtml || "");
  const termsScopedCssSafe = String(termsScopedCss || "");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"/><style>${css}</style></head>
  <body>
    <div class="pdf">
      <div class="top">
        <div>
          <div class="brand">
            ${logoUrl ? `<a href="${escHtml(companyWebsite)}" class="underline"><img src="${escHtml(logoUrl)}" /></a>` : `<div class="h1">${escHtml(companyName)}</div>`}
          </div>
          <div class="box" style="margin-top:10px;">
            <div class="block-title">${escHtml(companyTitle)}</div>
            <div class="line"><strong>${escHtml(companyName)}</strong></div>
            ${companyAddress ? `<div class="line">${escHtml(companyAddress)}</div>` : ``}
            <div class="line">NIF: ${escHtml(companyVat)}</div>
            <div class="line">Telefone: ${escHtml(companyPhone)}</div>
            <div class="line">Email: ${escHtml(companyEmail)}</div>
            <div class="line">Site: <a class="underline" href="${escHtml(companyWebsite)}">${escHtml(companyWebsite)}</a></div>
          </div>
        </div>

        <div class="right">
          <div class="h1">Orçamento</div>
          <div class="muted">N.º ${String(q.quotation_number || q.id || "")}</div>
          <div class="kv">
            <div class="k">Data de emissão</div><div class="v">${issueDate || "—"}</div>
            ${q.valid_until ? `<div class="k">Válido até</div><div class="v">${safeDate(q.valid_until) || "—"}</div>` : ``}
          </div>

          <div class="box" style="margin-top:10px; text-align:left;">
            <div class="block-title">Cliente</div>
            <div class="line"><strong>${escHtml(customerName)}</strong></div>
            ${customerAddress ? `<div class="line">${escHtml(customerAddress)}</div>` : ``}
            ${customerCityLine ? `<div class="line">${escHtml(customerCityLine)}</div>` : ``}
            <div class="line">NIF: ${escHtml(customerVat)}</div>
            <div class="line">Telefone: ${escHtml(customerPhone)}</div>
            <div class="line">Email: ${escHtml(customerEmail)}</div>
            ${qrDataUrl && cartUrl ? `<div class="qr"><img src="${escHtml(qrDataUrl)}" /><div class="muted">QR Code: abrir carrinho no site</div></div>` : ``}
          </div>
        </div>
      </div>

      <hr class="sep" />

      <table>
        <thead>
          <tr>
            <th style="width:64px;">Img</th>
            <th>Artigo / Designação</th>
            <th class="num" style="width:60px;">Qtd</th>
            <th class="num" style="width:110px;">P. Unit.</th>
            <th class="num" style="width:70px;">IVA</th>
            <th class="num" style="width:120px;">Total (s/ IVA)</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((it) => {
              const img = it.image_url
                ? `<img class="product-img" src="${String(it.image_url)}" referrerpolicy="no-referrer" />`
                : ``;
              const title = String(it.product_name || "—");
              const sku = it.sku ? String(it.sku) : "";
              const href = buildProductUrl({ sku, product_id: it.product_id });
              return `
              <tr>
                <td>${img}</td>
                <td>
                  <div class="desc-wrap">
                    <div class="desc-text">
                      <div class="product"><a href="${escHtml(href)}" class="underline">${escHtml(title)}</a></div>
                      ${sku ? `<div class="sku">Ref: ${escHtml(sku)}</div>` : ``}
                    </div>
                  </div>
                </td>
                <td class="num">${String(it.qty || 0)}</td>
                <td class="num">${fmtMoney(it.unit || 0)}</td>
                <td class="num">${fmtPct(it.ivaPct || 0)}</td>
                <td class="num"><strong>${fmtMoney(it.base || 0)}</strong></td>
              </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>

      <div class="summary">
        <div>
          ${q.notes ? `<div class="footer"><strong>Notas:</strong> ${escHtml(String(q.notes)).replace(/\n/g, "<br/>")}</div>` : ``}
        </div>
        <div class="totals box">
          <div class="block-title">Resumo</div>
          <div class="row"><span>Total s/ IVA</span><span>${fmtMoney(subtotal)}</span></div>
          <div class="row"><span>IVA</span><span>${fmtMoney(ivaTotal)}</span></div>
          <div class="row final"><strong>Total</strong><strong>${fmtMoney(total)}</strong></div>
        </div>
      </div>

      ${
        (termsHtmlSafe || termsScopedCssSafe)
          ? `<div class="terms-page">
              ${termsScopedCssSafe ? `<style>${termsScopedCssSafe}</style>` : ``}
              <div class="terms-scope">${termsHtmlSafe}</div>
            </div>`
          : ``
      }
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

    // QR code (desligado por defeito até ficar “perfeito”)
    const enableCartQr = String(envStr("PDF_ENABLE_CART_QR", "0")).trim() === "1";
    let cartUrl = "";
    let qrDataUrl = "";
    if (enableCartQr) {
      const rows = (Array.isArray(items) ? items : []).map((it) => ({
        sku: it?.sku ?? "",
        qty: Number(it?.quantity ?? 0) || 0,
      }));
      cartUrl = buildCartUrl({
        quotationNumber: q?.quotation_number || "",
        quotationId,
        rows,
        customer,
      });
      qrDataUrl = cartUrl
        ? await QRCode.toDataURL(String(cartUrl), { margin: 1, width: 256 })
        : "";
    }

    const tpl = await getTermsTemplate();
    const scopedCss = (() => {
      const rawCss = stripPageAndBodyCss(tpl?.css || "");
      const scoped = scopeCssByLine(rawCss, "terms-scope");
      return scoped.trim();
    })();
    const termsHtml = String(tpl?.html || "");
    const termsCss = scopedCss;

    const html = buildHtml({
      q,
      customer,
      settingsRow: settings,
      items: Array.isArray(items) ? items : [],
      qrDataUrl,
      cartUrl,
      termsHtml,
      termsScopedCss: termsCss,
    });

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

// Debug rápido para confirmar que o template de termos existe no container
app.get("/debug/terms", async (_req, res) => {
  try {
    const tpl = await getTermsTemplate();
    const rawCss = stripPageAndBodyCss(tpl?.css || "");
    const scoped = scopeCssByLine(rawCss, "terms-scope").trim();
    res.json({
      ok: true,
      file: envStr("PDF_TERMS_FILE", "/app/terms-hotelequip.html"),
      forceFile: String(envStr("PDF_TERMS_FORCE_FILE", "1")).trim() === "1",
      envProvided: !!envStr("PDF_TERMS_HTML", "").trim(),
      html_chars: String(tpl?.html || "").length,
      css_chars: String(tpl?.css || "").length,
      scoped_css_chars: String(scoped || "").length,
      html_preview: String(tpl?.html || "").slice(0, 200),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

const port = Number(envStr("PORT", "3001")) || 3001;
app.listen(port, () => {
  console.log(`[pdf-service] listening on :${port}`);
});

