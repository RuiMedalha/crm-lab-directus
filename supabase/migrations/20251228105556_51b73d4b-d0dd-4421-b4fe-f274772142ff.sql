-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  terms_conditions TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotations
CREATE POLICY "Authenticated users can view quotations" 
ON public.quotations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert quotations" 
ON public.quotations FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations" 
ON public.quotations FOR UPDATE USING (true);

CREATE POLICY "Admins and gestors can delete quotations" 
ON public.quotations FOR DELETE 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- Trigger for updated_at
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create quotation_items table for line items
CREATE TABLE public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  sku TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC,
  discount_percent NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotation_items
CREATE POLICY "Authenticated users can view quotation_items" 
ON public.quotation_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert quotation_items" 
ON public.quotation_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotation_items" 
ON public.quotation_items FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete quotation_items" 
ON public.quotation_items FOR DELETE USING (true);

-- Create sequence for quotation numbers
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START WITH 1000;

-- Function to generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'ORC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('quotation_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for auto-generating quotation number
CREATE TRIGGER generate_quotation_number_trigger
BEFORE INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.generate_quotation_number();