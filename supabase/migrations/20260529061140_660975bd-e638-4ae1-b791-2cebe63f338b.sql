ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS online_games_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_games_remaining integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.pi_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id text UNIQUE NOT NULL,
  txid text,
  amount numeric NOT NULL,
  games_credited integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pi_payments TO authenticated;
GRANT ALL ON public.pi_payments TO service_role;

ALTER TABLE public.pi_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp select own" ON public.pi_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pp insert own" ON public.pi_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_online_game(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof public.profiles%ROWTYPE;
  free_limit constant integer := 10;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
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