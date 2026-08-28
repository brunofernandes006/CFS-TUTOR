import { getDisciplineWeightedShare } from "@/lib/config/studyWeights";

export interface PriorityInput {
  discipline: string;
  mastery?: number | null;
  questionCount?: number | null;
  recurrentErrors?: number | null;
  overdueReview?: boolean;
  studied?: boolean;
  incidence?: number | null;
}

export interface PriorityResult {
  score: number;
  level: "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA";
  reasons: string[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calculateStudyPriority(input: PriorityInput): PriorityResult {
  const reasons: string[] = [];
  const disciplineWeight = getDisciplineWeightedShare(input.discipline);

  const hasEvidence = (input.questionCount ?? 0) >= 5;
  const mastery = input.mastery == null ? null : clamp01(input.mastery > 1 ? input.mastery / 100 : input.mastery);
  const weakness = mastery == null || !hasEvidence ? 0.55 : 1 - mastery;

  const recurrence = clamp01((input.recurrentErrors ?? 0) / 4);
  const reviewUrgency = input.overdueReview ? 1 : 0;
  const unstudied = input.studied === false ? 1 : 0;

  // Incidência só entra quando existe dado real extraído do banco de provas.
  const incidence = input.incidence == null ? 0.5 : clamp01(input.incidence);

  const raw =
    disciplineWeight * 0.34 +
    weakness * 0.25 +
    incidence * 0.16 +
    recurrence * 0.12 +
    reviewUrgency * 0.08 +
    unstudied * 0.05;

  const score = Math.round(clamp01(raw) * 100);

  if (disciplineWeight === 0.5) reasons.push("Conhecimentos Profissionais representam 50% da nota ponderada.");
  else if (disciplineWeight === 0.3) reasons.push("Língua Portuguesa representa 30% da nota ponderada.");
  else reasons.push("Matemática representa 20% da nota ponderada.");

  if (input.studied === false) reasons.push("Conteúdo ainda não estudado.");
  if (input.overdueReview) reasons.push("Revisão vencida.");
  if ((input.recurrentErrors ?? 0) >= 2) reasons.push("Há erro recorrente neste assunto.");
  if (mastery != null && hasEvidence && mastery < 0.6) reasons.push("Desempenho atual crítico.");
  if (!hasEvidence) reasons.push("Ainda há poucos dados para afirmar domínio.");
  if (input.incidence == null) reasons.push("Incidência histórica ainda não medida; valor neutro aplicado.");

  const level: PriorityResult["level"] =
    score >= 78 ? "CRÍTICA" : score >= 62 ? "ALTA" : score >= 45 ? "MÉDIA" : "BAIXA";

  return { score, level, reasons };
}
