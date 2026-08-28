import type { ExtractedSourcePage } from "@/lib/services/examParserV2";

export type DisciplineCodeV2 = "PROF" | "PORT" | "MAT";

export type SyllabusCandidateV2 = {
  disciplineCode: DisciplineCodeV2;
  editalCode: string;
  parentEditalCode: string | null;
  title: string;
  sourcePage: number;
  confidence: number;
};

type WorkingItem = Omit<SyllabusCandidateV2, "title" | "confidence"> & { lines: string[] };

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function detectDiscipline(line: string): DisciplineCodeV2 | null {
  const normalized = normalize(line);
  if (normalized.includes("CONHECIMENTOS PROFISSIONAIS")) return "PROF";
  if (normalized.includes("LINGUA PORTUGUESA") || normalized.includes("PORTUGUES")) return "PORT";
  if (normalized.includes("MATEMATICA")) return "MAT";
  return null;
}

function parentCode(code: string): string | null {
  const parts = code.split(".");
  if (parts.length <= 2) return null;
  return parts.slice(0, -1).join(".");
}

function finalize(item: WorkingItem | null): SyllabusCandidateV2 | null {
  if (!item) return null;
  const title = item.lines.join(" ").replace(/\s+/g, " ").trim();
  if (title.length < 3) return null;
  let confidence = 85;
  if (/^\d+(?:\.\d+){1,4}$/.test(item.editalCode)) confidence += 5;
  if (title.length >= 15) confidence += 3;
  return { ...item, title, confidence: Math.min(98, confidence) };
}

export function parseSyllabusCandidates(pages: ExtractedSourcePage[]): SyllabusCandidateV2[] {
  const candidates: SyllabusCandidateV2[] = [];
  const seen = new Set<string>();
  let discipline: DisciplineCodeV2 | null = null;
  let current: WorkingItem | null = null;

  const pushCurrent = () => {
    const candidate = finalize(current);
    if (!candidate) return;
    const key = `${candidate.disciplineCode}:${candidate.editalCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(candidate);
    }
  };

  for (const page of [...pages].sort((a, b) => a.page_number - b.page_number)) {
    for (const rawLine of page.page_text.replace(/\r\n/g, "\n").split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;

      const detectedDiscipline = detectDiscipline(line);
      if (detectedDiscipline) {
        pushCurrent();
        current = null;
        discipline = detectedDiscipline;
        continue;
      }

      if (!discipline) continue;
      const numbered = line.match(/^\s*(\d+(?:\.\d+){1,4})\s*[.)-]?\s+(.+)$/);
      if (numbered) {
        pushCurrent();
        current = {
          disciplineCode: discipline,
          editalCode: numbered[1],
          parentEditalCode: parentCode(numbered[1]),
          sourcePage: page.page_number,
          lines: [numbered[2].trim()],
        };
        continue;
      }

      if (current) current.lines.push(line);
    }
  }

  pushCurrent();
  return candidates.sort((a, b) => {
    if (a.disciplineCode !== b.disciplineCode) return a.disciplineCode.localeCompare(b.disciplineCode);
    return a.editalCode.localeCompare(b.editalCode, undefined, { numeric: true });
  });
}
