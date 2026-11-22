import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface TierConfig {
  full?: string[];
  experimental?: string[];
}

const DEFAULT_CONFIG_PATH = fileURLToPath(new URL("../config/models.json", import.meta.url));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Substring match, case-insensitive. Size tokens that start with a digit
 * (e.g. "7b") must not be preceded by another digit, so "7b" matches
 * "qwen-7b" but not "qwen-27b" (which is a different size class).
 */
function matchesToken(model: string, token: string): boolean {
  const m = model.toLowerCase();
  const t = token.toLowerCase();
  if (/^[0-9]/.test(t)) {
    return new RegExp(`(^|[^0-9])${escapeRegExp(t)}`).test(m);
  }
  return m.includes(t);
}

export function tierFor(model: string, configPath?: string): "full" | "experimental" {
  let cfg: TierConfig;
  try {
    cfg = JSON.parse(readFileSync(configPath ?? DEFAULT_CONFIG_PATH, "utf8")) as TierConfig;
  } catch {
    return "experimental";
  }

  if ((cfg.experimental ?? []).some((token) => matchesToken(model, token))) {
    return "experimental";
  }
  if ((cfg.full ?? []).some((token) => matchesToken(model, token))) {
    return "full";
  }
  return "experimental";
}
