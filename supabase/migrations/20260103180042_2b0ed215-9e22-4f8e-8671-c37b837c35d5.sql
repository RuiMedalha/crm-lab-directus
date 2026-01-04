-- Add attempt_count and last_attempt columns to calls table for tracking missed calls
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_attempt timestamp with time zone DEFAULT now();

-- Add newsletter_welcome_sent to contacts for tracking welcome email
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS newsletter_welcome_sent boolean DEFAULT false;

-- Create index for efficient phone number lookups on calls
CREATE INDEX IF NOT EXISTS idx_calls_phone_number ON public.calls(phone_number);

-- Create index for tracking unprocessed calls
CREATE INDEX IF NOT EXISTS idx_calls_unprocessed ON public.calls(is_processed, created_at DESC) WHERE is_processed = false;