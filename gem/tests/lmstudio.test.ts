import { test } from "node:test";
import assert from "node:assert/strict";
import { listModels, chat } from "../src/lmstudio.ts";

const cfg = { baseUrl: "http://example.test/v1" };

test("listModels: returns model ids", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: [{ id: "m1" }, { id: "m2" }] }), { status: 200 })) as any;
  try {
    const ids = await listModels(cfg);
    assert.deepEqual(ids, ["m1", "m2"]);
  } finally {
    globalThis.fetch = orig;
  }
});

test("chat: returns assistant content", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 })) as any;
  try {
    const out = await chat(cfg, "m1", [{ role: "user", content: "hi" }]);
    assert.equal(out, "hello");
  } finally {
    globalThis.fetch = orig;
  }
});

test("chat: throws on non-2xx", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as any;
  try {
    await assert.rejects(() => chat(cfg, "m1", [{ role: "user", content: "hi" }]));
  } finally {
    globalThis.fetch = orig;
  }
});
