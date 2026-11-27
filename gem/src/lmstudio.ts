import { Agent } from "undici";
import type { ChatMessage, LmStudioConfig } from "./types.ts";

// LM Studio holds non-streaming responses until generation finishes; undici's
// default 300s headers timeout kills long passes, so raise it well beyond that.
const lmAgent = new Agent({ headersTimeout: 30 * 60_000, bodyTimeout: 30 * 60_000 });

function requestError(label: string, e: unknown): Error {
  const err = e as Error & { cause?: Error };
  const causeMsg = err.cause?.message ? `: ${err.cause.message}` : "";
  return new Error(`LM Studio request failed (${label}): ${err.message}${causeMsg}`, { cause: e });
}

export async function listModels(cfg: LmStudioConfig): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/models`, { dispatcher: lmAgent } as RequestInit);
  } catch (e) {
    throw requestError("listModels", e);
  }
  if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
  const json = (await res.json()) as { data?: { id: string }[] };
  return (json.data ?? []).map((m) => m.id);
}

export async function chat(cfg: LmStudioConfig, model: string, messages: ChatMessage[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      dispatcher: lmAgent,
    } as RequestInit);
  } catch (e) {
    throw requestError(model, e);
  }
  if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
