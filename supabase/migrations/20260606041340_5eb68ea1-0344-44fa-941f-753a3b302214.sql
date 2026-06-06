
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
UPDATE public.profiles SET display_name = username WHERE display_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname TEXT := 'player_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, uname, uname)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
