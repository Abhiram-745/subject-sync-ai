-- Create email_verifications table for storing verification codes
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications(expires_at);

-- Enable Row Level Security
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for sending verification codes before account exists)
CREATE POLICY "Anyone can insert verification codes" 
ON public.email_verifications 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to select (for verifying codes before account exists)
CREATE POLICY "Anyone can select verification codes" 
ON public.email_verifications 
FOR SELECT 
USING (true);

-- Allow anyone to update (for marking as verified)
CREATE POLICY "Anyone can update verification codes" 
ON public.email_verifications 
FOR UPDATE 
USING (true);

-- Allow anyone to delete (for cleanup)
CREATE POLICY "Anyone can delete verification codes" 
ON public.email_verifications 
FOR DELETE 
USING (true);

-- Create function to clean up expired verifications (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verifications
  WHERE expires_at < now();
END;
$$;