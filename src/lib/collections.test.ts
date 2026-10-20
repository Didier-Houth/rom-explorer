import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { collectionPayload, type CollectionItem } from "./collections";

const item: CollectionItem = {
  romeCode: "M1805", romeLabel: "Développeur",
  video: { videoId: "abcdefghijk", title: "Témoignage", channelTitle: "Chaîne", durationSeconds: 240,
    longLink: "https://youtu.be/abcdefghijk", watchLink: "https://www.youtube.com/watch?v=abcdefghijk",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/default.jpg", description: "Description officielle" },
  transcript: "Transcription fidèle", summary: "Résumé de la transcription",
};

describe("named collections", () => {
  test("stores the name, the ROME reference and every selected video", () => {
    const result = collectionPayload(" Métiers numériques ", [item, { ...item, video: { ...item.video, videoId: "secondvideo" } }], { romeCode: "M1805", romeLabel: "Développeur" });
    assert.equal(result.name, "Métiers numériques");
    assert.equal(result.rome_code, "M1805");
    assert.equal(result.rome_label, "Développeur");
    assert.deepEqual(result.videos.map(v => v.video_id), ["abcdefghijk", "secondvideo"]);
  });
  test("defaults the ROME reference to LIBRE without a code", () => {
    const result = collectionPayload("Collection", [item]);
    assert.equal(result.rome_code, "LIBRE");
    assert.equal(result.rome_label, "");
  });
  test("preserves all attached information", () => {
    assert.deepEqual(collectionPayload("Collection", [item]).videos[0], {
      rome_code: "M1805", rome_label: "Développeur", video_id: "abcdefghijk", title: "Témoignage",
      channel_title: "Chaîne", duration_seconds: 240, long_link: item.video.longLink,
      watch_link: item.video.watchLink, thumbnail_url: item.video.thumbnailUrl,
      description: "Description officielle", transcript: "Transcription fidèle", summary: "Résumé de la transcription",
    });
  });
  test("rejects an unnamed collection", () => { assert.throws(() => collectionPayload("  ", [item])); });
  test("rejects an empty collection", () => { assert.throws(() => collectionPayload("Collection", [])); });
});