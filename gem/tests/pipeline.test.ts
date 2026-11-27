import { test } from "node:test";
import assert from "node:assert/strict";
import { runDeep } from "../src/pipeline.ts";
import type { ChatMessage, Corpus } from "../src/types.ts";

const corpus: Corpus = {
  inputs: [{ label: "x", text: "sample text" }],
  combined: "### SOURCE: x\nsample text",
};

const EXTRACT_JSON = JSON.stringify({
  observations: [{ dimension: "vocabulary", quote: "q", signal: "s", reading: "r", confidence: "high" }],
  register_notes: "stable",
  coverage_gaps: "none",
});
const SYNTH_JSON = JSON.stringify({
  iq_estimate: 120, range_1sd: [115, 125], range_2sd: [110, 130],
  confidence: "good", narrative: "n", register_stability: "rs",
  evidence: [], alternative_readings: [], what_would_change_this: [], caveats: [],
});
const CRITIQUE_JSON = JSON.stringify({
  verdict: "v", barnum_flags: [], overreach_flags: [], cherry_picks: [],
  calibration: "c", keep: [], drop: [],
});

function scriptedChat(replies: string[]) {
  const prompts: string[] = [];
  const fn = async (_c: unknown, _m: string, msgs: ChatMessage[]) => {
    prompts.push(msgs[1].content);
    return replies[prompts.length - 1] ?? "{}";
  };
  return { fn, prompts };
}

test("runDeep: extract then synthesize, feeding evidence forward", async () => {
  const { fn, prompts } = scriptedChat([EXTRACT_JSON, SYNTH_JSON]);
  const res = await runDeep({ baseUrl: "http://x/v1" }, "iq", "m", corpus, "full", {}, fn);
  assert.equal(res.passes.length, 2);
  assert.deepEqual(res.passes.map((p) => p.pass), ["extract", "synthesize"]);
  assert.deepEqual(res.final.parsed, JSON.parse(SYNTH_JSON));
  assert.match(prompts[1], /iq \(extract\)/); // prior rendered with pass name
  assert.match(prompts[1], /vocabulary/); // extraction notes reached the synthesis pass
});

test("runDeep: critique pass appends only when requested", async () => {
  const { fn } = scriptedChat([EXTRACT_JSON, SYNTH_JSON, CRITIQUE_JSON]);
  const res = await runDeep({ baseUrl: "http://x/v1" }, "iq", "m", corpus, "full", { critique: true }, fn);
  assert.deepEqual(res.passes.map((p) => p.pass), ["extract", "synthesize", "critique"]);
  assert.equal((res.passes[2].parsed as { verdict: string }).verdict, "v");

  const res2 = await runDeep({ baseUrl: "http://x/v1" }, "iq", "m", corpus, "full", {}, fn);
  assert.equal(res2.passes.length, 2);
});

test("runDeep: extract parse failure feeds raw text to synthesis", async () => {
  const { fn, prompts } = scriptedChat(["not json at all", SYNTH_JSON]);
  const res = await runDeep({ baseUrl: "http://x/v1" }, "iq", "m", corpus, "full", {}, fn);
  assert.ok(res.passes[0].parseError);
  assert.match(prompts[1], /not json at all/);
  assert.equal(res.final.parseError, null);
});

test("runDeep: experimental tier sets warning on passes and result", async () => {
  const { fn } = scriptedChat([EXTRACT_JSON, SYNTH_JSON]);
  const res = await runDeep({ baseUrl: "http://x/v1" }, "iq", "m", corpus, "experimental", {}, fn);
  assert.ok(res.warning);
  assert.ok(res.passes.every((p) => p.warning));
});
