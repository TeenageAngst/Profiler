# Profiler — Proof of Concept (Dynamic Solutions style)

This branch holds the proof of concept for the Black Mirror profiler, even if it never sells.

## What this is

Text in, profile out. The profiler estimates IQ, biases, fears, goals, and sensitivities from chat and writing samples.

The console in `console/ai-profiler-villain-arc.html` is a self-contained, client-side desk in a Dynamic Solutions / Solnet style: dark terminal, case desk, stylometry linkage check, evidence log, and downloadable case files. Open it in a browser, name a case, paste writing (or load a demo sample), and it computes corpus stats, vocabulary richness, six transparent trait-proxy bars, and sample confidence.

Honest limit: this console version does not claim an IQ number. Its trait bars are labeled as proxies, and it warns on samples under 80 words. The IQ work lives in the Gemini Gem validation and in the planned local Qwen 27B engine — see `docs/NOTES.md`.

## Validation so far

- WAIS-V anchor (n=1, Darnell): Gem estimated IQ 134 ±5; measured FSIQ 132.
- Replication (n=2, Dragon): ran the Gem on his own writings — "it nailed my IQ."
- Genre-transfer: profiler run on Darnell's fiction alone, then chats added — results did not wiggle much.
- Matchup 1 (Naminesfriend, AO3 author): five independent model lineages + human estimate converged on 115–120, inside 110–125. See `docs/NOTES.md` for the full table, the capability-floor finding, and the reporting standard.

## Build order (PoC-first)

1. This desk
2. Local Qwen 27B engine
3. Discord-export corpora on the three anchored cases
4. Barnum kill test — see `docs/barnum-control-protocol-v1-DRAFT.md`
5. Selling only as an optional last step

## What to borrow from Solnet, what never to copy

Borrow: case desk, stylometry linkage, evidence logging.
Never copy: undercover personas / moles, infiltration.

## Files

- `console/ai-profiler-villain-arc.html` — the PoC console (self-contained)
- `docs/NOTES.md` — project notes, thesis, validation, roadmap
- `docs/barnum-control-protocol-v1-DRAFT.md` — Barnum control protocol, v1 draft, not run
- `scripts/` — hobby corpus scripts (AO3 list scrape, parse, text extract). Corpus data itself is not included.

Public information only. Consenting adults only. No non-public persons as decoys.
