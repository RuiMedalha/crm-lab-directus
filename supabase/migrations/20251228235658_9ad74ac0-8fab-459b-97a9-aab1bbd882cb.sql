-- Atualizar constraint deals_status_check para aceitar os valores do frontend
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check 
  CHECK (status = ANY (ARRAY['lead', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido']));