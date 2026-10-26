ALTER TABLE public.collection_video_reviews ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.archive_contributor_videos(target_identifier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE moved integer;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') AND (target_identifier IS NULL OR target_identifier IS DISTINCT FROM public.current_identifier()) THEN
   RAISE EXCEPTION 'Accès refusé';
 END IF;
 LOCK TABLE public.collection_video_reviews IN SHARE ROW EXCLUSIVE MODE;
 INSERT INTO public.validated_video_archives(videos,contributor_identifier)
 SELECT jsonb_agg(v.video),c.contributor_identifier FROM public.collection_video_reviews r
 JOIN public.collections_videos c ON c.id=r.collection_id
 CROSS JOIN LATERAL jsonb_array_elements(c.videos) v(video)
 WHERE r.status='approved' AND r.archived_at IS NULL AND v.video->>'video_id'=r.video_id AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier)
 GROUP BY c.contributor_identifier;
 UPDATE public.collection_video_reviews r SET archived_at=now()
 FROM public.collections_videos c
 WHERE c.id=r.collection_id AND r.status='approved' AND r.archived_at IS NULL AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier);
 GET DIAGNOSTICS moved=ROW_COUNT; RETURN moved;
END
$function$;

COMMENT ON COLUMN public.collection_video_reviews.archived_at IS 'Date d''archivage : la vidéo validée a été placée dans « Vidéos validées archivées » ; la décision Validée reste cochée dans la collection d''origine.';