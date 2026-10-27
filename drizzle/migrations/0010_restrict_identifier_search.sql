CREATE OR REPLACE FUNCTION public.find_contributor_identifiers(prefix text) RETURNS TABLE(identifier text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.identifier FROM public.profiles p
 WHERE auth.uid() IS NOT NULL
   AND (p.id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
   AND char_length(regexp_replace(upper(prefix),'[^A-Z0-9]','','g')) BETWEEN 2 AND 12
   AND p.identifier LIKE regexp_replace(upper(prefix),'[^A-Z0-9]','','g') || '%'
 ORDER BY p.identifier LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.find_contributor_identifiers(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_contributor_identifiers(text) TO authenticated;