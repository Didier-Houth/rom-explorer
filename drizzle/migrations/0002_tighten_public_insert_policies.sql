DROP POLICY IF EXISTS "Enregistrement public des fiches" ON public.videos_metiers;
CREATE POLICY "Enregistrement public des fiches" ON public.videos_metiers
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(rome_code) BETWEEN 1 AND 20
  AND char_length(rome_label) BETWEEN 1 AND 300
  AND video_id ~ '^[A-Za-z0-9_-]{6,20}$'
  AND char_length(title) BETWEEN 1 AND 500
  AND long_link LIKE 'https://youtu.be/%'
  AND watch_link LIKE 'https://www.youtube.com/watch?v=%'
  AND (transcript IS NULL OR char_length(transcript) <= 100000)
  AND (summary IS NULL OR char_length(summary) <= 20000)
);

DROP POLICY IF EXISTS "Enregistrement public des collections" ON public.collections_videos;
CREATE POLICY "Enregistrement public des collections" ON public.collections_videos
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 200
  AND char_length(rome_code) BETWEEN 1 AND 20
  AND char_length(rome_label) <= 300
  AND jsonb_typeof(videos) = 'array'
  AND jsonb_array_length(videos) BETWEEN 1 AND 100
  AND pg_column_size(videos) <= 2000000
);