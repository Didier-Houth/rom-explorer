import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  DEFAULT_SEARCH_FORMULATION_ID,
  formulationTemplates,
  mergeVideoResults,
  SEARCH_FORMULATIONS,
} from "./search-formulations";

describe("Formulations de la recherche", () => {
  it("« Tous critères » est le choix par défaut, proposé en premier", () => {
    const first = SEARCH_FORMULATIONS[0];
    assert.ok(first);
    assert.equal(DEFAULT_SEARCH_FORMULATION_ID, "all");
    assert.equal(first.id, "all");
    assert.equal(first.label, "Tous critères");
  });

  it("il n'y a pas de choix « Aucun critère »", () => {
    assert.equal(
      SEARCH_FORMULATIONS.some((formulation) => formulation.label.includes("Aucun critère")),
      false,
    );
  });

  it("« Tous critères » reprend les cinq formulations demandées", () => {
    const all = formulationTemplates("all");
    assert.deepEqual(all, [
      "Métier de [métier] témoignage",
      "[métier] témoignage professionnel",
      "Je suis [métier]",
      "Une journée dans la vie de [métier]",
      "Découvrir le métier de [métier]",
    ]);
  });

  it("une formulation seule n'apporte que sa formulation", () => {
    assert.deepEqual(formulationTemplates("jesuis"), ["Je suis [métier]"]);
    assert.deepEqual(formulationTemplates("inconnu"), []);
  });

  it("le rassemblement dédoublonne les vidéos et garde les plus courtes", () => {
    const merged = mergeVideoResults([
      [
        { videoId: "a", durationSeconds: 30 },
        { videoId: "b", durationSeconds: 90 },
      ],
      [
        { videoId: "b", durationSeconds: 90 },
        { videoId: "c", durationSeconds: 12 },
      ],
    ]);
    assert.deepEqual(
      merged.map((video) => video.videoId),
      ["c", "a", "b"],
    );
  });

  it("le rassemblement s'arrête à douze vidéos", () => {
    const merged = mergeVideoResults([
      Array.from({ length: 15 }, (_, index) => ({ videoId: `v${index}`, durationSeconds: index })),
    ]);
    assert.equal(merged.length, 12);
  });
});
