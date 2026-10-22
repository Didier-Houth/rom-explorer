CREATE TABLE public.collection_video_reviews (
 collection_id uuid NOT NULL REFERENCES public.collections_videos(id),
 video_id text NOT NULL CHECK (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
 PRIMARY KEY (collection_id, video_id)
);
GRANT SELECT, INSERT, UPDATE ON public.collection_video_reviews TO anon, authenticated;
GRANT ALL ON public.collection_video_reviews TO service_role;
ALTER TABLE public.collection_video_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public review readback" ON public.collection_video_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Review saved videos only" ON public.collection_video_reviews FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.collections_videos c, jsonb_array_elements(c.videos) v WHERE c.id = collection_id AND v->>'video_id' = collection_video_reviews.video_id));
CREATE POLICY "Change saved video reviews only" ON public.collection_video_reviews FOR UPDATE TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.collections_videos c, jsonb_array_elements(c.videos) v WHERE c.id = collection_id AND v->>'video_id' = collection_video_reviews.video_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.collections_videos c, jsonb_array_elements(c.videos) v WHERE c.id = collection_id AND v->>'video_id' = collection_video_reviews.video_id));