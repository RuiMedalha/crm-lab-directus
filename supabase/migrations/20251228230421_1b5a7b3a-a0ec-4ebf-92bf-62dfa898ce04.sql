-- Fase 3: Migração de Base de Dados

-- Adicionar campos aos contactos para SKU history e notas rápidas
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sku_history TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS quick_notes JSONB DEFAULT '[]';

-- Adicionar campos às tasks para tickets de técnico/logística
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'geral';

-- Adicionar pdf_link às quotations para o atalho PDF no Pipeline
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pdf_link TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_contacts_nif ON contacts(nif);
CREATE INDEX IF NOT EXISTS idx_contacts_moloni_client_id ON contacts(moloni_client_id);