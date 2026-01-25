# Flows n8n + Chatwoot (Orçamentos)

Este CRM já tem 2 “gatilhos” principais para automação:

- **Directus Hook** `directus/extensions/hooks/orcamento-automation/`
  - Dispara quando `quotations.status` muda para `sent` ou `approved`
  - Envia webhook para n8n com assinatura opcional (`X-Signature`)
- **Endpoint Directus** `POST /gerar-pdf/:quotationId`
  - Gera o PDF via Puppeteer
  - Pode anexar fichas técnicas (PDFs) no fim

---

## 1) Variáveis necessárias no Directus (env)

No container/stack do Directus:

- **`PUBLIC_URL`**: URL pública do Directus (ex: `https://api.hotelequip.pt`)
- **`N8N_WEBHOOK_QUOTATION_SENT`**: URL do webhook do n8n (status `sent`) — ex: `https://n8n.../webhook/crm/quotation-sent`
- **`N8N_WEBHOOK_QUOTATION_APPROVED`**: URL do webhook do n8n (status `approved`) — ex: `https://n8n.../webhook/crm/quotation-approved`
- **`N8N_WEBHOOK_SHARED_SECRET`** (opcional): segredo para assinar o payload em `X-Signature`

Opcional:
- **`PDF_LOGO_URL`**: força logo no PDF (senão usa `company_settings.logo_url`)

---

## 2) Payload que o Directus envia para o n8n

Vem do hook `orcamento-automation`. Estrutura:

- `event`: `"quotation.status_changed"`
- `status`: `"sent"` ou `"approved"`
- `pdf_url`: `${PUBLIC_URL}/gerar-pdf/<quotationId>`
- `quotation`: campos principais do orçamento (inclui `sent_to_email`, `sent_at`, `pdf_link`, etc.)
- `customer`: `{ id, company_name, email, phone, moloni_client_id }`
- `items`: linhas do orçamento (sku, qty, unit_price, iva_percent, line_total, fornecedor_email, etc.)

Assinatura:
- header `X-Signature` = HMAC SHA256 do body (string JSON), com `N8N_WEBHOOK_SHARED_SECRET`.

---

## 3) Flow n8n recomendado (status = sent)

### Objetivo
1) Gerar PDF
2) Guardar link/ficheiro no Directus (`pdf_link` e/ou `pdf_file`)
3) Enviar email ao cliente
4) Registar no histórico (`interactions`) que foi enviado
5) (Opcional) Enviar também para WhatsApp via Chatwoot/YCloud

### Passos (n8n nodes)
1. **Webhook (Trigger)**: recebe o payload do Directus
2. **(Opcional) Verify Signature**:
   - validar `X-Signature` com o mesmo secret
3. **HTTP Request → Directus gerar PDF**
   - `POST {{ $json.pdf_url }}`
   - Header: `Authorization: Bearer <DIRECTUS_ADMIN_OR_SERVICE_TOKEN>`
   - Output: binary (PDF)
4. **(Opcional) Upload File → Directus `/files`**
   - `POST https://api.../files`
   - FormData: `file` = PDF binary
   - Resultado: `fileId`
5. **HTTP Request → Patch quotation**
   - `PATCH /items/quotations/<id>`
   - set:
     - `pdf_file = fileId` (se usares directus_files)
     - `pdf_link = <link público>` (ex: um endpoint do n8n ou uma URL do Directus assets)
6. **Enviar Email**
   - destinatário: `customer.email` ou `quotation.sent_to_email`
   - corpo: incluir `pdf_link`
7. **Registar Interação**
   - `POST /items/interactions`
   - payload exemplo:
     - `type="email"`, `direction="out"`, `status="done"`, `source="n8n"`
     - `occurred_at=now`
     - `contact_id=<customer.id>` (atenção: no teu schema `contacts.id` é UUID)
     - `summary="Orçamento enviado"`
     - `payload={ quotation_id, pdf_link, to }`

---

## 3.1) Workflows prontos a importar (JSON)

Este repositório já inclui exports do n8n (para importares no UI do n8n):

- `n8n/workflows/quotation-sent.json`
- `n8n/workflows/quotation-approved.json`

### Variáveis no n8n (Environment Variables)

No n8n (Settings → Environment Variables), define:

- `DIRECTUS_URL` (ex: `https://api.hotelequip.pt`)
- `DIRECTUS_TOKEN` (token de service/admin com permissões para: `files`, `quotations`, `interactions`)
- `SMTP_FROM` (ex: `crm@hotelequip.pt`)

E configura as credenciais do node **Email Send** (SMTP) no n8n.

---

## 4) Flow n8n para WhatsApp via Chatwoot (opção simples)

### Pré-requisitos
No CRM:
- Em `Definições` preencher:
  - `chatwoot_url`
  - `chatwoot_token`
  - `chatwoot_account_id`
- Cada contacto deve ter `chatwoot_contact_id` (pode ser preenchido por automação)

### Estratégia
No n8n, quando tens o `pdf_link`:
- chamar **Chatwoot API** para criar mensagem/conversa no inbox WhatsApp (depende da tua configuração no Chatwoot).

Notas:
- As rotas variam conforme o Chatwoot (inboxes, conversations).
- O CRM já tem o “atalho” para abrir o contacto no Chatwoot se existir `chatwoot_contact_id`.

---

## 5) O que falta para “fechar 100%” a integração WhatsApp

- Definir se o envio WhatsApp é:
  - **Chatwoot (inbox WhatsApp)**, ou
  - **YCloud / API direta** (via `whatsapp_api_url`)
- Normalizar:
  - onde fica o `pdf_link` público
  - como garantir que o cliente tem telefone válido (E.164)

