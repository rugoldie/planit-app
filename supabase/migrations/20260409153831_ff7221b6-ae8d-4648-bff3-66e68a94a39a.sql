ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gradient_color text DEFAULT '#aaee44';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS font_style text DEFAULT 'Bold';