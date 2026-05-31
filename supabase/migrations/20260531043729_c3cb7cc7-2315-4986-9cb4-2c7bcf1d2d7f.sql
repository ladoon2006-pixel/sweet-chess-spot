
-- 1) Profiles: add moderation + free-game reset fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_permanently_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_free_reset_date date NOT NULL DEFAULT CURRENT_DATE;

-- 2) Matchmaking queue + games: time control (minutes; 0 = unlimited)
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS time_control integer NOT NULL DEFAULT 0;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS time_control integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS white_time_left_ms integer,
  ADD COLUMN IF NOT EXISTS black_time_left_ms integer,
  ADD COLUMN IF NOT EXISTS last_move_at timestamptz;

-- 3) Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('profile','chat')),
  reason text,
  context_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, reported_user_id, type, context_id)
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports insert own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);

CREATE POLICY "reports select own" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- 4) Payments table (separate from pi_payments which we keep for backward compat)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  authority text,
  ref_id text,
  amount_rial bigint NOT NULL,
  games_credited integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled')),
  gateway text NOT NULL DEFAULT 'zarinpal',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments select own" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payments insert own" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5) Trigger: auto warning / ban based on reports count
CREATE OR REPLACE FUNCTION public.apply_report_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.reports WHERE reported_user_id = NEW.reported_user_id;

  IF cnt >= 10 THEN
    UPDATE public.profiles
      SET is_permanently_banned = true, warning_count = cnt
      WHERE id = NEW.reported_user_id;
  ELSIF cnt >= 6 THEN
    UPDATE public.profiles
      SET banned_until = now() + interval '7 days', warning_count = cnt
      WHERE id = NEW.reported_user_id;
  ELSIF cnt >= 3 THEN
    UPDATE public.profiles SET warning_count = cnt WHERE id = NEW.reported_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_report_moderation ON public.reports;
CREATE TRIGGER trg_apply_report_moderation
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.apply_report_moderation();

-- 6) Update consume_online_game: 5 free per day with daily reset
CREATE OR REPLACE FUNCTION public.consume_online_game(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles%ROWTYPE;
  free_limit constant integer := 5;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  -- Ban checks
  IF prof.is_permanently_banned THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'permanently_banned');
  END IF;
  IF prof.banned_until IS NOT NULL AND prof.banned_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'temporarily_banned', 'until', prof.banned_until);
  END IF;

  -- Daily reset
  IF prof.last_free_reset_date < CURRENT_DATE THEN
    UPDATE public.profiles
      SET online_games_played = 0, last_free_reset_date = CURRENT_DATE
      WHERE id = p_user;
    prof.online_games_played := 0;
  END IF;

  IF prof.paid_games_remaining > 0 THEN
    UPDATE public.profiles
      SET paid_games_remaining = paid_games_remaining - 1,
          online_games_played = online_games_played + 1
      WHERE id = p_user;
    RETURN jsonb_build_object('ok', true, 'source', 'paid');
  ELSIF prof.online_games_played < free_limit THEN
    UPDATE public.profiles
      SET online_games_played = online_games_played + 1
      WHERE id = p_user;
    RETURN jsonb_build_object('ok', true, 'source', 'free', 'remaining_free', free_limit - (prof.online_games_played + 1));
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exceeded');
  END IF;
END;
$$;

-- 7) Update find_or_join_match: match by time_control
CREATE OR REPLACE FUNCTION public.find_or_join_match(p_user uuid, p_time_control integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  opponent UUID;
  new_game_id UUID;
  is_white BOOLEAN;
  initial_ms integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id INTO opponent
  FROM public.matchmaking_queue
  WHERE user_id <> p_user AND time_control = p_time_control
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF opponent IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, time_control)
      VALUES (p_user, p_time_control)
      ON CONFLICT (user_id) DO UPDATE SET time_control = EXCLUDED.time_control, created_at = now();
    RETURN NULL;
  END IF;

  DELETE FROM public.matchmaking_queue WHERE user_id IN (opponent, p_user);

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
$$;

-- 8) Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
