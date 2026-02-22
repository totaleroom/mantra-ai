CREATE POLICY "Admins can read knowledge files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge' AND (SELECT public.is_admin()));