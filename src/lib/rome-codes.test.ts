import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ogrCodesForRome } from "./rome-codes";

describe("ogrCodesForRome", () => {
  it("M1805 liste ses 16 codes OGR", () => {
    const ogr = ogrCodesForRome("M1805");
    assert.equal(ogr.length, 16);
    assert.ok(ogr.includes("10944"));
  });

  it("A1101 liste 11987 et les codes sont triés", () => {
    const ogr = ogrCodesForRome("a1101");
    assert.ok(ogr.includes("11987"));
    assert.ok(ogr.includes("13201"));
    const numbers = ogr.map(Number);
    assert.deepEqual([...numbers].sort((a, b) => a - b), numbers);
  });

  it("code ROME inconnu renvoie une liste vide", () => {
    assert.deepEqual(ogrCodesForRome("ZZZZ"), []);
  });

  it("champ vide renvoie une liste vide", () => {
    assert.deepEqual(ogrCodesForRome(""), []);
  });
});
