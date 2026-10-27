DROP POLICY IF EXISTS "Lecture publique des fiches" ON public.videos_metiers;
CREATE POLICY "Signed-in users read fiches" ON public.videos_metiers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.videos_metiers FROM anon;