-- Fix banned_users RLS policies to use is_admin() function
DROP POLICY IF EXISTS "Admins can manage banned users" ON public.banned_users;
DROP POLICY IF EXISTS "Admins can view banned users" ON public.banned_users;

-- Create new policies using is_admin function
CREATE POLICY "Admins can insert banned users"
ON public.banned_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update banned users"
ON public.banned_users
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete banned users"
ON public.banned_users
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all banned users"
ON public.banned_users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix user_roles RLS policies to use is_admin() function
DROP POLICY IF EXISTS "Admin can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can view all user roles" ON public.user_roles;

-- Create new policies using is_admin function
CREATE POLICY "Admins can select all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));