export type ExtractedSourcePage = {
  page_number: number;
  page_text: string;
};

export type QuestionCandidateV2 = {
  questionNumber: number;
  sourcePage: number;
  statement: string;
  options: string[];
  rawBlock: string;
  confidence: number;
};

export type AnswerKeyCandidateV2 = {
  questionNumber: number;
  correctOptionIndex: number | null;
  isAnnulled: boolean;
  sourcePage: number;
  rawFragment: string;
  confidence: number;
};

type WorkingQuestion = {
  questionNumber: number;
  sourcePage: number;
  explicitMarker: boolean;
  statementLines: string[];
  options: string[];
  rawLines: string[];
  currentOption: number | null;
};

function clean(value: string): string {
  return value.replace(/[ \t]+/g, " ").trim();
}

function parseQuestionStart(line: string): { number: number; rest: string; explicit: boolean } | null {
  const explicit = line.match(/^\s*QUEST(?:Ã|A)O\s+(\d{1,3})\s*(?:[.:)\-–—])?\s*(.*)$/i);
  if (explicit) {
    const number = Number(explicit[1]);
    if (number >= 1 && number <= 100) return { number, rest: clean(explicit[2]), explicit: true };
  }

  const numbered = line.match(/^\s*(\d{1,3})\s*[.)]\s+(.+)$/);
  if (numbered) {
    const number = Number(numbered[1]);
    if (number >= 1 && number <= 100) return { number, rest: clean(numbered[2]), explicit: false };
  }
  return null;
}

function parseOptionStart(line: string): { index: number; text: string } | null {
  const match = line.match(/^\s*(?:\(([A-E])\)|([A-E])[).:\-–—])\s*(.+)$/i);
  if (!match) return null;
  const letter = (match[1] ?? match[2]).toUpperCase();
  return { index: letter.charCodeAt(0) - 65, text: clean(match[3]) };
}

function finalizeQuestion(current: WorkingQuestion | null): QuestionCandidateV2 | null {
  if (!current) return null;
  const statement = clean(current.statementLines.join(" "));
  const options = current.options.map(clean).filter(Boolean);

  if (statement.length < 20) return null;
  if (options.length < 4 || options.length > 5) return null;
  if (options.some((option) => option.length < 1)) return null;

  let confidence = current.explicitMarker ? 88 : 78;
  confidence += options.length === 5 ? 8 : 5;
  if (statement.length >= 60) confidence += 3;
  confidence = Math.min(99, confidence);

  return {
    questionNumber: current.questionNumber,
    sourcePage: current.sourcePage,
    statement,
    options,
    rawBlock: current.rawLines.join("\n").trim(),
    confidence,
  };
}

export function parseQuestionCandidates(pages: ExtractedSourcePage[]): QuestionCandidateV2[] {
  const orderedPages = [...pages].sort((a, b) => a.page_number - b.page_number);
  const candidates: QuestionCandidateV2[] = [];
  const seen = new Set<number>();
  let current: WorkingQuestion | null = null;

  const pushCurrent = () => {
    const candidate = finalizeQuestion(current);
    if (candidate && !seen.has(candidate.questionNumber)) {
      seen.add(candidate.questionNumber);
      candidates.push(candidate);
    }
  };

  for (const page of orderedPages) {
    const lines = page.page_text.replace(/\r\n/g, "\n").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const questionStart = parseQuestionStart(line);
      if (questionStart) {
        pushCurrent();
        current = {
          questionNumber: questionStart.number,
          sourcePage: page.page_number,
          explicitMarker: questionStart.explicit,
          statementLines: questionStart.rest ? [questionStart.rest] : [],
          options: [],
          rawLines: [rawLine],
          currentOption: null,
        };
        continue;
      }

      if (!current) continue;
      current.rawLines.push(rawLine);

      const optionStart = parseOptionStart(line);
      if (optionStart) {
        if (optionStart.index !== current.options.length) {
          current.currentOption = null;
          continue;
        }
        current.options.push(optionStart.text);
        current.currentOption = optionStart.index;
        continue;
      }

      if (current.currentOption == null) {
        current.statementLines.push(line);
      } else if (current.options[current.currentOption] != null) {
        current.options[current.currentOption] += ` ${line}`;
      }
    }
  }

  pushCurrent();
  return candidates.sort((a, b) => a.questionNumber - b.questionNumber);
}

export function parseAnswerKeyCandidates(pages: ExtractedSourcePage[]): AnswerKeyCandidateV2[] {
  const byNumber = new Map<number, AnswerKeyCandidateV2>();
  const conflicts = new Set<number>();

  for (const page of [...pages].sort((a, b) => a.page_number - b.page_number)) {
    const lines = page.page_text.replace(/\r\n/g, "\n").split("\n");
    for (const line of lines) {
      const regex = /(?:^|\s)(\d{1,3})\s*(?:[-–—.:)]\s*)?([A-E*])(?=\s|$|[;,|])/gi;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const questionNumber = Number(match[1]);
        if (questionNumber < 1 || questionNumber > 100) continue;
        const token = match[2].toUpperCase();
        const isAnnulled = token === "*";
        const correctOptionIndex = isAnnulled ? null : token.charCodeAt(0) - 65;
        const existing = byNumber.get(questionNumber);
        if (
          existing &&
          (existing.correctOptionIndex !== correctOptionIndex || existing.isAnnulled !== isAnnulled)
        ) {
          conflicts.add(questionNumber);
          continue;
        }
        if (!existing) {
          byNumber.set(questionNumber, {
            questionNumber,
            correctOptionIndex,
            isAnnulled,
            sourcePage: page.page_number,
            rawFragment: match[0].trim(),
            confidence: isAnnulled ? 95 : 90,
          });
        }
      }
    }
  }

  for (const number of conflicts) byNumber.delete(number);
  const result = [...byNumber.values()].sort((a, b) => a.questionNumber - b.questionNumber);
  const sequenceBonus = result.length >= 20 ? 5 : 0;
  return result.map((item) => ({ ...item, confidence: Math.min(99, item.confidence + sequenceBonus) }));
}
