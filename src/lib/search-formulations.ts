// Formulations proposées sous « Formulation de la recherche ».
// « Tous critères » est sélectionné par défaut : il lance une recherche par formulation
// puis rassemble les vidéos trouvées. Il n'existe pas de choix « Aucun critère » ici.

export type SearchFormulation = {
  id: string;
  label: string;
  // Formulations YouTube à lancer (avec [métier] à injecter).
  templates: readonly string[];
};

const SEARCH_FORMULATION_ITEMS = [
  { id: "temoignage", template: "Métier de [métier] témoignage" },
  { id: "professionnel", template: "[métier] témoignage professionnel" },
  { id: "jesuis", template: "Je suis [métier]" },
  { id: "journee", template: "Une journée dans la vie de [métier]" },
  { id: "decouvrir", template: "Découvrir le métier de [métier]" },
] as const;

export const SEARCH_FORMULATIONS: readonly SearchFormulation[] = [
  {
    id: "all",
    label: "Tous critères",
    templates: SEARCH_FORMULATION_ITEMS.map((item) => item.template),
  },
  ...SEARCH_FORMULATION_ITEMS.map((item) => ({
    id: item.id,
    label: item.template,
    templates: [item.template],
  })),
];

export const DEFAULT_SEARCH_FORMULATION_ID = "all";

// Formulations à lancer pour le choix sélectionné (« Tous critères » : toutes les autres).
export function formulationTemplates(formulationId: string): readonly string[] {
  return SEARCH_FORMULATIONS.find((formulation) => formulation.id === formulationId)?.templates ?? [];
}

// Rassemble les vidéos de plusieurs recherches : une seule fois par vidéo, les plus courtes d'abord.
export function mergeVideoResults<T extends { videoId: string; durationSeconds: number }>(
  groups: readonly T[][],
  limit = 12,
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const group of groups) {
    for (const video of group) {
      if (seen.has(video.videoId)) continue;
      seen.add(video.videoId);
      merged.push(video);
    }
  }
  return merged.sort((a, b) => a.durationSeconds - b.durationSeconds).slice(0, limit);
}
