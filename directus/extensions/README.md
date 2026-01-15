# Extensões Directus (CRM Hotelequip)

Esta pasta contém extensões do Directus para:

- **Endpoint** `gerar-pdf`: gerar PDF de orçamento com Puppeteer e anexar fichas técnicas com pdf-lib.
- **Hook** `orcamento-automation`: disparar webhooks para n8n quando o estado do orçamento muda.
- **Hook** `newsletter-sync`: sincronizar campos de newsletter/cupões entre `contacts` e `newsletter_subscriptions`.

## Pastas

- `endpoints/gerar-pdf/`
- `hooks/orcamento-automation/`
- `hooks/newsletter-sync/`

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

## Hook `newsletter-sync`

Mantém os campos “base newsletter/cupões” sempre alinhados entre:

- `contacts`
- `newsletter_subscriptions`
- `newsletter_identity_map` (opcional, mas recomendado)

Regra simples:

- Matching por `email` (preferencial) **OU** `phone` (fallback). (Sem “unique condicional” no Directus.)
- Sempre que um lado é criado/atualizado, o outro lado é criado/atualizado com os mesmos campos.
- Para reduzir loops, o hook só faz `update` quando deteta diferenças reais nos campos.

### Nota sobre o n8n (importante)

Se o n8n estiver a escrever apenas em `contacts` (ou apenas em `newsletter_subscriptions`), o hook garante que o outro lado é preenchido.

## Layout do PDF (Orçamentos)

O layout do PDF é gerado no endpoint `gerar-pdf` (Puppeteer) e está definido diretamente no ficheiro:

- `directus/extensions/endpoints/gerar-pdf/index.js`
  - bloco `css` (estilos)
  - bloco `html` (estrutura do documento)

### O que o PDF inclui

- **Cabeçalho**: logo + dados da empresa (a partir de `company_settings`)
- **Cliente**: `contacts` (empresa, morada, NIF, etc.)
- **Linhas**: `quotation_items` (imagem, descrição, SKU, detalhes técnicos)
- **Totais**: `subtotal` e `total_amount`
- **Condições**: `terms_conditions` e `notes`
- **Fichas técnicas**: se `quotation_items.ficha_tecnica_url` apontar para um PDF (asset ou URL), o endpoint tenta anexar ao final do PDF.

### Teste rápido (gerar PDF)

```bash
curl -sS -X POST "http://127.0.0.1:8055/gerar-pdf/QUOTATION_ID" \
  -H "Authorization: Bearer TEU_TOKEN" \
  -o /tmp/orcamento.pdf
```

### Logo

O endpoint usa esta ordem:

1) env `PDF_LOGO_URL`  
2) `company_settings.logo_url`  
3) fallback (texto “Hotelequip”)

