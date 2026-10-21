import { describe, expect, test } from "bun:test";
import { ogrCodesForRome } from "./rome-codes";

describe("ogrCodesForRome", () => {
  test("M1805 liste ses 16 codes OGR", () => {
    const ogr = ogrCodesForRome("M1805");
    expect(ogr.length).toBe(16);
    expect(ogr).toContain("10944");
  });

  test("A1101 liste 11987 et les codes sont triés", () => {
    const ogr = ogrCodesForRome("a1101");
    expect(ogr).toContain("11987");
    expect(ogr).toContain("13201");
    const numbers = ogr.map(Number);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  test("code ROME sans OGR ou code inconnu renvoie une liste vide", () => {
    expect(ogrCodesForRome("ZZZZ")).toEqual([]);
  });

  test("champ vide renvoie une liste vide", () => {
    expect(ogrCodesForRome("")).toEqual([]);
  });
});
