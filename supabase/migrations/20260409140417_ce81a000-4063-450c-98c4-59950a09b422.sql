
-- Create event_photos table
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos viewable by everyone" ON public.event_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload photos" ON public.event_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_photos;

-- Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view event photos" ON storage.objects FOR SELECT USING (bucket_id = 'event-photos');
CREATE POLICY "Authenticated users can upload event photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos');
