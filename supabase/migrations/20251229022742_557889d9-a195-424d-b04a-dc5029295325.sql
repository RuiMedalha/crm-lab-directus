-- Restringir storage bucket company-assets apenas a admins

-- Remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

-- Criar novas políticas apenas para admins
CREATE POLICY "Admins can upload company assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Admins can update company assets" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'company-assets' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Admins can delete company assets" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'company-assets' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Manter política de leitura pública para visualização do logo
-- (já existe policy de SELECT público no bucket)