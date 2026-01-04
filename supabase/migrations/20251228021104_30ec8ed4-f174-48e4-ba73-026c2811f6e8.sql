-- Adicionar colunas à tabela calls para fonte e notas
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS notes text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.calls.source IS 'Fonte da chamada/lead: phone, whatsapp, email, web';
COMMENT ON COLUMN public.calls.notes IS 'Notas rápidas registadas durante a chamada';

-- Adicionar colunas de integrações à tabela company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS woo_url text,
ADD COLUMN IF NOT EXISTS woo_consumer_key text,
ADD COLUMN IF NOT EXISTS woo_consumer_secret text,
ADD COLUMN IF NOT EXISTS chatwoot_url text,
ADD COLUMN IF NOT EXISTS chatwoot_token text,
ADD COLUMN IF NOT EXISTS typebot_url text,
ADD COLUMN IF NOT EXISTS typebot_token text,
ADD COLUMN IF NOT EXISTS whatsapp_api_url text,
ADD COLUMN IF NOT EXISTS webhook_pdf_proposta text,
ADD COLUMN IF NOT EXISTS webhook_sync_moloni text,
ADD COLUMN IF NOT EXISTS webhook_woo_order text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.company_settings.woo_url IS 'URL da loja WooCommerce';
COMMENT ON COLUMN public.company_settings.woo_consumer_key IS 'Consumer Key WooCommerce';
COMMENT ON COLUMN public.company_settings.woo_consumer_secret IS 'Consumer Secret WooCommerce';
COMMENT ON COLUMN public.company_settings.chatwoot_url IS 'URL da instância Chatwoot';
COMMENT ON COLUMN public.company_settings.chatwoot_token IS 'API Token Chatwoot';
COMMENT ON COLUMN public.company_settings.typebot_url IS 'URL do Typebot';
COMMENT ON COLUMN public.company_settings.typebot_token IS 'Token do Typebot';
COMMENT ON COLUMN public.company_settings.whatsapp_api_url IS 'URL da API WhatsApp ou n8n';
COMMENT ON COLUMN public.company_settings.webhook_pdf_proposta IS 'Webhook n8n para gerar PDF de proposta';
COMMENT ON COLUMN public.company_settings.webhook_sync_moloni IS 'Webhook n8n para sincronizar com Moloni';
COMMENT ON COLUMN public.company_settings.webhook_woo_order IS 'Webhook n8n para criar encomenda WooCommerce';