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

test("chat: passes a dispatcher option to fetch", async () => {
  const orig = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (_url: any, init?: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 });
  }) as any;
  try {
    await chat(cfg, "m1", [{ role: "user", content: "hi" }]);
    assert.ok(capturedInit, "fetch init should be captured");
    assert.ok((capturedInit as any).dispatcher, "init.dispatcher should be defined");
  } finally {
    globalThis.fetch = orig;
  }
});

test("chat: surfaces cause message when fetch rejects", async () => {
  const orig = globalThis.fetch;
  const cause = new Error("Headers Timeout Error");
  globalThis.fetch = (async () => {
    throw new Error("fetch failed", { cause });
  }) as any;
  try {
    await assert.rejects(
      () => chat(cfg, "m1", [{ role: "user", content: "hi" }]),
      (err: unknown) => {
        const e = err as Error & { cause?: unknown };
        assert.ok(e.message.includes("Headers Timeout Error"), `message should include cause text, got: ${e.message}`);
        assert.equal(e.cause instanceof Error && e.cause.message, "fetch failed");
        return true;
      },
    );
  } finally {
    globalThis.fetch = orig;
  }
});
