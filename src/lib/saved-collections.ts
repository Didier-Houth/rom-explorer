import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Review, SavedCollection, VideoArchive } from "./video-reviews";

export const savedCollectionsOptions = queryOptions({
  queryKey: ["saved-collections"],
  queryFn: async () => {
    const { data, error } = await supabase.from("collections_videos").select("id,name,rome_code,rome_label,videos,created_at,contributor_identifier").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SavedCollection[];
  },
  staleTime: 0,
});

export const videoReviewsOptions = queryOptions({
  queryKey: ["collection-video-reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("collection_video_reviews").select("collection_id,video_id,status");
    if (error) throw new Error(error.message);
    return (data ?? []) as Review[];
  },
  staleTime: 0,
});

export const videoArchivesOptions = queryOptions({
  queryKey: ["validated-video-archives"],
  queryFn: async () => {
    const { data, error } = await supabase.from("validated_video_archives").select("id,videos,created_at,contributor_identifier").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VideoArchive[];
  },
  staleTime: 0,
});