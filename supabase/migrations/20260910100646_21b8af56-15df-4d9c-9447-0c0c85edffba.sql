CREATE TABLE public.videos_metiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rome_code TEXT NOT NULL,
  rome_label TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT,
  duration_seconds INTEGER,
  long_link TEXT NOT NULL,
  watch_link TEXT NOT NULL,
  thumbnail_url TEXT,
  transcript TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.videos_metiers TO anon;
GRANT SELECT, INSERT ON public.videos_metiers TO authenticated;
GRANT ALL ON public.videos_metiers TO service_role;

ALTER TABLE public.videos_metiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des fiches" ON public.videos_metiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enregistrement public des fiches" ON public.videos_metiers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX videos_metiers_rome_code_idx ON public.videos_metiers (rome_code);