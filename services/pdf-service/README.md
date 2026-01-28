## CRM PDF Service (workaround sem Directus Extensions)

Este serviço expõe `POST /gerar-pdf/:quotationId` e gera o PDF via Chromium/Puppeteer, indo buscar dados ao Directus com um `DIRECTUS_TOKEN`.

### Variáveis obrigatórias
- `DIRECTUS_URL`: ex `https://api.hotelequip.pt`
- `DIRECTUS_TOKEN`: token com permissões de ler `quotations`, `quotation_items`, `contacts`, `company_settings`

### Healthcheck
- `GET /health`

