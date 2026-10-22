CREATE TABLE public.validated_video_archives (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 videos jsonb NOT NULL CHECK (jsonb_typeof(videos) = 'array' AND jsonb_array_length(videos) > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.validated_video_archives TO anon, authenticated;
GRANT ALL ON public.validated_video_archives TO service_role;
ALTER TABLE public.validated_video_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public archived video readback" ON public.validated_video_archives FOR SELECT TO anon, authenticated USING (true);
CREATE FUNCTION public.archive_validated_videos() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE snapshot jsonb; moved integer;
BEGIN
 LOCK TABLE public.collection_video_reviews IN SHARE ROW EXCLUSIVE MODE;
 SELECT jsonb_agg(v.video) INTO snapshot
 FROM public.collection_video_reviews r
 JOIN public.collections_videos c ON c.id = r.collection_id
 CROSS JOIN LATERAL jsonb_array_elements(c.videos) v(video)
 WHERE r.status = 'approved' AND v.video->>'video_id' = r.video_id;
 IF snapshot IS NULL THEN RETURN 0; END IF;
 INSERT INTO public.validated_video_archives(videos) VALUES (snapshot);
 UPDATE public.collection_video_reviews SET status = 'pending' WHERE status = 'approved';
 GET DIAGNOSTICS moved = ROW_COUNT;
 RETURN moved;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_validated_videos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_validated_videos() TO anon, authenticated, service_role;