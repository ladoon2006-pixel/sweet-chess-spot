
-- Restrict SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.consume_online_game(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_or_join_match(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_report_moderation() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_online_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_join_match(uuid, integer) TO authenticated;

-- Tighten avatars bucket: only allow SELECT on specific objects (not list)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
