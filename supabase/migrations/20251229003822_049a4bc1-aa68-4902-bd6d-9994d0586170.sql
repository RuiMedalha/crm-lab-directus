-- Fix contacts policy - vendedores only see contacts from their assigned deals or contacts they created
DROP POLICY IF EXISTS "Authorized roles can view contacts" ON public.contacts;

CREATE POLICY "Authorized roles can view contacts"
ON public.contacts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND id IN (
      SELECT DISTINCT customer_id FROM public.deals 
      WHERE assigned_to = auth.uid() AND customer_id IS NOT NULL
    )
  )
);

-- Fix profiles policy - more explicit check
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);