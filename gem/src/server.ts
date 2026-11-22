import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { assembleCorpus, isEmpty } from "./corpus.ts";
import { runAnalysis } from "./runner.ts";
import { tierFor } from "./tiers.ts";
import type { AnalysisKind, LmStudioConfig } from "./types.ts";

dotenv.config();

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dir, "..", "public");

export interface ServerDeps {
  lmstudio: { listModels: (cfg: LmStudioConfig) => Promise<string[]>; chat: (cfg: LmStudioConfig, model: string, messages: any) => Promise<string> };
  config: LmStudioConfig;
  tierFor: (model: string) => "full" | "experimental";
}

export function createApp(deps: ServerDeps) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

  app.get("/api/models", async (_req, res) => {
    try {
      const ids = await deps.lmstudio.listModels(deps.config);
      res.json(ids);
    } catch (e) {
      res.status(502).json({ error: String(e) });
    }
  });

  app.post("/api/run", upload.array("files"), async (req, res) => {
    try {
      const kind = req.body.kind as AnalysisKind;
      const validKinds: AnalysisKind[] = ["iq", "psychometrics", "themes", "personalInfo"];
      if (!validKinds.includes(kind)) return res.status(400).json({ error: "invalid kind" });
      const model = String(req.body.model ?? "");
      const rawInputs = req.body.inputs ?? [];
      const inputs: { label: string; text: string }[] = Array.isArray(rawInputs)
        ? rawInputs
        : JSON.parse(String(rawInputs));
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      for (const f of files) {
        let text = "";
        try { text = f.buffer.toString("utf8"); } catch { text = ""; }
        inputs.push({ label: f.originalname, text });
      }
      const corpus = assembleCorpus(inputs);
      if (isEmpty(corpus)) return res.status(400).json({ error: "empty corpus" });
      const tier = deps.tierFor(model);
      const result = await runAnalysis(deps.config, kind, model, corpus, [], tier, (c, m, msgs) => deps.lmstudio.chat(c, m, msgs));
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/run-all", upload.array("files"), async (req, res) => {
    try {
      const model = String(req.body.model ?? "");
      const rawInputs = req.body.inputs ?? [];
      const inputs: { label: string; text: string }[] = Array.isArray(rawInputs)
        ? rawInputs
        : JSON.parse(String(rawInputs));
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      for (const f of files) inputs.push({ label: f.originalname, text: f.buffer.toString("utf8") });
      const corpus = assembleCorpus(inputs);
      if (isEmpty(corpus)) return res.status(400).json({ error: "empty corpus" });
      const tier = deps.tierFor(model);
      const kinds: AnalysisKind[] = ["iq", "psychometrics", "themes", "personalInfo"];
      const results: any[] = [];
      for (const k of kinds) {
        const r = await runAnalysis(deps.config, k, model, corpus, results, tier, (c, m, msgs) => deps.lmstudio.chat(c, m, msgs));
        results.push(r);
      }
      res.json({ model, tier, results });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.use(express.static(PUBLIC_DIR));
  return app;
}

export function start() {
  const cfg = { baseUrl: process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1" };
  const deps: ServerDeps = {
    lmstudio: { listModels: (c) => import("./lmstudio.ts").then((x) => x.listModels(c)), chat: (c, m, msgs) => import("./lmstudio.ts").then((x) => x.chat(c, m, msgs)) },
    config: cfg,
    tierFor: (m) => tierFor(m),
  };
  const app = createApp(deps);
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "127.0.0.1";
  app.listen(port, host, () => console.log(`Gem v1 listening on http://${host}:${port}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) start();
