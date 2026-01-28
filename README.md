# CRM Hotelequip (Directus)

Este repositório contém o frontend do CRM (Vite/React) e os ficheiros de suporte para a stack Directus (schema + extensões).

## Frontend (CRM)

- **Login**: o CRM autentica via Directus (`/auth/login`) e guarda tokens no `localStorage`.
- **Orçamentos**:
  - Página global: `/#/orcamentos` (lista e pré-visualização)
  - Criar orçamento:
    - **Card360** (`/#/dashboard360/:id`) → botão **Novo Orçamento**
    - **Orçamentos** (`/#/orcamentos`) → botão **Novo Orçamento** (escolher cliente)

## Directus (schema / collections)

O Directus v11 pode não ter Import no UI. Para aplicar o modelo via API:

```bash
cd /var/www/crm
DIRECTUS_URL="http://127.0.0.1:8055" DIRECTUS_TOKEN="TEU_TOKEN_ADMIN" \
  node scripts/apply-directus-model.js directus/collections.crm-full.json
```

- **Schema consolidado**: `directus/collections.crm-full.json`
- Script: `scripts/apply-directus-model.js`

## PDF de Orçamentos (layout)

Existem dois “layouts”:

1) **Pré-visualização no CRM** (UI)
- Componente: `src/components/quotations/QuotationPreview.tsx`
- Serve para ver/validar rapidamente o conteúdo (cliente, itens, totais, notas).

2) **PDF final (Puppeteer)** no Directus
- Endpoint: `directus/extensions/endpoints/gerar-pdf/index.js`
- **Onde está o layout**: nas strings `css` e `html` dentro desse ficheiro.
- O PDF inclui:
  - Header com logo + dados da empresa (`company_settings`)
  - Bloco do cliente (contacts)
  - Tabela de itens (inclui imagem, SKU, detalhes técnicos quando existirem)
  - Totais
  - Condições (`terms_conditions`) e notas (`notes`)
  - Opcional: anexação de fichas técnicas PDF (`quotation_items.ficha_tecnica_url`)

### Como testar o endpoint `gerar-pdf`

```bash
curl -sS -X POST "http://127.0.0.1:8055/gerar-pdf/QUOTATION_ID" \
  -H "Authorization: Bearer TEU_TOKEN" \
  -o /tmp/orcamento.pdf
```

### Logo no PDF

O endpoint usa esta ordem:

1. `PDF_LOGO_URL` (env)
2. `company_settings.logo_url`
3. fallback “Hotelequip” (texto)

## Extensões Directus

Ver: `directus/extensions/README.md`

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
