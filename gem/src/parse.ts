export function extractJson(text: string): { value: unknown; error: string | null } {
  const trimmed = text.trim();
  const candidates: string[] = [];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));

  candidates.push(trimmed);

  for (const c of candidates) {
    try {
      return { value: JSON.parse(c), error: null };
    } catch {
      // try next candidate
    }
  }

  return { value: null, error: "could not parse JSON from model output" };
}
