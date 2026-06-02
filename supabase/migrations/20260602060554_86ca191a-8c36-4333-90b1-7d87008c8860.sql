CREATE OR REPLACE FUNCTION public.find_or_join_match(p_user uuid, p_time_control integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  opponent UUID;
  new_game_id UUID;
  is_white BOOLEAN;
  initial_ms integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_time_control NOT IN (0, 5, 10, 20) THEN
    RAISE EXCEPTION 'invalid time control';
  END IF;

  DELETE FROM public.matchmaking_queue
  WHERE created_at < now() - interval '10 minutes';

  SELECT user_id INTO opponent
  FROM public.matchmaking_queue
  WHERE user_id <> p_user
    AND time_control = p_time_control
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF opponent IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, time_control)
      VALUES (p_user, p_time_control)
      ON CONFLICT (user_id) DO UPDATE
        SET time_control = EXCLUDED.time_control,
            created_at = now();
    RETURN NULL;
  END IF;

  DELETE FROM public.matchmaking_queue
  WHERE user_id IN (opponent, p_user);

  is_white := (random() < 0.5);
  initial_ms := CASE WHEN p_time_control > 0 THEN p_time_control * 60 * 1000 ELSE NULL END;

  INSERT INTO public.games (white_id, black_id, time_control, white_time_left_ms, black_time_left_ms, last_move_at)
  VALUES (
    CASE WHEN is_white THEN p_user ELSE opponent END,
    CASE WHEN is_white THEN opponent ELSE p_user END,
    p_time_control,
    initial_ms,
    initial_ms,
    now()
  )
  RETURNING id INTO new_game_id;

  RETURN new_game_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_or_join_match(uuid, integer) TO authenticated;

DO $$
BEGIN
  ALTER TABLE public.games REPLICA IDENTITY FULL;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
END $$;