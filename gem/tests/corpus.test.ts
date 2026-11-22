import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleCorpus, isEmpty } from "../src/corpus.ts";

test("assembleCorpus: single input produces labeled block", () => {
  const c = assembleCorpus([{ label: "paste", text: "hello world" }]);
  assert.match(c.combined, /### SOURCE: paste/);
  assert.match(c.combined, /hello world/);
  assert.equal(c.inputs.length, 1);
});

test("assembleCorpus: multiple inputs are separated and labeled", () => {
  const c = assembleCorpus([
    { label: "a.txt", text: "alpha" },
    { label: "b.txt", text: "beta" },
  ]);
  assert.match(c.combined, /### SOURCE: a\.txt/);
  assert.match(c.combined, /### SOURCE: b\.txt/);
  assert.ok(c.combined.indexOf("alpha") < c.combined.indexOf("beta"));
});

test("assembleCorpus: trims trailing whitespace per input", () => {
  const c = assembleCorpus([{ label: "x", text: "  hi  \n\n" }]);
  assert.equal(c.combined.trimEnd().endsWith("hi"), true);
});

test("isEmpty: true when all inputs blank", () => {
  const c = assembleCorpus([{ label: "x", text: "   \n" }]);
  assert.equal(isEmpty(c), true);
});

test("isEmpty: false when any input has content", () => {
  const c = assembleCorpus([{ label: "x", text: "hi" }, { label: "y", text: "   " }]);
  assert.equal(isEmpty(c), false);
});
