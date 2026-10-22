import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { nextReviewStatus, validatedVideos, videoReferences, archivedVideos, archiveAfterConfirmation, type SavedCollection, type SavedVideo } from "./video-reviews";

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

describe("clearing validated videos", () => {
  test("cancellation never archives or clears videos", async () => {
    let calls = 0;
    assert.equal(await archiveAfterConfirmation(false, async () => { calls++; }), false);
    assert.equal(calls, 0);
  });
  test("confirmation executes atomic archival once", async () => {
    let calls = 0;
    assert.equal(await archiveAfterConfirmation(true, async () => { calls++; }), true);
    assert.equal(calls, 1);
  });
  test("archive retains all attached information and ROME/OGR references", () => {
    const fullVideo = { ...video, description: "Description", transcript: "Transcription complète", ogr_code: "61" };
    assert.deepEqual(archivedVideos([{ id: "archive", videos: [fullVideo], created_at: "2026-10-22" }]), [fullVideo]);
  });
  test("repeated clearing accumulates archives without losing distinct métiers", () => {
    const other = { ...video, rome_code: "M1805", rome_label: "Développeur" };
    assert.deepEqual(archivedVideos([
      { id: "first", videos: [video], created_at: "2026-10-22" },
      { id: "second", videos: [video, other], created_at: "2026-10-23" },
    ]), [video, other]);
  });
  test("reset approvals removes videos from live collection without modifying originals", () => {
    assert.deepEqual(validatedVideos([collection], [{ collection_id: collection.id, video_id: video.video_id, status: "pending" }]), []);
    assert.deepEqual(collection.videos, [video]);
  });
});