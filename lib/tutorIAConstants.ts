// ============================================================
// CFS Tutor — Constantes do Tutor IA
// Compartilhadas entre client e server
// ============================================================

export type TutorObjective =
  | "explicar_tema"
  | "resumir_conteudo"
  | "plano_revisao"
  | "explicar_erro"
  | "flashcards"
  | "questoes_ineditas"
  | "comparar_temas"
  | "preparar_sessao";

export type DepthLevel = "basico" | "intermediario" | "avancado";

export const OBJECTIVE_LABELS: Record<TutorObjective, string> = {
  explicar_tema: "Explicar um Tema",
  resumir_conteudo: "Resumir Conteúdo",
  plano_revisao: "Montar Plano de Revisão",
  explicar_erro: "Explicar um Erro",
  flashcards: "Criar Flashcards",
  questoes_ineditas: "Gerar Questões Inéditas",
  comparar_temas: "Comparar Temas",
  preparar_sessao: "Preparar Sessão de Estudo",
};

export const DEPTH_LABELS: Record<DepthLevel, string> = {
  basico: "Básico (conceitos fundamentais)",
  intermediario: "Intermediário (aplicação prática)",
  avancado: "Avançado (aprofundamento e nuances)",
};
