import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  buildSearchQuery,
  DEFAULT_ETHICAL_CRITERIA_ID,
  ETHICAL_CRITERIA,
  ethicalTerms,
} from "./ethical-criteria";

describe("Critères éthiques", () => {
  it("« Tous critères » est le choix par défaut", () => {
    assert.equal(DEFAULT_ETHICAL_CRITERIA_ID, "all");
    assert.equal(ethicalTerms(DEFAULT_ETHICAL_CRITERIA_ID).length, 4);
  });

  it("« Tous critères » reprend tous les autres critères", () => {
    const all = ethicalTerms("all");
    for (const criteria of ETHICAL_CRITERIA) {
      if (criteria.id === "all" || criteria.id === "none") continue;
      for (const term of criteria.terms) {
        assert.ok(all.includes(term), `${criteria.label} : « ${term} » manque`);
      }
    }
  });

  it("« Aucun critère » n'ajoute rien à la recherche", () => {
    const query = buildSearchQuery("Je suis [métier]", "boulanger", "none");
    assert.equal(query, "Je suis boulanger");
  });

  it("un critère s'ajoute à la formulation avec le métier", () => {
    const query = buildSearchQuery("Métier de [métier] témoignage", "boulanger", "disability");
    assert.equal(query, "Métier de boulanger témoignage porteur de handicap");
  });

  it("les six choix sont proposés dans l'ordre demandé", () => {
    assert.deepEqual(
      ETHICAL_CRITERIA.map((criteria) => criteria.label),
      [
        "Diversité ethnique",
        "Diversité sexuelle",
        "Diversité générationnelle",
        "Diversité valide / porteur, porteuse de handicap",
        "Tous critères",
        "Aucun critère",
      ],
    );
  });
});
