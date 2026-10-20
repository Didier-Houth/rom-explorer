ALTER TABLE public.collections_videos ADD COLUMN rome_code TEXT NOT NULL DEFAULT 'LIBRE';
ALTER TABLE public.collections_videos ADD COLUMN rome_label TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.collections_videos.rome_code IS 'Code ROME de la recherche associée à la collection';
COMMENT ON COLUMN public.collections_videos.rome_label IS 'Nom du métier ROME associé à la collection';