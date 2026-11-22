import type { Corpus, CorpusInput } from "./types.ts";

export function assembleCorpus(inputs: CorpusInput[]): Corpus {
  const cleaned = inputs.map((i) => ({ label: i.label.trim() || "untitled", text: i.text.trim() }));
  const combined = cleaned
    .map((i) => `### SOURCE: ${i.label}\n${i.text}`)
    .join("\n\n");
  return { inputs: cleaned, combined };
}

export function isEmpty(corpus: Corpus): boolean {
  return corpus.inputs.every((i) => i.text.length === 0);
}
