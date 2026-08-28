export type DisciplineKey = "professional" | "portuguese" | "math";

export interface DisciplineWeight {
  key: DisciplineKey;
  label: string;
  questions: number;
  questionWeight: number;
  weightedShare: number;
}

export const CFS_DISCIPLINE_WEIGHTS: Record<DisciplineKey, DisciplineWeight> = {
  professional: {
    key: "professional",
    label: "Conhecimentos Profissionais",
    questions: 20,
    questionWeight: 5,
    weightedShare: 0.5,
  },
  portuguese: {
    key: "portuguese",
    label: "Língua Portuguesa",
    questions: 20,
    questionWeight: 3,
    weightedShare: 0.3,
  },
  math: {
    key: "math",
    label: "Matemática",
    questions: 20,
    questionWeight: 2,
    weightedShare: 0.2,
  },
};

export function disciplineKeyFromLabel(label: string): DisciplineKey {
  const normalized = label.toLocaleLowerCase("pt-BR");
  if (normalized.includes("profission")) return "professional";
  if (normalized.includes("portugu")) return "portuguese";
  return "math";
}

export function getDisciplineWeightedShare(label: string): number {
  return CFS_DISCIPLINE_WEIGHTS[disciplineKeyFromLabel(label)].weightedShare;
}
