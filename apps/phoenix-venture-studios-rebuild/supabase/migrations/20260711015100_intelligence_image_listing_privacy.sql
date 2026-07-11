-- The bucket itself is public for known asset URLs; a broad object SELECT
-- policy is unnecessary and allows anonymous directory listing.
DROP POLICY IF EXISTS "Anyone can read intelligence images" ON storage.objects;
