DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'matchmaking_queue'
      AND policyname = 'mmq update own'
  ) THEN
    CREATE POLICY "mmq update own"
    ON public.matchmaking_queue
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'matchmaking_queue'
      AND policyname = 'mmq delete active matched opponent'
  ) THEN
    CREATE POLICY "mmq delete active matched opponent"
    ON public.matchmaking_queue
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.games g
        WHERE g.status = 'active'
          AND g.created_at > now() - interval '5 minutes'
          AND (
            (g.white_id = auth.uid() AND g.black_id = matchmaking_queue.user_id)
            OR
            (g.black_id = auth.uid() AND g.white_id = matchmaking_queue.user_id)
          )
      )
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.find_or_join_match(p_user uuid, p_time_control integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
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
  WHERE user_id = p_user;

  SELECT user_id INTO opponent
  FROM public.matchmaking_queue
  WHERE user_id <> p_user
    AND time_control = p_time_control
    AND created_at > now() - interval '2 minutes'
  ORDER BY created_at ASC
  LIMIT 1;

  IF opponent IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, time_control)
      VALUES (p_user, p_time_control);
    RETURN NULL;
  END IF;

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

  DELETE FROM public.matchmaking_queue
  WHERE user_id IN (opponent, p_user);

  RETURN new_game_id;
END;
$function$;