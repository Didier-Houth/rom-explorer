// Critères éthiques proposés sous la formulation de la recherche.
// Chaque critère apporte des mots-clés à la requête YouTube ; « Tous critères »
// reprend l'ensemble des autres critères et est sélectionné par défaut.

export type EthicalCriteria = {
  id: string;
  label: string;
  terms: readonly string[];
};

export const ETHICAL_CRITERIA = [
  { id: "ethnic", label: "Diversité ethnique", terms: ["diversité ethnique"] },
  { id: "sexual", label: "Diversité sexuelle", terms: ["diversité sexuelle"] },
  { id: "generational", label: "Diversité générationnelle", terms: ["diversité générationnelle"] },
  {
    id: "disability",
    label: "Diversité valide / porteur, porteuse de handicap",
    terms: ["porteur de handicap"],
  },
  {
    id: "all",
    label: "Tous critères",
    terms: [
      "diversité ethnique",
      "diversité sexuelle",
      "diversité générationnelle",
      "porteur de handicap",
    ],
  },
  { id: "none", label: "Aucun critère", terms: [] },
] as const satisfies readonly EthicalCriteria[];

export const DEFAULT_ETHICAL_CRITERIA_ID = "all";

export function ethicalCriteriaById(id: string): EthicalCriteria | undefined {
  return ETHICAL_CRITERIA.find((criteria) => criteria.id === id);
}

export function ethicalTerms(criteriaId: string): readonly string[] {
  return ethicalCriteriaById(criteriaId)?.terms ?? [];
}

// Requête YouTube : la formulation choisie (avec le métier injecté) suivie des mots-clés du critère.
export function buildSearchQuery(template: string, metier: string, criteriaId: string): string {
  const base = template.replace("[métier]", metier).trim();
  return [base, ...ethicalTerms(criteriaId)].join(" ").replace(/\s+/g, " ").trim();
}
