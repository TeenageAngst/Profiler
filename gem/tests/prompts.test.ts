import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPrompt, buildMessages } from "../src/prompts.ts";
import type { Corpus } from "../src/types.ts";

const kinds = ["iq", "psychometrics", "themes", "personalInfo"] as const;

for (const k of kinds) {
  test(`loadPrompt: ${k} is non-empty`, () => {
    const p = loadPrompt(k);
    assert.ok(p.length > 50);
    assert.match(p, /\{\{CORPUS\}\}/);
  });
}

test("buildMessages: includes corpus text and requests JSON", () => {
  const corpus: Corpus = { inputs: [{ label: "x", text: "sample text" }], combined: "### SOURCE: x\nsample text" };
  const msgs = buildMessages("iq", corpus, []);
  assert.equal(msgs[0].role, "system");
  assert.match(msgs[1].content, /sample text/);
  assert.match(msgs[0].content, /JSON/i);
});

test("buildMessages: appends prior results when provided", () => {
  const corpus: Corpus = { inputs: [{ label: "x", text: "t" }], combined: "### SOURCE: x\nt" };
  const prior = [{ kind: "iq" as const, model: "m", tier: "full" as const, raw: "{}", parsed: { iq: 120 }, parseError: null, warning: null }];
  const msgs = buildMessages("psychometrics", corpus, prior);
  assert.match(msgs[1].content, /iq/i);
  assert.match(msgs[1].content, /120/);
});
