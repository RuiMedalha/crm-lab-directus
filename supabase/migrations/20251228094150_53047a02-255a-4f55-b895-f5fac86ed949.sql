-- Ativar RLS em todas as tabelas
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas para utilizadores autenticados (acesso total para a equipa)
-- calls
CREATE POLICY "Authenticated users can view calls" ON public.calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert calls" ON public.calls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update calls" ON public.calls FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete calls" ON public.calls FOR DELETE TO authenticated USING (true);

-- company_settings
CREATE POLICY "Authenticated users can view settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.company_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contacts
CREATE POLICY "Authenticated users can view contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- deal_items
CREATE POLICY "Authenticated users can view deal_items" ON public.deal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deal_items" ON public.deal_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deal_items" ON public.deal_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete deal_items" ON public.deal_items FOR DELETE TO authenticated USING (true);

-- deals
CREATE POLICY "Authenticated users can view deals" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update deals" ON public.deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete deals" ON public.deals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- delivery_addresses
CREATE POLICY "Authenticated users can view delivery_addresses" ON public.delivery_addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert delivery_addresses" ON public.delivery_addresses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update delivery_addresses" ON public.delivery_addresses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete delivery_addresses" ON public.delivery_addresses FOR DELETE TO authenticated USING (true);

-- external_documents
CREATE POLICY "Authenticated users can view external_documents" ON public.external_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert external_documents" ON public.external_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update external_documents" ON public.external_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete external_documents" ON public.external_documents FOR DELETE TO authenticated USING (true);

-- manufacturers
CREATE POLICY "Authenticated users can view manufacturers" ON public.manufacturers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert manufacturers" ON public.manufacturers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update manufacturers" ON public.manufacturers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete manufacturers" ON public.manufacturers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- notification_preferences
CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- tasks
CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);