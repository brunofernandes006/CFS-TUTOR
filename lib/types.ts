// ============================================================
// CFS Tutor — Tipos TypeScript centrais
// Espelham o schema do cfs_catalogo.db
// ============================================================

// ------------------------------------------------------------
// Usuário local
// ------------------------------------------------------------
export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Syllabus
// ------------------------------------------------------------
export interface SyllabusItem {
  id: number;
  syllabus_uid: string | null;
  parent_id: number | null;
  discipline: string;
  category: string | null;
  topic: string | null;
  subtopic: string | null;
  title: string;
  edital_text: string | null;
  edital_order: number | null;
  weight: number | null;
  question_count: number | null;
  required: number | null;
  active: number | null;
  source_reference: string | null;
  coverage_status: string | null;
}

export interface SyllabusProgress {
  id: number;
  user_id: number;
  syllabus_item_id: number;
  studied: number;
  mastery_score: number;
  questions_answered: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  consecutive_correct: number;
  consecutive_wrong: number;
  last_study: string | null;
  next_review: string | null;
  review_stage: number;
  review_count: number;
}

export type MasteryLevel = "CRÍTICO" | "FRACO" | "EM_DESENVOLVIMENTO" | "BOM" | "DOMINADO";

export interface SyllabusItemWithProgress extends SyllabusItem {
  progress: SyllabusProgress | null;
  mastery_level: MasteryLevel;
  questions_available: number;
}

// ------------------------------------------------------------
// Questões
// ------------------------------------------------------------
export type QuestionOrigin = "OFICIAL" | "INEDITA" | "DIDATICA";

export interface Question {
  id: number;
  question_uid: string;
  origin: QuestionOrigin;
  syllabus_item_id: number;
  discipline: string;
  theme: string | null;
  subtheme: string | null;
  difficulty: number;
  statement: string;
  explanation: string | null;
  active: number;
  verified: number;
  created_at: string;
}

export interface QuestionOption {
  id: number;
  question_id: number;
  option_index: number;
  option_text: string;
  is_correct: number;
}

export interface QuestionSource {
  id: number;
  question_id: number;
  exam_year: number | null;
  exam_name: string | null;
  exam_number: number | null;
  source_text: string | null;
  verified: number;
  document_uid: string | null;
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
  source: QuestionSource | null;
}

// ------------------------------------------------------------
// Tentativas
// ------------------------------------------------------------
export interface QuestionAttempt {
  id: number;
  user_id: number;
  syllabus_item_id: number;
  question_id: number | null;
  is_correct: number;
  response_time_seconds: number | null;
  difficulty_perceived: number | null;
  attempt_number: number | null;
  timestamp: string;
}

// ------------------------------------------------------------
// Caderno de Erros
// ------------------------------------------------------------
export interface ErrorNotebookEntry {
  id: number;
  user_id: number;
  question_id: number;
  chosen_option_index: number | null;
  correct_option_index: number | null;
  theme: string | null;
  subtheme: string | null;
  error_count: number;
  confusion_type: string | null;
  last_error_at: string;
  created_at: string;
  updated_at: string;
  // joins
  question?: Question;
  options?: QuestionOption[];
}

// ------------------------------------------------------------
// Revisão
// ------------------------------------------------------------
export interface ReviewItem {
  syllabus_item_id: number;
  title: string;
  discipline: string;
  mastery_score: number;
  mastery_level: MasteryLevel;
  review_stage: number;
  next_review: string | null;
  overdue: boolean;
}

// ------------------------------------------------------------
// Missão Diária
// ------------------------------------------------------------
export type MissionSlotType = "RECICLAGEM" | "FRACO" | "NOVO" | "CONSOLIDACAO";

export interface MissionSlot {
  syllabus_item_id: number;
  title: string;
  discipline: string;
  mission_type: MissionSlotType;
  priority_score: number;
  time_allocated_minutes: number;
  mastery_score: number;
  mastery_level: MasteryLevel;
  reason: string;
}

export interface DailyMission {
  mission_date: string;
  target_duration_minutes: number;
  slots: MissionSlot[];
  total_items: number;
  completed_items: number;
  completed: boolean;
}

// ------------------------------------------------------------
// Prontidão com confiança
// ------------------------------------------------------------
export type ReadinessConfidence = "SEM_DADOS" | "INICIAL" | "PARCIAL" | "SUFICIENTE";

export interface ReadinessResult {
  /** Score bruto 0–100 (fórmula completa) */
  readiness_raw: number;
  /** Score ajustado pelo fator de confiança (exibir ao usuário) */
  readiness_display: number;
  /** Fator 0.0–1.0 aplicado ao score bruto */
  confidence_factor: number;
  /** Rótulo qualitativo da confiança */
  confidence_label: ReadinessConfidence;
  /** Componentes para depuração / exibição detalhada */
  components: {
    avg_mastery: number;
    coverage: number;
    reviews_on_time: number;
    recent_performance: number;
    questions_answered: number;
    items_studied: number;
    disciplines_with_data: number;
  };
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export interface DashboardStats {
  user: User;
  level: GamificationLevel;
  xp: number;
  xp_to_next: number;
  streak: number;
  readiness: ReadinessResult;
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
  pending_reviews: number;
  weak_items: number;
  edital_coverage: number;
  discipline_summary: DisciplineSummary[];
  recent_activity: RecentActivity[];
}

export interface DisciplineSummary {
  discipline: string;
  weight: number;
  /** Domínio médio dos itens estudados (0–100) */
  mastery_of_studied: number;
  /** Cobertura: itens estudados / total da disciplina (0–100) */
  coverage_pct: number;
  /** Domínio consolidado = mastery_of_studied × coverage_pct / 100 */
  consolidated_mastery: number;
  mastery_level: MasteryLevel;
  items_total: number;
  items_studied: number;
}

export interface RecentActivity {
  date: string;
  questions_answered: number;
  correct: number;
}

// ------------------------------------------------------------
// Gamificação
// ------------------------------------------------------------
export type GamificationLevel =
  | "Recruta"
  | "Patrulheiro"
  | "Especialista"
  | "Veterano"
  | "Elite"
  | "Comando";

export const XP_THRESHOLDS: Record<GamificationLevel, number> = {
  Recruta: 0,
  Patrulheiro: 200,
  Especialista: 500,
  Veterano: 1000,
  Elite: 2000,
  Comando: 4000,
};

export const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  CORRECT_HARD: 15,
  REVIEW_DONE: 20,
  MISSION_DONE: 40,
  SIMULATION_DONE: 100,
} as const;

// ------------------------------------------------------------
// Biblioteca
// ------------------------------------------------------------
export interface Document {
  id: number;
  document_uid: string;
  tipo: string | null;
  categoria: string | null;
  subcategoria: string | null;
  numero: string | null;
  ano: number | null;
  titulo: string | null;
  nome_original: string | null;
  caminho_original: string | null;
  cfs26_priority: number | null;
  edital_reference: string | null;
  status_documento: string | null;
}

export interface LibraryFilters {
  search?: string;
  tipo?: string;
  categoria?: string;
  cfs26_only?: boolean;
  page?: number;
  per_page?: number;
}

export interface LibraryResult {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

// ============================================================
// Simulados
// ============================================================

export type SimulationType = "OFICIAL" | "ADAPTATIVO";
export type SimulationStatus = "PENDING" | "ACTIVE" | "FINISHED" | "ABANDONED";

// Configuração fixa do modo oficial
export const OFFICIAL_SIMULATION = {
  QUESTIONS_PER_DISCIPLINE: 20,
  TOTAL_QUESTIONS: 60,
  TIME_LIMIT_SECONDS: 12600, // 3h30
  POINTS_PER_CORRECT: 0.5,
  MIN_CORRECT_PER_DISCIPLINE: 10,
  MIN_SCORE_PER_DISCIPLINE: 5.0,
  DISCIPLINE_WEIGHTS: {
    "Língua Portuguesa": 3,
    "Matemática e Raciocínio Lógico": 2,
    "Conhecimentos Profissionais": 5,
  } as Record<string, number>,
  WEIGHT_DIVISOR: 10,
} as const;

// Erro estruturado quando não há questões suficientes
export interface SimulationInsufficientError {
  error: "SIMULATION_INSUFFICIENT_QUESTIONS";
  required: Record<string, number>;
  available: Record<string, number>;
  missing: Record<string, number>;
}

// Tabela simulations
export interface Simulation {
  id: number;
  user_id: number;
  simulation_type: SimulationType;
  status: SimulationStatus;
  target_questions: number;
  time_limit_seconds: number;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  score_portuguese: number | null;
  score_math: number | null;
  score_professional: number | null;
  weighted_final_score: number | null;
  minimums_met: number | null; // 0 | 1
  created_at: string;
  updated_at: string;
}

// Tabela simulation_questions
export interface SimulationQuestion {
  id: number;
  simulation_id: number;
  question_id: number;
  discipline: string;
  order_number: number;
  weight: number;
  answered: number; // 0 | 1
  created_at: string;
}

// Tabela simulation_answers
export interface SimulationAnswer {
  id: number;
  simulation_id: number;
  question_id: number;
  selected_option_index: number;
  correct_option_index: number;
  is_correct: number; // 0 | 1
  response_time_seconds: number | null;
  answered_at: string;
}

// Score calculado por disciplina
export interface DisciplineScore {
  discipline: string;
  correct: number;
  total: number;
  score: number;        // acertos × 0.5
  minimum_met: boolean; // >= 10 acertos
}

// Resultado completo do simulado
export interface SimulationResult {
  simulation_id: number;
  simulation_type: SimulationType;
  total_questions: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy_pct: number;
  discipline_scores: DisciplineScore[];
  weighted_final_score: number;
  minimums_met: boolean;
  elapsed_seconds: number;
  // Desempenho por syllabus_item (questão → syllabus_item_id)
  by_syllabus_item: Array<{
    syllabus_item_id: number;
    title: string;
    correct: number;
    total: number;
  }>;
  // Lista de erros
  errors: Array<{
    question_id: number;
    discipline: string;
    selected_option_index: number;
    correct_option_index: number;
  }>;
}

// Item do histórico
export interface SimulationHistoryItem {
  id: number;
  simulation_type: SimulationType;
  status: SimulationStatus;
  target_questions: number;
  correct: number | null;
  weighted_final_score: number | null;
  minimums_met: number | null;
  elapsed_seconds: number | null;
  created_at: string;
  finished_at: string | null;
}
