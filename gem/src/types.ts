export type AnalysisKind = "iq" | "psychometrics" | "themes" | "personalInfo";

export interface CorpusInput {
  label: string;
  text: string;
}

export interface Corpus {
  inputs: CorpusInput[];
  combined: string;
}

export interface AnalysisResult {
  kind: AnalysisKind;
  model: string;
  tier: "full" | "experimental";
  /** Multi-pass stage name ("extract" | "synthesize" | "critique"); absent for single-pass runs. */
  pass?: string;
  raw: string;
  parsed: unknown | null;
  parseError: string | null;
  warning: string | null;
}

/** Result of a multi-pass (deep) run: the final synthesis plus every pass for inspection. */
export interface DeepResult {
  kind: AnalysisKind;
  model: string;
  tier: "full" | "experimental";
  passes: AnalysisResult[];
  final: AnalysisResult;
  warning: string | null;
}

export interface LmStudioConfig {
  baseUrl: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}