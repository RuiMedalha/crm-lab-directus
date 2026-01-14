# Extensões Directus (CRM Hotelequip)

Esta pasta contém extensões do Directus para:

- **Endpoint** `gerar-pdf`: gerar PDF de orçamento com Puppeteer e anexar fichas técnicas com pdf-lib.
- **Hook** `orcamento-automation`: disparar webhooks para n8n quando o estado do orçamento muda.

## Pastas

- `endpoints/gerar-pdf/`
- `hooks/orcamento-automation/`

## Requisitos (container Directus)

- Dependências Node: `puppeteer` e `pdf-lib`
- Acesso ao filesystem do Directus:
  - **Extensões**: `/directus/extensions`
  - **Uploads** (para anexar fichas técnicas sem download externo): `/directus/uploads`

## Variáveis de ambiente esperadas

- **n8n**
  - `N8N_WEBHOOK_QUOTATION_SENT` (ex: `https://n8n.../webhook/quotation-sent`)
  - `N8N_WEBHOOK_QUOTATION_APPROVED` (ex: `https://n8n.../webhook/quotation-approved`)
  - `N8N_WEBHOOK_SHARED_SECRET` (opcional; para assinar pedidos)

- **PDF**
  - `PDF_UPLOADS_ROOT` (default: usa `STORAGE_LOCAL_ROOT` ou `/directus/uploads`)
  - `PDF_LOGO_URL` (opcional; por defeito usa `/logo-hotelequip-light.svg` ou o `company_settings.logo_url`)

## Notas

- Para persistir extensões e uploads em Docker, monta volumes no serviço do Directus (ver instruções no final desta conversa).

