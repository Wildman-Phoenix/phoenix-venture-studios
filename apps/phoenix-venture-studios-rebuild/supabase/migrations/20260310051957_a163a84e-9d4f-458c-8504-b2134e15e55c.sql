
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('intelligence-images', 'intelligence-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read intelligence images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'intelligence-images');

CREATE POLICY "Service role can manage intelligence images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'intelligence-images')
WITH CHECK (bucket_id = 'intelligence-images');
