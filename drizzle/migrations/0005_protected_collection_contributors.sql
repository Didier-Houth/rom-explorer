CREATE SEQUENCE public.contributor_order_seq MINVALUE 1 MAXVALUE 999999 NO CYCLE;
CREATE FUNCTION public.contributor_letters(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT regexp_replace(translate(upper(trim(value)), 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝŸŒ', 'AAAAAAACEEEEIIIINOOOOOOUUUUYYO'), '[^A-Z]', '', 'g') $$;
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_name text NOT NULL,
 last_name text NOT NULL,
 identifier text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own contributor profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE FUNCTION public.assign_contributor_identifier() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF char_length(trim(NEW.first_name)) > 100 OR char_length(trim(NEW.last_name)) > 100 OR char_length(public.contributor_letters(NEW.first_name)) < 2 OR char_length(public.contributor_letters(NEW.last_name)) < 4 THEN
 RAISE EXCEPTION 'Le prénom doit contenir au moins deux lettres et le nom au moins quatre lettres (100 caractères maximum).';
 END IF;
 NEW.first_name := trim(NEW.first_name); NEW.last_name := trim(NEW.last_name);
 NEW.identifier := left(public.contributor_letters(NEW.first_name),2) || left(public.contributor_letters(NEW.last_name),4) || lpad(nextval('public.contributor_order_seq')::text,6,'0');
 RETURN NEW;
END $$;
CREATE TRIGGER assign_contributor_identifier BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_contributor_identifier();
CREATE FUNCTION public.create_signup_contributor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF char_length(public.contributor_letters(coalesce(NEW.raw_user_meta_data->>'first_name',''))) >= 2 AND char_length(public.contributor_letters(coalesce(NEW.raw_user_meta_data->>'last_name',''))) >= 4 THEN
 INSERT INTO public.profiles(id,first_name,last_name,identifier) VALUES(NEW.id,NEW.raw_user_meta_data->>'first_name',NEW.raw_user_meta_data->>'last_name','');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER create_signup_contributor AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_signup_contributor();
CREATE FUNCTION public.register_contributor(first_name text,last_name text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 INSERT INTO public.profiles(id,first_name,last_name,identifier) VALUES(auth.uid(),first_name,last_name,'') ON CONFLICT(id) DO NOTHING;
 SELECT p.identifier INTO result FROM public.profiles p WHERE p.id=auth.uid();
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.register_contributor(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_contributor(text,text) TO authenticated;
CREATE FUNCTION public.find_contributor_identifiers(prefix text) RETURNS TABLE(identifier text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.identifier FROM public.profiles p WHERE char_length(regexp_replace(upper(prefix),'[^A-Z0-9]','','g')) BETWEEN 2 AND 12 AND p.identifier LIKE regexp_replace(upper(prefix),'[^A-Z0-9]','','g') || '%' ORDER BY p.identifier LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.find_contributor_identifiers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_contributor_identifiers(text) TO anon,authenticated;
ALTER TABLE public.collections_videos ADD COLUMN contributor_id uuid REFERENCES public.profiles(id), ADD COLUMN contributor_identifier text;
ALTER POLICY "Enregistrement public des collections" ON public.collections_videos TO authenticated WITH CHECK (
 char_length(btrim(name)) BETWEEN 1 AND 200 AND char_length(rome_code) BETWEEN 1 AND 20 AND char_length(rome_label)<=300 AND jsonb_typeof(videos)='array' AND jsonb_array_length(videos) BETWEEN 1 AND 100 AND pg_column_size(videos)<=2000000
 AND contributor_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.identifier=contributor_identifier)
);
ALTER TABLE public.validated_video_archives ADD COLUMN contributor_identifier text;
CREATE FUNCTION public.archive_contributor_videos(target_identifier text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE moved integer;
BEGIN
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
END $$;
REVOKE ALL ON FUNCTION public.archive_contributor_videos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_contributor_videos(text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.archive_validated_videos() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.archive_contributor_videos(NULL) $$;