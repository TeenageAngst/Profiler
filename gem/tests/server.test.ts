import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/server.ts";

test("GET /api/models returns list", async () => {
  const app = createApp({
    lmstudio: { listModels: async () => ["m1"], chat: async () => "{}" },
    config: { baseUrl: "http://x/v1" },
    tierFor: () => "full",
  });
  const res = await request(app).get("/api/models");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, ["m1"]);
});

test("POST /api/run rejects empty corpus", async () => {
  const app = createApp({
    lmstudio: { listModels: async () => [], chat: async () => "{}" },
    config: { baseUrl: "http://x/v1" },
    tierFor: () => "full",
  });
  const res = await request(app).post("/api/run").send({ kind: "iq", model: "m", inputs: [{ label: "x", text: "   " }] });
  assert.equal(res.status, 400);
});

test("POST /api/run returns result", async () => {
  const app = createApp({
    lmstudio: { listModels: async () => [], chat: async () => '{"iq_estimate":120}' },
    config: { baseUrl: "http://x/v1" },
    tierFor: () => "full",
  });
  const res = await request(app).post("/api/run").send({ kind: "iq", model: "m", inputs: [{ label: "x", text: "hello" }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.parsed.iq_estimate, 120);
});
