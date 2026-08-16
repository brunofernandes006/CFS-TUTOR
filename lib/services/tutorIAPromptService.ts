// ============================================================
// CFS Tutor — Serviço de Geração de Prompts (Tutor IA Offline)
// Adapter pattern: pronto para futura integração com API de IA
// ============================================================

import { getDb } from "@/lib/db";
import type { SyllabusItem, Document } from "@/lib/types";
import type { TutorObjective, DepthLevel } from "@/lib/tutorIAConstants";
import { OBJECTIVE_LABELS, DEPTH_LABELS } from "@/lib/tutorIAConstants";

export type { TutorObjective, DepthLevel };

export interface TutorRequest {
  objective: TutorObjective;
  discipline: string;
  syllabus_item_id?: number;
  depth: DepthLevel;
  notes?: string;
}

export interface TutorResult {
  prompt: string;
  objective_label: string;
  related_docs: Document[];
  related_topics: string[];
  origin_alert: string;
  is_question_request: boolean;
}

function getSyllabusItem(id: number): SyllabusItem | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM syllabus_items WHERE id = ?").get(id) as
      | SyllabusItem
      | undefined) ?? null
  );
}

function getRelatedDocs(discipline: string, limit = 5): Document[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, document_uid, tipo, categoria, subcategoria, numero, ano,
              titulo, nome_original, caminho_original, cfs26_priority, edital_reference,
              status_documento
       FROM documents
       WHERE (titulo LIKE ? OR edital_reference LIKE ? OR categoria LIKE ?)
       ORDER BY cfs26_priority DESC, ano DESC
       LIMIT ?`
    )
    .all(`%${discipline}%`, `%${discipline}%`, `%${discipline}%`, limit) as Document[];
}

function getRelatedTopics(syllabusItemId: number): string[] {
  const db = getDb();
  const item = db
    .prepare("SELECT * FROM syllabus_items WHERE id = ?")
    .get(syllabusItemId) as SyllabusItem | undefined;
  if (!item) return [];

  const siblings = db
    .prepare(
      `SELECT title FROM syllabus_items
       WHERE discipline = ? AND id != ? AND (active = 1 OR active IS NULL)
       ORDER BY RANDOM() LIMIT 5`
    )
    .all(item.discipline, syllabusItemId) as { title: string }[];

  return siblings.map((s) => s.title);
}

function buildPrompt(req: TutorRequest, item: SyllabusItem | null): string {
  const depth = DEPTH_LABELS[req.depth];
  const context = item
    ? `Disciplina: ${item.discipline}\nTema: ${item.title}\n${item.category ? `Categoria: ${item.category}` : ""}${item.topic ? `\nTópico: ${item.topic}` : ""}${item.subtopic ? `\nSubtópico: ${item.subtopic}` : ""}`
    : `Disciplina: ${req.discipline}`;
  const notes = req.notes ? `\nObservação do aluno: ${req.notes}` : "";

  const baseContext = `
CONTEXTO:
Você é um tutor especialista no Curso de Formação Específica (CFS) da Polícia Militar do Estado de São Paulo (PMESP).
Nível desejado: ${depth}
${context}${notes}

REGRAS:
- Use linguagem acessível mas tecnicamente precisa.
- Relacione o conteúdo com a prática policial quando pertinente.
- Seja objetivo e didático.
- Cite fundamentação legal quando aplicável.
- Formate com tópicos claros.
`;

  switch (req.objective) {
    case "explicar_tema":
      return `${baseContext}

OBJETIVO: Explique o tema de forma completa e didática.

ESTRUTURA ESPERADA:
1. Definição e conceito-chave
2. Fundamentação legal (se aplicável)
3. Aplicação prática na atividade policial
4. Pontos de atenção para a prova
5. Exemplo prático ou caso
`;

    case "resumir_conteudo":
      return `${baseContext}

OBJETIVO: Crie um resumo conciso e eficiente do tema para revisão rápida.

ESTRUTURA ESPERADA:
1. Tópicos principais (máx. 5 bullets)
2. Fórmulas ou regras essenciais (se houver)
3. Dica de memorização
4. Conexão com outros temas do edital
`;

    case "plano_revisao":
      return `${baseContext}

OBJETIVO: Monte um plano de revisão espaçada para este tema.

ESTRUTURA ESPERADA:
1. Dia 1: Primeira revisão (releitura + resumo)
2. Dia 3: Exercícios práticos
3. Dia 7: Revisão ativa (flashcards)
4. Dia 15: Questões misturadas com outros temas
5. Dia 30: Simulado focado
6. Materias de apoio sugeridas
`;

    case "explicar_erro":
      return `${baseContext}

OBJETIVO: O aluno errou uma questão sobre este tema. Explique o erro comum e como evitá-lo.

ESTRUTURA ESPERADA:
1. Por que o aluno pode ter errado (armadilha comum)
2. Conceito correto explicado passo a passo
3. Regra ou macete para não errar novamente
4. Questão conceitual para fixação
5. Cuidado: não revele gabarito de questões oficiais
`;

    case "flashcards":
      return `${baseContext}

OBJETIVO: Crie 8 flashcards de alta qualidade para estudo deste tema.

FORMATO PARA CADA FLASHCARD:
---
**FRENTE:** [Pergunta ou conceito]
**VERSOR:** [Resposta concisa e completa]
---
Dificuldade: [Fácil/Médio/Difícil]
Conexão: [Tema relacionado]
`;

    case "questoes_ineditas":
      return `${baseContext}

OBJETIVO: Gere 3 questões inéditas de múltipla escolha sobre este tema.

⚠️ IMPORTANTE: Marque todas as questões como ORIGEM: INÉDITA ou DIDÁTICA.
NUNCA rotule como OFICIAL. Estas questões são geradas por IA para estudo.

FORMATO PARA CADA QUESTÃO:
---
**ORIGEM:** [INÉDITA ou DIDÁTICA]
**DIFICULDADE:** [1-5]
**ENUNCIADO:** [Questão completa]
**OPÇÕES:**
A) ...
B) ...
C) ...
D) ...
E) ...
**GABARITO:** [Letra correta]
**EXPLICAÇÃO:** [Explicação didática]
---

REGRAS:
- Questões INÉDITAS: simulam estilo de prova oficial mas são criadas agora
- Questões DIDÁTICAS: mais diretas, focadas em conceito
- Dificuldade 1-2: básico, 3: intermediário, 4-5: avançado
- Sempre incluir explicação
`;

    case "comparar_temas":
      return `${baseContext}

OBJETIVO: Compare este tema com temas relacionados, destacando semelhanças e diferenças.

ESTRUTURA ESPERADA:
1. Tabela comparativa (se aplicável)
2. Pontos em comum
3. Diferenças fundamentais
4. Onde o examinador pode confundir
5. Dica para diferenciar na prova
`;

    case "preparar_sessao":
      return `${baseContext}

OBJETIVO: Prepare uma sessão de estudo estruturada sobre este tema.

ESTRUTURA ESPERADA:
1. Pré-teste rápido (3 perguntas)
2. Leitura focada (tempo estimado)
3. Resumo ativo (o aluno deve escrever)
4. Exercícios práticos
5. Revisão final
6. Autoaviação: o que ficou claro? O que precisa revisar?
`;
  }
}

export function generateTutorPrompt(req: TutorRequest): TutorResult {
  const item = req.syllabus_item_id ? getSyllabusItem(req.syllabus_item_id) : null;
  const prompt = buildPrompt(req, item);
  const related_docs = getRelatedDocs(req.discipline);
  const related_topics = req.syllabus_item_id ? getRelatedTopics(req.syllabus_item_id) : [];
  const is_question_request = req.objective === "questoes_ineditas";

  let origin_alert = "";
  if (is_question_request) {
    origin_alert =
      "⚠️ ATENÇÃO: As questões geradas são INÉDITAS ou DIDÁTICAS. Nunca são oficiais. Use para prática, não como simulado oficial.";
  }

  return {
    prompt,
    objective_label: OBJECTIVE_LABELS[req.objective],
    related_docs,
    related_topics,
    origin_alert,
    is_question_request,
  };
}

export { OBJECTIVE_LABELS, DEPTH_LABELS } from "@/lib/tutorIAConstants";
