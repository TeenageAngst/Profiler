import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../src/parse.ts";

test("extractJson: plain JSON object", () => {
  const r = extractJson('{"a":1}');
  assert.equal(r.error, null);
  assert.deepEqual(r.value, { a: 1 });
});

test("extractJson: fenced code block", () => {
  const r = extractJson("here you go:\n```json\n{\"a\":2}\n```");
  assert.equal(r.error, null);
  assert.deepEqual(r.value, { a: 2 });
});

test("extractJson: leading prose then object", () => {
  const r = extractJson("Sure! {\"a\":3} thanks");
  assert.equal(r.error, null);
  assert.deepEqual(r.value, { a: 3 });
});

test("extractJson: invalid returns error and null", () => {
  const r = extractJson("no json here");
  assert.equal(r.value, null);
  assert.ok(r.error);
});
