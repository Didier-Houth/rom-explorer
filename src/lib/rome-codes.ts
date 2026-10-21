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

/** Renvoie « M1805 – OGR 38949 » si un code OGR est saisi, sinon le code ROME. */
export function displayRomeCode(input: string): string {
  const code = normalizeRomeCode(input);
  const ogr = OGR_CODES[code];
  return ogr ? `${ogr[1]} – OGR ${code}` : code;
}
