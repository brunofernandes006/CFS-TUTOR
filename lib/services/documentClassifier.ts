export type SourceCategory =
  | "EDITAL"
  | "PROVA"
  | "GABARITO"
  | "LEGISLACAO"
  | "DIREITOS_HUMANOS"
  | "NORMA_PMESP"
  | "DIRETRIZ"
  | "NOTA_DE_INSTRUCAO"
  | "ORDEM_DE_SERVICO"
  | "DESPACHO"
  | "PORTARIA"
  | "ICC"
  | "PROCESSO_OPERACIONAL"
  | "APOSTILA"
  | "OUTRO";

export interface ClassificationResult {
  category: SourceCategory;
  confidence: number;
  destination: string;
  needsReview: boolean;
  detected: {
    year?: number;
    board?: string;
    number?: string;
  };
  reasons: string[];
}

interface Rule {
  category: SourceCategory;
  destination: string;
  patterns: RegExp[];
  base: number;
}

const RULES: Rule[] = [
  { category: "GABARITO", destination: "provas/gabaritos", base: 78, patterns: [/\bgabarito\b/i, /respostas?\s+oficiais?/i, /gabarito\s+oficial/i] },
  { category: "EDITAL", destination: "editais", base: 82, patterns: [/\bedital\b/i, /edital\s+n(?:o|º)?/i] },
  { category: "NOTA_DE_INSTRUCAO", destination: "normas/notas-de-instrucao", base: 84, patterns: [/nota\s+de\s+instrucao/i, /\bni\s+pm3/i] },
  { category: "ORDEM_DE_SERVICO", destination: "normas/ordens-de-servico", base: 84, patterns: [/ordem\s+de\s+servico/i, /\bos\s+pm3/i] },
  { category: "DESPACHO", destination: "normas/despachos", base: 84, patterns: [/\bdespacho\b/i, /despacho\s+pm3/i] },
  { category: "PORTARIA", destination: "normas/portarias", base: 84, patterns: [/\bportaria\b/i, /portaria\s+(?:do\s+cmt\s+g\s+)?n/i] },
  { category: "ICC", destination: "normas/icc", base: 84, patterns: [/\bicc\b/i, /instrucao\s+continuada/i] },
  { category: "PROCESSO_OPERACIONAL", destination: "normas/processos-operacionais", base: 82, patterns: [/\bprocesso\s*\d+\.\d+(?:\.\d+)?/i, /procedimento\s+operacional/i, /processo\s+operacional/i] },
  { category: "DIRETRIZ", destination: "normas/diretrizes", base: 84, patterns: [/\bdiretriz\b/i, /diretriz\s+pm3/i] },
  { category: "DIREITOS_HUMANOS", destination: "legislacao/direitos-humanos", base: 80, patterns: [/direitos?\s+humanos?/i, /pacto\s+de\s+san\s+jose/i, /\bdudh\b/i, /declaracao\s+universal/i] },
  { category: "LEGISLACAO", destination: "legislacao", base: 76, patterns: [/constituicao/i, /codigo\s+penal/i, /codigo\s+de\s+processo\s+penal/i, /\beca\b/i, /decreto\s+lei/i, /lei\s+(?:complementar\s+)?n/i] },
  { category: "APOSTILA", destination: "materiais-complementares", base: 72, patterns: [/\bapostila\b/i, /material\s+didatico/i] },
  { category: "PROVA", destination: "provas", base: 72, patterns: [/\bprova\b/i, /caderno\s+de\s+quest/i, /questao\s+0?1/i] },
  { category: "NORMA_PMESP", destination: "normas/outras", base: 64, patterns: [/\bpm[1-6]\b/i, /policia\s+militar\s+do\s+estado\s+de\s+sao\s+paulo/i, /\bbol\s+g\s+pm\b/i] },
];

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifySourceDocument(fileName: string, sampleText = ""): ClassificationResult {
  const corpus = `${normalize(fileName)}\n${normalize(sampleText.slice(0, 16000))}`;
  const board = /\bvunesp\b/i.test(corpus) ? "VUNESP" : /\bfgv\b/i.test(corpus) ? "FGV" : /\bcetro\b/i.test(corpus) ? "CETRO" : undefined;
  const yearMatch = corpus.match(/\b(20\d{2})\b/);
  const numberMatch = corpus.match(/\b(?:pm\d\s*)?\d{3}\/\d{2}\/\d{2}\b/i);

  let best: { rule: Rule; matches: number; score: number } | null = null;
  for (const rule of RULES) {
    const matches = rule.patterns.reduce((sum, pattern) => sum + (pattern.test(corpus) ? 1 : 0), 0);
    if (matches === 0) continue;

    let score = rule.base + Math.min(14, (matches - 1) * 7);
    if ((rule.category === "PROVA" || rule.category === "GABARITO") && board) score += 6;
    if ((rule.category === "PROVA" || rule.category === "GABARITO") && yearMatch) score += 4;
    score = Math.min(98, score);

    if (!best || score > best.score) best = { rule, matches, score };
  }

  const detected = {
    board,
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    number: numberMatch?.[0],
  };

  if (!best) {
    return {
      category: "OUTRO",
      confidence: 30,
      destination: "pendentes",
      needsReview: true,
      detected,
      reasons: ["Nenhuma regra determinística atingiu confiança mínima."],
    };
  }

  const needsReview = best.score < 90;
  return {
    category: best.rule.category,
    confidence: best.score,
    destination: best.rule.destination,
    needsReview,
    detected,
    reasons: [
      `Classificação por ${best.matches} evidência(s) determinística(s).`,
      needsReview
        ? "Exige confirmação antes de alimentar o banco de estudo."
        : "Confiança suficiente para organização automática.",
    ],
  };
}
