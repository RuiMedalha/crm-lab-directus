-- 1. Fix profiles table - users can only see their own profile, admins see all
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix user_roles table - users can only see their own roles, admins see all
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix company_settings table - only admins can view (contains API keys)
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.company_settings;

CREATE POLICY "Only admins can view settings"
ON public.company_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix contacts table - only admin, gestor, vendedor roles can view (not visualizador)
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

CREATE POLICY "Authorized roles can view contacts"
ON public.contacts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'vendedor'::app_role)
);