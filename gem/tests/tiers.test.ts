import { test } from "node:test";
import assert from "node:assert/strict";
import { tierFor } from "../src/tiers.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function writeConfig(cfg: { full: string[]; experimental: string[] }): string {
  const dir = join(tmpdir(), "gem-tiers-" + Math.random());
  mkdirSync(dir, { recursive: true });
  const p = join(dir, "models.json");
  writeFileSync(p, JSON.stringify(cfg));
  return p;
}

test("tierFor: known full model", () => {
  const p = writeConfig({ full: ["qwen-27b", "gemma-31b-dense"], experimental: [] });
  assert.equal(tierFor("qwen-27b-instruct", p), "full");
});

test("tierFor: unknown model defaults to experimental", () => {
  const p = writeConfig({ full: ["qwen-27b"], experimental: [] });
  assert.equal(tierFor("some-7b-model", p), "experimental");
});

test("tierFor: substring match", () => {
  const p = writeConfig({ full: ["gemma-31b"], experimental: [] });
  assert.equal(tierFor("org/gemma-31b-dense-q4", p), "full");
});

test("tierFor: matching is case-insensitive", () => {
  const p = writeConfig({ full: ["Qwen-27B"], experimental: [] });
  assert.equal(tierFor("QWEN-27B-INSTRUCT", p), "full");
});

test("tierFor: experimental token overrides full token", () => {
  const p = writeConfig({ full: ["qwen", "27b"], experimental: ["26b"] });
  assert.equal(tierFor("qwen-26b-moe", p), "experimental");
});

test("tierFor: missing config file defaults to experimental", () => {
  assert.equal(tierFor("qwen-27b", join(tmpdir(), "does-not-exist-" + Math.random(), "models.json")), "experimental");
});

test("tierFor: default config classifies shipped models", () => {
  assert.equal(tierFor("qwen2.5-27b-instruct"), "full");
  assert.equal(tierFor("gemma-3-26b-moe"), "experimental");
});
