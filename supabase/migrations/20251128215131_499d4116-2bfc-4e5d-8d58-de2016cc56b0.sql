-- Create referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral uses table
CREATE TABLE public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  validation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create premium grants table
CREATE TABLE public.premium_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grant_type TEXT NOT NULL DEFAULT 'referral',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Users can view own referral code"
ON public.referral_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral code"
ON public.referral_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for referral_uses
CREATE POLICY "Users can view referrals they made"
ON public.referral_uses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referral_codes rc
    WHERE rc.id = referral_code_id AND rc.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert referral uses"
ON public.referral_uses FOR INSERT
WITH CHECK (true);

-- RLS policies for premium_grants
CREATE POLICY "Users can view own premium grants"
ON public.premium_grants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert premium grants"
ON public.premium_grants FOR INSERT
WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'VIS' || upper(substr(md5(random()::text), 1, 5));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function to check and grant referral premium
CREATE OR REPLACE FUNCTION public.check_and_grant_referral_premium(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_referral_count INTEGER;
  existing_grant_count INTEGER;
BEGIN
  -- Count valid referrals for this user's referral code
  SELECT COUNT(*) INTO valid_referral_count
  FROM public.referral_uses ru
  JOIN public.referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.user_id = _user_id AND ru.is_valid = true;
  
  -- Check if user already has an active referral grant
  SELECT COUNT(*) INTO existing_grant_count
  FROM public.premium_grants
  WHERE user_id = _user_id 
    AND grant_type = 'referral'
    AND expires_at > now();
  
  -- If 5+ valid referrals and no active grant, create one
  IF valid_referral_count >= 5 AND existing_grant_count = 0 THEN
    INSERT INTO public.premium_grants (user_id, grant_type, starts_at, expires_at)
    VALUES (_user_id, 'referral', now(), now() + interval '7 days');
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to check if user has active premium grant
CREATE OR REPLACE FUNCTION public.has_active_premium_grant(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_grants
    WHERE user_id = _user_id
      AND starts_at <= now()
      AND expires_at > now()
  );
$$;