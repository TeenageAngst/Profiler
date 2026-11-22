# Gem v1

A local web app that reads pasted text and uploaded text files, runs four
psychometric analyses against a local LM Studio endpoint, and displays the
results. Analyses can be run independently or together via **Run all**.

Four analyses:

- **IQ** — high-fidelity IQ estimate with confidence range
- **Psychometrics** — Big-Five-style trait estimates
- **Themes** — recurring themes, mannerisms, and structural patterns
- **Personal info** — conservatively extracted personal details

There is no database and no server-side persistence. Inputs stay in memory;
results are exported from the browser via **Copy case file** or **Download case
file** (JSON).

## Prerequisites

- **Node.js 22.13 or newer** — the app runs TypeScript directly with
  `node --experimental-strip-types`.
- **LM Studio** installed and running locally, with at least one chat model
  loaded and the local server enabled (default `http://127.0.0.1:1234/v1`).

## Setup

From this directory (`gem/`):

```bash
npm install
```

Copy the example environment file and adjust it if your LM Studio endpoint is
not the default:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

`.env` keys:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the web app listens on |
| `LM_STUDIO_BASE_URL` | `http://127.0.0.1:1234/v1` | LM Studio OpenAI-compatible base URL |

The base URL is always read from the environment (or the default above); it is
never hardcoded.

## Run

```bash
npm run dev
```

Open <http://localhost:3000>. The model dropdown is populated from
`GET /api/models`, so LM Studio must be running before the page loads. If the
connection status shows *API unreachable*, start LM Studio's local server and
reload.

Typical flow: paste text and/or attach `.txt`/`.md`/`.json` files, choose a
model, then run a single analysis tab or **Run all**. **Run all** feeds each
completed analysis forward as context for the next one, even if an earlier
stage failed to parse.

## Test

```bash
npm test
```

Runs the Node built-in test runner over `tests/**/*.test.ts` (no live LM Studio
required; network calls are mocked).

Type-check without emitting:

```bash
npm run typecheck
```

## Model capability notes

Model trust is controlled by `config/models.json`:

```json
{
  "full": ["qwen", "27b", "gemma-31b", "nemotron", "super"],
  "experimental": ["26b", "moE", "4b", "7b", "8b", "14b", "e2b", "e4b"]
}
```

- Matching is case-insensitive substring matching. Size tokens that begin with
  a digit must not be preceded by another digit, so `7b` matches `qwen-7b` but
  not `qwen-27b`.
- An **experimental** token always wins over a **full** token.
- Models matching a `full` token run silently.
- Everything else — including unknown models and a missing/unreadable config —
  is classified **experimental**. Results are tagged `tier: "experimental"`
  with a warning in the UI and in the exported case file, because smaller or
  untested models may return unreliable or malformed output.
- To promote or demote a model family, edit `config/models.json`. No code
  changes are needed.

Regardless of tier, model output that is not valid JSON does not crash a run:
the raw text is preserved and shown with a parse error.

## Project layout

```
gem/
├─ config/models.json   # capability-floor tiers
├─ prompts/*.md         # prompt templates ({{CORPUS}} / {{PRIOR}})
├─ public/              # amber-terminal frontend (HTML/CSS/JS)
├─ src/                 # server, routes, LM Studio client, runner, parser
└─ tests/               # node:test suites
```

API routes: `GET /api/models`, `POST /api/run`, `POST /api/run-all`.
All LM Studio network calls go through `src/lmstudio.ts`.

## Perl helpers

Text-heavy scraping and parsing helpers are **not** part of this Node app. The
existing Perl helpers (for example `scrape_ao3_latest.pl` and
`scrape_ffn_latest.pl`) live in [`../scripts/`](../scripts/). Use them to
prepare source text, then paste it or upload the resulting files here.
