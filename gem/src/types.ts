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
  raw: string;
  parsed: unknown | null;
  parseError: string | null;
  warning: string | null;
}

export interface LmStudioConfig {
  baseUrl: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}