CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.current_identifier()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT identifier FROM public.profiles WHERE id = auth.uid() $$;

DROP POLICY "Lecture publique des collections" ON public.collections_videos;
CREATE POLICY "Owner or admin reads collections" ON public.collections_videos FOR SELECT TO authenticated
  USING (contributor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Public review readback" ON public.collection_video_reviews;
CREATE POLICY "Owner or admin reads reviews" ON public.collection_video_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collections_videos c WHERE c.id = collection_id AND (c.contributor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

DROP POLICY "Public archived video readback" ON public.validated_video_archives;
CREATE POLICY "Owner or admin reads archives" ON public.validated_video_archives FOR SELECT TO authenticated
  USING (contributor_identifier = public.current_identifier() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.archive_contributor_videos(target_identifier text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
 WHERE r.status='approved' AND v.video->>'video_id'=r.video_id AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier)
 GROUP BY c.contributor_identifier;
 UPDATE public.collection_video_reviews r SET status='pending' FROM public.collections_videos c
 WHERE c.id=r.collection_id AND r.status='approved' AND (target_identifier IS NULL OR c.contributor_identifier=target_identifier);
 GET DIAGNOSTICS moved=ROW_COUNT; RETURN moved;
END $function$;