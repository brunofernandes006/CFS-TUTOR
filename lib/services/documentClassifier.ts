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

const RULES: Array<{ category: SourceCategory; patterns: RegExp[]; destination: string }> = [
  { category: "GABARITO", destination: "provas/gabaritos", patterns: [/gabarito/i, /respostas?\s+oficiais?/i] },
  { category: "PROVA", destination: "provas", patterns: [/\bprova\b/i, /caderno\s+de\s+quest/i, /vunesp/i, /fgv/i, /cetro/i] },
  { category: "EDITAL", destination: "editais", patterns: [/edital/i] },
  { category: "ICC", destination: "normas/icc", patterns: [/\bicc\b/i, /instru[cç][aã]o\s+continuada/i] },
  { category: "DIRETRIZ", destination: "normas/diretrizes", patterns: [/diretriz/i, /\bpm3[-_ ]?\d{3}\/\d{2}\/\d{2}\b/i] },
  { category: "NOTA_DE_INSTRUCAO", destination: "normas/notas-de-instrucao", patterns: [/nota\s+de\s+instru[cç][aã]o/i, /\bni\s+pm3/i] },
  { category: "ORDEM_DE_SERVICO", destination: "normas/ordens-de-servico", patterns: [/ordem\s+de\s+servi[cç]o/i, /\bos\s+pm3/i] },
  { category: "DESPACHO", destination: "normas/despachos", patterns: [/despacho/i] },
  { category: "PORTARIA", destination: "normas/portarias", patterns: [/portaria/i] },
  { category: "PROCESSO_OPERACIONAL", destination: "normas/processos-operacionais", patterns: [/processo\s*\d+\.\d+/i, /procedimento\s+operacional/i, /processo\s+operacional/i] },
  { category: "DIREITOS_HUMANOS", destination: "legislacao/direitos-humanos", patterns: [/direitos?\s+humanos?/i, /pacto\s+de\s+san\s+jos[eé]/i, /dudh/i] },
  { category: "LEGISLACAO", destination: "legislacao", patterns: [/constitui[cç][aã]o/i, /c[oó]digo\s+penal/i, /processo\s+penal/i, /eca\b/i, /decreto[- ]lei/i, /lei\s+(complementar\s+)?n[º°]?/i] },
  { category: "APOSTILA", destination: "materiais-complementares", patterns: [/apostila/i, /material\s+did[aá]tico/i] },
];

function normalize(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, " ").replace(/[_-]+/g, " ");
}

export function classifySourceDocument(fileName: string, sampleText = ""): ClassificationResult {
  const corpus = `${normalize(fileName)}\n${normalize(sampleText.slice(0, 12000))}`;
  let best: { category: SourceCategory; destination: string; matches: number } | null = null;

  for (const rule of RULES) {
    const matches = rule.patterns.reduce((sum, pattern) => sum + (pattern.test(corpus) ? 1 : 0), 0);
    if (!best || matches > best.matches) best = { category: rule.category, destination: rule.destination, matches };
  }

  const board = /vunesp/i.test(corpus) ? "VUNESP" : /fgv/i.test(corpus) ? "FGV" : /cetro/i.test(corpus) ? "CETRO" : undefined;
  const yearMatch = corpus.match(/\b(20\d{2})\b/);
  const numberMatch = corpus.match(/\b(?:PM\d-)?\d{3}\/\d{2}\/\d{2}\b/i);

  if (!best || best.matches === 0) {
    return {
      category: "OUTRO",
      confidence: 35,
      destination: "pendentes",
      needsReview: true,
      detected: { board, year: yearMatch ? Number(yearMatch[1]) : undefined, number: numberMatch?.[0] },
      reasons: ["Nenhuma regra determinística atingiu confiança suficiente."],
    };
  }

  const confidence = Math.min(98, 62 + best.matches * 14 + (board ? 5 : 0));
  return {
    category: best.category,
    confidence,
    destination: best.destination,
    needsReview: confidence < 90,
    detected: { board, year: yearMatch ? Number(yearMatch[1]) : undefined, number: numberMatch?.[0] },
    reasons: [`Classificação por ${best.matches} correspondência(s) determinística(s).`, confidence < 90 ? "Exige confirmação antes de alimentar o banco de estudo." : "Confiança suficiente para organização automática."],
  };
}
