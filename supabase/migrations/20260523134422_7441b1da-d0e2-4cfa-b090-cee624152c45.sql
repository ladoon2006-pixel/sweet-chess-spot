-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::text, 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ friendships ============
CREATE TYPE public.friend_status AS ENUM ('pending','accepted','blocked');
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friend_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friend select own" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friend insert own" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friend update participant" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friend delete own" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============ games ============
CREATE TYPE public.game_status AS ENUM ('active','checkmate','stalemate','draw','resigned','abandoned');
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id UUID NOT NULL REFERENCES public.profiles(id),
  black_id UUID NOT NULL REFERENCES public.profiles(id),
  fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT NOT NULL DEFAULT '',
  turn CHAR(1) NOT NULL DEFAULT 'w',
  status public.game_status NOT NULL DEFAULT 'active',
  winner_id UUID REFERENCES public.profiles(id),
  last_move_from TEXT,
  last_move_to TEXT,
  last_move_san TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX games_white_idx ON public.games(white_id);
CREATE INDEX games_black_idx ON public.games(black_id);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games select participant" ON public.games FOR SELECT TO authenticated
  USING (auth.uid() = white_id OR auth.uid() = black_id);
CREATE POLICY "games insert participant" ON public.games FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = white_id OR auth.uid() = black_id);
CREATE POLICY "games update participant" ON public.games FOR UPDATE TO authenticated
  USING (auth.uid() = white_id OR auth.uid() = black_id);

-- ============ game chat ============
CREATE TABLE public.game_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gcm_game_idx ON public.game_chat_messages(game_id, created_at);
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gcm select participant" ON public.game_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND (g.white_id = auth.uid() OR g.black_id = auth.uid())));
CREATE POLICY "gcm insert participant" ON public.game_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND (g.white_id = auth.uid() OR g.black_id = auth.uid())));

-- ============ friend chat ============
CREATE TABLE public.friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fm_pair_idx ON public.friend_messages(sender_id, receiver_id, created_at);
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fm select own" ON public.friend_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "fm insert own" ON public.friend_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "fm update receiver" ON public.friend_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- ============ matchmaking queue ============
CREATE TABLE public.matchmaking_queue (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mmq select all" ON public.matchmaking_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "mmq insert own" ON public.matchmaking_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mmq delete own" ON public.matchmaking_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- atomic matchmaking RPC
CREATE OR REPLACE FUNCTION public.find_or_join_match(p_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  opponent UUID;
  new_game_id UUID;
  is_white BOOLEAN;
BEGIN
  -- lock to prevent races
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

GRANT EXECUTE ON FUNCTION public.find_or_join_match(UUID) TO authenticated;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER games_touch BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER friend_touch BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
ALTER TABLE public.games REPLICA IDENTITY FULL;