CREATE TABLE public.collections_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  videos jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_name_nonempty CHECK (length(btrim(name)) > 0),
  CONSTRAINT collection_videos_nonempty CHECK (jsonb_typeof(videos) = 'array' AND jsonb_array_length(videos) > 0)
);
GRANT SELECT, INSERT ON public.collections_videos TO anon, authenticated;
GRANT ALL ON public.collections_videos TO service_role;
ALTER TABLE public.collections_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des collections" ON public.collections_videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enregistrement public des collections" ON public.collections_videos FOR INSERT TO anon, authenticated WITH CHECK (true);
COMMENT ON TABLE public.collections_videos IS 'Named public video collections; each row stores an atomic snapshot of every video and its attached information.';