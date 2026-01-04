-- Create storage bucket for company assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true);

-- Allow anyone to view company assets (public bucket)
CREATE POLICY "Anyone can view company assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'company-assets');

-- Allow authenticated users to upload company assets
CREATE POLICY "Authenticated users can upload company assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update company assets
CREATE POLICY "Authenticated users can update company assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete company assets
CREATE POLICY "Authenticated users can delete company assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');