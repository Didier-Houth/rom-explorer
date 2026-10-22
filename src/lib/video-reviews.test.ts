import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { nextReviewStatus, validatedVideos, videoReferences, type SavedCollection, type SavedVideo } from "./video-reviews";

const video: SavedVideo = { video_id: "abcdefghijk", rome_code: "C1107 – OGR 61", rome_label: "Chargé d'indemnisations", title: "Métier", channel_title: "Chaîne", duration_seconds: 90, long_link: "https://youtu.be/abcdefghijk", watch_link: "https://www.youtube.com/watch?v=abcdefghijk", thumbnail_url: "", summary: "Résumé" };
const collection: SavedCollection = { id: "collection", name: "Assurances", rome_code: video.rome_code, rome_label: video.rome_label, videos: [video], created_at: "2026-10-22" };

describe("video review decisions", () => {
  test("Refusée replaces Validée", () => assert.equal(nextReviewStatus("approved", "rejected", true), "rejected"));
  test("Validée replaces Refusée", () => assert.equal(nextReviewStatus("rejected", "approved", true), "approved"));
  test("unchecking restores pending", () => assert.equal(nextReviewStatus("approved", "approved", false), "pending"));
  test("general collection contains only approved videos", () => {
    assert.deepEqual(validatedVideos([collection], [{ collection_id: "collection", video_id: video.video_id, status: "approved" }]), [video]);
    assert.deepEqual(validatedVideos([collection], [{ collection_id: "collection", video_id: video.video_id, status: "rejected" }]), []);
    assert.deepEqual(validatedVideos([collection], []), []);
  });
  test("preserves separate ROME, OGR and métier", () => assert.deepEqual(videoReferences(video), { rome: "C1107", ogr: "61", metier: "Chargé d'indemnisations" }));
  test("does not invent an OGR for older videos", () => assert.equal(videoReferences({ ...video, rome_code: "M1805" }).ogr, ""));
  test("duplicates merge without losing distinct métier references", () => {
    const second = { ...collection, id: "second" };
    const reviews = [collection, second].map(c => ({ collection_id: c.id, video_id: video.video_id, status: "approved" as const }));
    assert.equal(validatedVideos([collection, second], reviews).length, 1);
    assert.equal(validatedVideos([collection, { ...second, videos: [{ ...video, rome_code: "M1805" }] }], reviews).length, 2);
  });
});