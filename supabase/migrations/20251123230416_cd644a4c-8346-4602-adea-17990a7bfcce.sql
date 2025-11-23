-- Create storage bucket for welcome images
INSERT INTO storage.buckets (id, name, public)
VALUES ('welcome-images', 'welcome-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload images
CREATE POLICY "Admins can upload welcome images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'welcome-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow authenticated admins to update images
CREATE POLICY "Admins can update welcome images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'welcome-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow authenticated admins to delete images
CREATE POLICY "Admins can delete welcome images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'welcome-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow everyone to view images (public bucket)
CREATE POLICY "Anyone can view welcome images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'welcome-images');