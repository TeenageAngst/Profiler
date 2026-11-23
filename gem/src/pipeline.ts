import type {
  AnalysisKind,
  AnalysisResult,
  ChatMessage,
  Corpus,
  DeepResult,
  LmStudioConfig,
} from "./types.ts";
import { buildMessagesFromTemplate } from "./prompts.ts";
import { extractJson } from "./parse.ts";

/**
 * Multi-pass "deep" pipeline: extract evidence → synthesize profile →
 * optional critique pass. Prototype scope: IQ only. Each pass is a plain
 * chat call; earlier passes feed forward via {{PRIOR}}. A pass that fails
 * to parse still feeds its raw text forward, mirroring run-all's tolerance.
 */

type ChatFn = (
  cfg: LmStudioConfig,
  model: string,
  messages: ChatMessage[],
) => Promise<string>;

const PASS_TEMPLATES: Record<"extract" | "synthesize" | "critique", string> = {
  extract: "iq-extract.md",
  synthesize: "iq-synthesize.md",
  critique: "iq-critique.md",
};

type PassName = keyof typeof PASS_TEMPLATES;

async function runPass(
  pass: PassName,
  cfg: LmStudioConfig,
  kind: AnalysisKind,
  model: string,
  corpus: Corpus,
  prior: AnalysisResult[],
  tier: "full" | "experimental",
  chatFn: ChatFn,
): Promise<AnalysisResult> {
  const messages = buildMessagesFromTemplate(PASS_TEMPLATES[pass], corpus, prior);
  const raw = await chatFn(cfg, model, messages);
  const { value, error } = extractJson(raw);
  return {
    kind,
    model,
    tier,
    pass,
    raw,
    parsed: value,
    parseError: error,
    warning:
      tier === "experimental"
        ? "experimental model: result may be unreliable (capability floor)"
        : null,
  };
}

export async function runDeep(
  cfg: LmStudioConfig,
  kind: AnalysisKind,
  model: string,
  corpus: Corpus,
  tier: "full" | "experimental",
  opts: { critique?: boolean } = {},
  chatFn: ChatFn = (c, m, msgs) => import("./lmstudio.ts").then((x) => x.chat(c, m, msgs)),
): Promise<DeepResult> {
  const extract = await runPass("extract", cfg, kind, model, corpus, [], tier, chatFn);
  const synthesize = await runPass("synthesize", cfg, kind, model, corpus, [extract], tier, chatFn);
  const passes = [extract, synthesize];
  if (opts.critique) {
    const critique = await runPass("critique", cfg, kind, model, corpus, passes, tier, chatFn);
    passes.push(critique);
  }
  return {
    kind,
    model,
    tier,
    passes,
    final: synthesize,
    warning:
      tier === "experimental"
        ? "deep analysis on experimental-tier model: extraction and synthesis may be unreliable (capability floor)"
        : null,
  };
}
