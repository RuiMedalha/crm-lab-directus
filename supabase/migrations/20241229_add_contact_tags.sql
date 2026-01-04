-- Adicionar campo tags aos contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Criar tabela de tags predefinidas
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir tags predefinidas
INSERT INTO public.contact_tags (name, color, icon, category) VALUES
  ('Cliente VIP', '#FFD700', '⭐', 'priority'),
  ('Grande Conta', '#FF6B6B', '🏢', 'priority'),
  ('Pequena Empresa', '#51CF66', '🏪', 'type'),
  ('Paga a Pronto', '#339AF0', '💵', 'payment'),
  ('Paga 30 dias', '#FFA94D', '📅', 'payment'),
  ('Paga 60 dias', '#FF8787', '📅', 'payment'),
  ('Problema Pagamento', '#FA5252', '⚠️', 'payment'),
  ('Precisa Orçamento', '#845EF7', '📋', 'status'),
  ('Só Informações', '#868E96', 'ℹ️', 'status'),
  ('Assistência Técnica', '#FF922B', '🔧', 'type'),
  ('Logística', '#9775FA', '📦', 'type')
ON CONFLICT (name) DO NOTHING;

-- RLS policies para contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contact tags" 
  ON public.contact_tags FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage contact tags" 
  ON public.contact_tags FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Comentários
COMMENT ON COLUMN public.contacts.tags IS 'Array de tags atribuídas ao contacto';
COMMENT ON TABLE public.contact_tags IS 'Tags predefinidas para categorizar contactos';