export type DisciplineCode = "PROF" | "PORT" | "MAT";
export type MasteryBand = "CRITICO" | "FRACO" | "ATENCAO" | "BOM" | "FORTE";
export type PriorityLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";

export interface DisciplineV2 {
  id: number;
  code: DisciplineCode;
  name: string;
  exam_questions: number;
  exam_weight: number;
  weighted_share: number;
}

export interface TopicCandidateV2 {
  id: string;
  title: string;
  discipline: string;
  weightedShare: number;
  studied: boolean;
  mastery: number | null;
  evidenceCount: number;
  recurrentErrors: number;
  nextReviewAt: string | null;
  incidence: number | null;
}

export interface MissionSlotV2 {
  syllabusItemId: string;
  title: string;
  discipline: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  minutes: number;
  mastery: number | null;
  reason: string[];
}

export interface DailyMissionV2 {
  date: string;
  targetMinutes: number;
  slots: MissionSlotV2[];
}

export interface HomeDataV2 {
  setupRequired: boolean;
  mission: DailyMissionV2;
  stats: {
    questionsAnswered: number;
    accuracy: number | null;
    topicsStudied: number;
    pendingReviews: number;
    readiness: number | null;
    evidenceSufficient: boolean;
  };
  weakPoint: { title: string; mastery: number; discipline: string } | null;
  disciplineWeights: Array<{ name: string; share: number }>;
}
