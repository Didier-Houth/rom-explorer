import type { VideoResult } from "./youtube.functions";

export type CollectionItem = {
  romeCode: string;
  romeLabel: string;
  video: VideoResult;
  transcript?: string | null;
  summary?: string;
};

export function collectionPayload(name: string, items: CollectionItem[]) {
  if (!name.trim()) throw new Error("Donnez un nom à votre collection.");
  if (!items.length) throw new Error("Sélectionnez au moins une vidéo.");
  return {
    name: name.trim(),
    videos: items.map((item) => ({
      rome_code: item.romeCode || "LIBRE",
      rome_label: item.romeLabel,
      video_id: item.video.videoId,
      title: item.video.title,
      channel_title: item.video.channelTitle,
      duration_seconds: item.video.durationSeconds,
      long_link: item.video.longLink,
      watch_link: item.video.watchLink,
      thumbnail_url: item.video.thumbnailUrl,
      description: item.video.description,
      transcript: item.transcript ?? null,
      summary: item.summary ?? "",
    })),
  };
}