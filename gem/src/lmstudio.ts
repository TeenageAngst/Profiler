import type { ChatMessage, LmStudioConfig } from "./types.ts";

export async function listModels(cfg: LmStudioConfig): Promise<string[]> {
  const res = await fetch(`${cfg.baseUrl}/models`);
  if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
  const json = (await res.json()) as { data?: { id: string }[] };
  return (json.data ?? []).map((m) => m.id);
}

export async function chat(cfg: LmStudioConfig, model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
