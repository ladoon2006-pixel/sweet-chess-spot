
-- Friend challenges (invitations to play)
CREATE TABLE public.game_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  time_control INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  game_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_challenges TO authenticated;
GRANT ALL ON public.game_challenges TO service_role;

ALTER TABLE public.game_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges select participant" ON public.game_challenges
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "challenges insert from self" ON public.game_challenges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND from_user <> to_user);

CREATE POLICY "challenges update participant" ON public.game_challenges
  FOR UPDATE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "challenges delete participant" ON public.game_challenges
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_challenges;

-- RPC: accept a challenge -> creates a game with both players, marks accepted, returns game_id
CREATE OR REPLACE FUNCTION public.accept_game_challenge(p_challenge UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ch public.game_challenges%ROWTYPE;
  new_game_id UUID;
  is_white BOOLEAN;
  initial_ms INTEGER;
BEGIN
  SELECT * INTO ch FROM public.game_challenges WHERE id = p_challenge FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found'; END IF;
  IF auth.uid() <> ch.to_user THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF ch.status <> 'pending' THEN RAISE EXCEPTION 'already handled'; END IF;

  is_white := (random() < 0.5);
  initial_ms := CASE WHEN ch.time_control > 0 THEN ch.time_control * 60 * 1000 ELSE NULL END;

  INSERT INTO public.games (white_id, black_id, time_control, white_time_left_ms, black_time_left_ms, last_move_at)
  VALUES (
    CASE WHEN is_white THEN ch.from_user ELSE ch.to_user END,
    CASE WHEN is_white THEN ch.to_user ELSE ch.from_user END,
    ch.time_control, initial_ms, initial_ms, now()
  )
  RETURNING id INTO new_game_id;

  UPDATE public.game_challenges
    SET status = 'accepted', game_id = new_game_id
    WHERE id = p_challenge;

  RETURN new_game_id;
END;
$$;
