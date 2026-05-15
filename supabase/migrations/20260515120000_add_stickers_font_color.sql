ALTER TABLE public.events ADD COLUMN IF NOT EXISTS stickers text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS font_color text DEFAULT '#ffffff';
