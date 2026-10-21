// Référentiel ROME / OGR issu du fichier France Travail « 261014-rome_recherce_videos_metiers.xlsx ».
import data from "./rome-data.json";

// Code ROME -> premier nom de métier de la fiche.
export const ROME_CODES: Record<string, string> = data.rome;
// Code OGR -> [nom de métier, code ROME].
export const OGR_CODES: Record<string, [string, string]> = data.ogr as unknown as Record<string, [string, string]>;

export function normalizeRomeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** Accepte un code ROME (M1805) ou un code OGR (38949). */
export function lookupRomeLabel(input: string): string | null {
  const code = normalizeRomeCode(input);
  if (OGR_CODES[code]) return OGR_CODES[code][0];
  return ROME_CODES[code] ?? null;
}

/** Code ROME : une lettre + 4 chiffres (ex. M1805). */
export function isRomeCodeFormat(input: string): boolean {
  return /^[A-Z]\d{4}$/.test(normalizeRomeCode(input));
}

let ogrByRome: Record<string, string[]> | null = null;

/** Codes OGR associés à un code ROME, triés par ordre croissant. */
export function ogrCodesForRome(romeCode: string): string[] {
  const rome = normalizeRomeCode(romeCode);
  if (!rome) return [];
  if (!ogrByRome) {
    ogrByRome = {};
    for (const [ogr, [, r]] of Object.entries(OGR_CODES)) {
      (ogrByRome[r] ??= []).push(ogr);
    }
    for (const list of Object.values(ogrByRome)) {
      list.sort((a, b) => Number(a) - Number(b));
    }
  }
  return ogrByRome[rome] ?? [];
}

/** Renvoie « M1805 – OGR 38949 » si un code OGR est saisi, sinon le code ROME. */
export function displayRomeCodePair(romeCode: string, ogrCode: string): string {
  const rome = normalizeRomeCode(romeCode);
  const ogr = normalizeRomeCode(ogrCode);
  if (ogr) {
    const found = OGR_CODES[ogr];
    return found ? `${found[1]} – OGR ${ogr}` : `OGR ${ogr}`;
  }
  return rome;
}
