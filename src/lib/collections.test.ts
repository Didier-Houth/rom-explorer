import { describe, expect, test } from "bun:test";
import { collectionPayload, type CollectionItem } from "./collections";

const item: CollectionItem = {
  romeCode: "M1805", romeLabel: "Développeur",
  video: { videoId: "abcdefghijk", title: "Témoignage", channelTitle: "Chaîne", durationSeconds: 240,
    longLink: "https://youtu.be/abcdefghijk", watchLink: "https://www.youtube.com/watch?v=abcdefghijk",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/default.jpg", description: "Description officielle" },
  transcript: "Transcription fidèle", summary: "Résumé de la transcription",
};

describe("named collections", () => {
  test("stores the name and every selected video", () => {
    const result = collectionPayload(" Métiers numériques ", [item, { ...item, video: { ...item.video, videoId: "secondvideo" } }]);
    expect(result.name).toBe("Métiers numériques");
    expect(result.videos.map(v => v.video_id)).toEqual(["abcdefghijk", "secondvideo"]);
  });
  test("preserves all attached information", () => {
    expect(collectionPayload("Collection", [item]).videos[0]).toEqual({
      rome_code: "M1805", rome_label: "Développeur", video_id: "abcdefghijk", title: "Témoignage",
      channel_title: "Chaîne", duration_seconds: 240, long_link: item.video.longLink,
      watch_link: item.video.watchLink, thumbnail_url: item.video.thumbnailUrl,
      description: "Description officielle", transcript: "Transcription fidèle", summary: "Résumé de la transcription",
    });
  });
  test("rejects an unnamed collection", () => { expect(() => collectionPayload("  ", [item])).toThrow(); });
  test("rejects an empty collection", () => { expect(() => collectionPayload("Collection", [])).toThrow(); });
});