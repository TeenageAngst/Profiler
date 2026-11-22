import { test } from "node:test";
import assert from "node:assert/strict";
import { runAnalysis } from "../src/runner.ts";
import type { Corpus } from "../src/types.ts";

const corpus: Corpus = { inputs: [{ label: "x", text: "t" }], combined: "### SOURCE: x\nt" };

test("runAnalysis: parses valid JSON and sets tier", async () => {
  const cfg = { baseUrl: "http://x/v1" };
  const fakeChat = async () => '{"iq_estimate":120}';
  const r = await runAnalysis(cfg, "iq", "m", corpus, [], "full", fakeChat);
  assert.equal(r.parseError, null);
  assert.deepEqual(r.parsed, { iq_estimate: 120 });
  assert.equal(r.tier, "full");
  assert.equal(r.warning, null);
});

test("runAnalysis: invalid JSON yields parseError, raw preserved", async () => {
  const cfg = { baseUrl: "http://x/v1" };
  const fakeChat = async () => "not json";
  const r = await runAnalysis(cfg, "iq", "m", corpus, [], "full", fakeChat);
  assert.equal(r.parsed, null);
  assert.ok(r.parseError);
  assert.equal(r.raw, "not json");
});

test("runAnalysis: experimental tier sets warning", async () => {
  const cfg = { baseUrl: "http://x/v1" };
  const fakeChat = async () => '{"iq_estimate":120}';
  const r = await runAnalysis(cfg, "iq", "m", corpus, [], "experimental", fakeChat);
  assert.equal(r.tier, "experimental");
  assert.match(r.warning ?? "", /experimental/i);
});
