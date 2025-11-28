-- Allow admin to view all user roles
CREATE POLICY "Admin can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = 'abhiramkakarla1@gmail.com'
  )
);

-- Allow admin to insert user roles
CREATE POLICY "Admin can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = 'abhiramkakarla1@gmail.com'
  )
);

-- Allow admin to update user roles
CREATE POLICY "Admin can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = 'abhiramkakarla1@gmail.com'
  )
);

-- Allow admin to delete user roles
CREATE POLICY "Admin can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = 'abhiramkakarla1@gmail.com'
  )
);