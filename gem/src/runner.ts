import type { AnalysisKind, AnalysisResult, Corpus, LmStudioConfig } from "./types.ts";
import { buildMessages } from "./prompts.ts";
import { extractJson } from "./parse.ts";

type ChatFn = (
  cfg: LmStudioConfig,
  model: string,
  messages: ReturnType<typeof buildMessages>,
) => Promise<string>;

export async function runAnalysis(
  cfg: LmStudioConfig,
  kind: AnalysisKind,
  model: string,
  corpus: Corpus,
  prior: AnalysisResult[],
  tier: "full" | "experimental",
  chatFn: ChatFn = (c, m, msgs) => import("./lmstudio.ts").then((x) => x.chat(c, m, msgs)),
): Promise<AnalysisResult> {
  const messages = buildMessages(kind, corpus, prior);
  const raw = await chatFn(cfg, model, messages);
  const { value, error } = extractJson(raw);
  return {
    kind,
    model,
    tier,
    raw,
    parsed: value,
    parseError: error,
    warning:
      tier === "experimental"
        ? "experimental model: result may be unreliable (capability floor)"
        : null,
  };
}
