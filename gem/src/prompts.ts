import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AnalysisKind, AnalysisResult, ChatMessage, Corpus } from "./types.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = join(__dir, "..", "prompts");

const FILES: Record<AnalysisKind, string> = {
  iq: "iq.md",
  psychometrics: "psychometrics.md",
  themes: "themes.md",
  personalInfo: "personal-info.md",
};

export function loadPrompt(kind: AnalysisKind): string {
  return readFileSync(join(PROMPT_DIR, FILES[kind]), "utf8");
}

export function loadSystemPrompt(): string {
  return readFileSync(join(PROMPT_DIR, "system.md"), "utf8").trim();
}

function renderPrior(prior: AnalysisResult[]): string {
  if (prior.length === 0) return "(none)";
  return prior
    .map((r) => {
      const body = r.parsed === null ? r.raw : JSON.stringify(r.parsed, null, 2);
      const note = r.parseError
        ? `\n(parse error: ${r.parseError})`
        : r.warning
          ? `\n(warning: ${r.warning})`
          : "";
      return `## ${r.kind}\n${body}${note}`;
    })
    .join("\n\n");
}

export function buildMessages(
  kind: AnalysisKind,
  corpus: Corpus,
  prior: AnalysisResult[],
): ChatMessage[] {
  const template = loadPrompt(kind);
  const content = template
    .replace("{{PRIOR}}", () => renderPrior(prior))
    .replace("{{CORPUS}}", () => corpus.combined);
  return [
    { role: "system", content: loadSystemPrompt() },
    { role: "user", content },
  ];
}
