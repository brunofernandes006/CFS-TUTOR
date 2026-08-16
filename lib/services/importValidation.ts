// ============================================================
// CFS Tutor — Validação de Importação de Questões
// ============================================================

const VALID_DISCIPLINES = new Set([
  "Língua Portuguesa",
  "Matemática e Raciocínio Lógico",
  "Conhecimentos Profissionais",
]);

const VALID_ORIGINS = new Set(["OFICIAL", "INEDITA", "DIDATICA"]);

export interface ImportQuestion {
  question_uid: string;
  origin: string;
  discipline: string;
  syllabus_uid: string;
  statement: string;
  options: Array<{ option_text: string }>;
  correct_option: number;
  explanation?: string;
  theme?: string;
  subtheme?: string;
  difficulty?: number;
  year?: number;
  exam?: string;
  number?: number;
  source?: string;
  verified?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateImportQuestion(
  q: ImportQuestion,
  validSyllabusUids: Set<string>
): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!q.question_uid?.trim()) errors.push("question_uid ausente ou vazio");
  if (!q.origin?.trim()) errors.push("origin ausente");
  if (!q.discipline?.trim()) errors.push("discipline ausente");
  if (!q.syllabus_uid?.trim()) errors.push("syllabus_uid ausente");
  if (!q.statement?.trim() || q.statement.trim().length < 10)
    errors.push("enunciado muito curto (mín. 10 caracteres)");

  // Valid origin
  if (q.origin && !VALID_ORIGINS.has(q.origin)) {
    errors.push(`origem inválida: ${q.origin}`);
  }

  // Valid discipline
  if (q.discipline && !VALID_DISCIPLINES.has(q.discipline)) {
    errors.push(`disciplina inválida: ${q.discipline}`);
  }

  // Syllabus UID exists
  if (q.syllabus_uid && validSyllabusUids.size > 0 && !validSyllabusUids.has(q.syllabus_uid)) {
    errors.push(`syllabus_uid não encontrado no catálogo: ${q.syllabus_uid}`);
  }

  // Options validation
  const options = q.options || [];
  if (options.length < 4 || options.length > 5) {
    errors.push(`número inválido de alternativas: ${options.length} (esperado 4-5)`);
  } else {
    for (let i = 0; i < options.length; i++) {
      if (!options[i]?.option_text?.trim()) {
        errors.push(`alternativa ${i} vazia`);
      }
    }
  }

  // Correct option
  if (
    typeof q.correct_option !== "number" ||
    q.correct_option < 0 ||
    q.correct_option >= options.length
  ) {
    errors.push(`gabarito inválido: ${q.correct_option} (range: 0-${options.length - 1})`);
  }

  // OFICIAL rules
  if (q.origin === "OFICIAL") {
    const missing: string[] = [];
    if (!q.verified) missing.push("verified=true");
    if (!q.year) missing.push("year");
    if (!q.exam?.trim()) missing.push("exam");
    if (!q.number) missing.push("number");
    if (!q.source?.trim()) missing.push("source");
    if (missing.length > 0) {
      errors.push(`OFICIAL sem campos obrigatórios: ${missing.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface BatchReport {
  imported: number;
  rejected: number;
  duplicated: number;
  invalid: number;
  reasons: string[];
}

export function validateImportBatch(
  questions: ImportQuestion[],
  existingQuestionUids: Set<string>,
  validSyllabusUids: Set<string>
): {
  valid: ImportQuestion[];
  report: BatchReport;
} {
  const valid: ImportQuestion[] = [];
  const seenUids = new Set<string>();
  const reasons: string[] = [];
  let rejected = 0;
  let duplicated = 0;
  let invalid = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const uid = q.question_uid || `#${i}`;

    // Duplicate question_uid check (only against existingQuestionUids and seenUids within batch)
    if (existingQuestionUids.has(uid) || seenUids.has(uid)) {
      duplicated++;
      reasons.push(`DUPLICADA [${uid}]: question_uid já existe`);
      continue;
    }

    // Validate fields (uses validSyllabusUids for syllabus validation)
    const result = validateImportQuestion(q, validSyllabusUids);
    if (!result.valid) {
      invalid++;
      reasons.push(`INVÁLIDA [${uid}]: ${result.errors.join("; ")}`);
      continue;
    }

    seenUids.add(uid);
    valid.push(q);
  }

  return {
    valid,
    report: {
      imported: valid.length,
      rejected,
      duplicated,
      invalid,
      reasons,
    },
  };
}
