-- Create banned_users table
CREATE TABLE IF NOT EXISTS public.banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banned_by UUID NOT NULL,
  reason TEXT,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view banned users
CREATE POLICY "Admins can view banned users"
  ON public.banned_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.email = 'abhiramkakarla1@gmail.com'
    )
  );

-- Only admins can insert/delete banned users
CREATE POLICY "Admins can manage banned users"
  ON public.banned_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.email = 'abhiramkakarla1@gmail.com'
    )
  );

-- Update existing user roles function to check for admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
    AND email = 'abhiramkakarla1@gmail.com'
  )
$$;

-- Update get_user_role to return 'paid' for admins
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if user is admin
  SELECT public.is_admin(_user_id) INTO is_admin_user;
  
  IF is_admin_user THEN
    RETURN 'paid'::app_role;
  END IF;
  
  -- Return stored role or default to 'free'
  RETURN COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = _user_id),
    'free'::app_role
  );
END;
$function$;