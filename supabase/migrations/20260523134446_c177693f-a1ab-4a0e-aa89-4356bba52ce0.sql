-- fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- revoke from public; handle_new_user is only ever called by trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- switch matchmaking to SECURITY INVOKER (RLS allows all authenticated to read queue)
CREATE OR REPLACE FUNCTION public.find_or_join_match(p_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  opponent UUID;
  new_game_id UUID;
  is_white BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id INTO opponent
  FROM public.matchmaking_queue
  WHERE user_id <> p_user
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF opponent IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id) VALUES (p_user)
      ON CONFLICT (user_id) DO NOTHING;
    RETURN NULL;
  END IF;

  DELETE FROM public.matchmaking_queue WHERE user_id IN (opponent, p_user);

  is_white := (random() < 0.5);
  INSERT INTO public.games (white_id, black_id)
  VALUES (
    CASE WHEN is_white THEN p_user ELSE opponent END,
    CASE WHEN is_white THEN opponent ELSE p_user END
  )
  RETURNING id INTO new_game_id;

  RETURN new_game_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.find_or_join_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_join_match(UUID) TO authenticated;