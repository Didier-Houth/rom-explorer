export type ReviewStatus = "pending" | "approved" | "rejected";
export type Review = { collection_id: string; video_id: string; status: ReviewStatus };
export type SavedVideo = {
  rome_code: string; rome_label: string; ogr_code?: string;
  video_id: string; title: string; channel_title: string;
  duration_seconds: number; long_link: string; watch_link: string;
  thumbnail_url: string; summary: string;
  description?: string; transcript?: string | null;
};
export type SavedCollection = {
  id: string; name: string; rome_code: string; rome_label: string;
  contributor_identifier?: string | null;
  videos: SavedVideo[]; created_at: string;
};

export function nextReviewStatus(current: ReviewStatus, choice: Exclude<ReviewStatus, "pending">, checked: boolean): ReviewStatus {
  return checked ? choice : current === choice ? "pending" : current;
}

export function videoReferences(video: SavedVideo) {
  return {
    rome: video.rome_code.match(/[A-N]\d{4}/)?.[0] ?? video.rome_code ?? "LIBRE",
    ogr: video.ogr_code || video.rome_code.match(/OGR\s+(\d+)/i)?.[1] || "",
    metier: video.rome_label,
  };
}

export function rejectedVideos(collections: SavedCollection[], reviews: Review[]): SavedVideo[] {
  return videosWithStatus(collections, reviews, "rejected");
}

export function validatedVideos(collections: SavedCollection[], reviews: Review[]): SavedVideo[] {
  return videosWithStatus(collections, reviews, "approved");
}

function videosWithStatus(collections: SavedCollection[], reviews: Review[], status: ReviewStatus): SavedVideo[] {
  const approved = new Set(reviews.filter(r => r.status === status).map(r => `${r.collection_id}:${r.video_id}`));
  const unique = new Map<string, SavedVideo>();
  for (const collection of collections) {
    for (const video of collection.videos) {
      if (!approved.has(`${collection.id}:${video.video_id}`)) continue;
      const ref = videoReferences(video);
      const key = `${video.video_id}:${ref.rome}:${ref.ogr}:${ref.metier}`;
      if (!unique.has(key)) unique.set(key, video);
    }
  }
  return [...unique.values()];
}

export type VideoArchive = { id: string; videos: SavedVideo[]; created_at: string; contributor_identifier?: string | null };

export function archivedVideos(archives: VideoArchive[]): SavedVideo[] {
  const unique = new Map<string, SavedVideo>();
  for (const archive of archives) {
    for (const video of archive.videos) {
      const ref = videoReferences(video);
      const key = `${video.video_id}:${ref.rome}:${ref.ogr}:${ref.metier}`;
      if (!unique.has(key)) unique.set(key, video);
    }
  }
  return [...unique.values()];
}

export async function archiveAfterConfirmation(confirmed: boolean, archive: () => Promise<unknown>): Promise<boolean> {
  if (!confirmed) return false;
  await archive();
  return true;
}