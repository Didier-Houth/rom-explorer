CREATE OR REPLACE FUNCTION public.archive_one_video(target_video_id text, target_identifier text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE moved integer;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') AND (target_identifier IS NULL OR target_identifier IS DISTINCT FROM public.current_identifier()) THEN
   RAISE EXCEPTION 'Accès refusé';
 END IF;
 INSERT INTO public.validated_video_archives(videos,contributor_identifier)
 SELECT jsonb_agg(v.video),c.contributor_identifier FROM public.collection_video_reviews r
 JOIN public.collections_videos c ON c.id=r.collection_id
 CROSS JOIN LATERAL jsonb_array_elements(c.videos) v(video)
 WHERE r.video_id=target_video_id AND r.status='approved' AND r.archived_at IS NULL AND v.video->>'video_id'=r.video_id AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier)
 GROUP BY c.contributor_identifier;
 UPDATE public.collection_video_reviews r SET archived_at=now() FROM public.collections_videos c
 WHERE c.id=r.collection_id AND r.video_id=target_video_id AND r.status='approved' AND r.archived_at IS NULL AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier);
 GET DIAGNOSTICS moved=ROW_COUNT; RETURN moved;
END $f$;

CREATE OR REPLACE FUNCTION public.restore_one_video(target_video_id text, target_identifier text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE moved integer;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') AND (target_identifier IS NULL OR target_identifier IS DISTINCT FROM public.current_identifier()) THEN
   RAISE EXCEPTION 'Accès refusé';
 END IF;
 UPDATE public.validated_video_archives a SET videos=COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(a.videos) x WHERE x->>'video_id' IS DISTINCT FROM target_video_id),'[]'::jsonb)
 WHERE (target_identifier IS NULL OR a.contributor_identifier=target_identifier) AND EXISTS (SELECT 1 FROM jsonb_array_elements(a.videos) y WHERE y->>'video_id'=target_video_id);
 DELETE FROM public.validated_video_archives a WHERE jsonb_array_length(a.videos)=0 AND (target_identifier IS NULL OR a.contributor_identifier=target_identifier);
 UPDATE public.collection_video_reviews r SET archived_at=NULL FROM public.collections_videos c
 WHERE c.id=r.collection_id AND r.video_id=target_video_id AND r.status='approved' AND r.archived_at IS NOT NULL AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier);
 GET DIAGNOSTICS moved=ROW_COUNT; RETURN moved;
END $f$;

REVOKE ALL ON FUNCTION public.archive_one_video(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_one_video(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_one_video(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_one_video(text,text) TO authenticated;