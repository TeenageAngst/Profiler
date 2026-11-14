# Black Mirror — Project Notes

*AI psychometric profiler: estimating IQ, biases, fears, goals, and sensitivities from text.
Started as a Gemini Gem; planned port to local Ollama stack. Hobby scale; business is step 4.*

Compiled 2026-10-03 from the use-case working session. Darnell's words and decisions; my job is the filing cabinet.

## The thesis (settled)

- **AI is a black mirror.** Inferring the writer from the writing isn't a misuse or a hack — it's the native capability of a model trained on everything humans ever wrote. "All I'm doing is using it as intended."
- **The capability already exists in ruthless hands.** Meta/Google do this at scale; intelligence shops and data brokers do it quietly. Nothing here is invented — it's existing LLM tooling used outside its obvious use cases, in a more focused and lower-cost way.
- **Democratize = proliferate.** The defensive version is the offensive version; a handgun is a handgun. The answer to asymmetric profiling power is universal access (the Colt logic: "God made man, and Samuel Colt made them equal"), not gatekeeping. A worthiness tribunal for customers would just make Darnell the new central authority his whole theory opposes.
- **One product:** text in, profile out, sold to whoever pays. The "whose text" distinction is a usage question, not a product question.
- **Business model: open core.** Distribute the basic tools free (the mirror for everyone — the free tool is the marketing and the mission); package and sell the service layer (done-for-you audits, depth, convenience, API).
- **Precedent/comp:** Flock Safety — sells surveillance infrastructure to any business with a checkbook, worth billions. Differences are regulatory weather (inference of interior states vs. observation; EU AI Act tripwires around emotion inference), not moral kind.
- **The villain's code:** punch up, never down. Mischief pointed at the powerful, the platforms, the farms — never at randos who can't defend themselves. (Debated at length; the farms are "the most themselves guys," not good guys.)
- **Fahrenheit 451 duality, acknowledged:** building the shield requires building the sword. The flip is real; the mitigation is proliferation + transparency, not intentions.

## Validation results so far

1. **WAIS-V anchor (n=1, Darnell).** Gem estimated IQ 134 ±5 from writing samples; measured WAIS-V FSIQ 132. Frighteningly accurate.
2. **Replication (n=2, Dragon).** Dragon ran the Gem on his own writings (RPG worldbuilding, philosophical/occult writing, poem "Jörmungandr") — "it nailed my IQ."
3. **Genre-transfer / cross-register stability (n=1, Darnell) — the big one.** Profiler was run on Darnell's *fiction alone* first (Jack Radical canon), then chat logs were added. **Results didn't wiggle much.** The instrument read the author through deliberate fiction — narrators, genre conventions, an abrasively-written protagonist — and found the same man as in the chats. This is the structural result: not a genre parlor trick.
   - *Confound to log:* fiction and chats likely share stylistic fingerprints (vocabulary, syntactic habits); profiler may key on cognitive-complexity signals that live in style. Real signal, not artifact — but name it precisely.

## Validation protocol (designed, not yet run)

- **Public-figure ground truth:** profile public figures purely from public writing; score outputs against known biographical facts. No WAIS needed — hits and misses counted honestly.
- **Cross-model convergence:** run the same corpus through different models/prompt framings. Agreement = signal; divergence = error bar.
- **Barnum control:** hand someone a profile built from *someone else's* text. If they endorse it, the instrument flatters; it doesn't measure.
- **AO3 author-clustering (stability without ground truth):** ten works each from several prolific authors — do profiler outputs cluster by author? Stability across works is the precondition for everything else. (AO3/FanFiction.net = massive public fiction corpus; respect rate limits and scraping etiquette, or use existing public datasets.)
- **Next replications in order:** Dragon's fiction vs. Dragon's chats → consenting volunteers (trading Discord) → AO3 clustering.

## Roadmap

1. **Build & test the PoC beyond self and Dragon.** Publicly available information ONLY — this constraint is load-bearing (ethical moat, legal shield, marketing line: "I only used what you posted publicly").
2. **Steeple fingers; cackle maniacally.** (Mandatory.)
3. **Refine until reliably reproducible.** Protocol, prompts, outputs recorded — the lab notebook future-Substack-post needs.
4. **Distribute basic tools free; package the service for sale.** The sale isn't the tech (it exists); it's focus + low cost + convenience.

## Open practical risks

- **Payment plumbing is strategy, not afterthought.** "Whoever pays" still gets billed through someone — Stripe/Apple/app stores will have opinions about retail profiling-as-a-service. Delivery and billing choices (local-first, direct billing, etc.) determine whether open sale survives.
- **Publication risk > method risk.** Profiling public figures from public writing: fine. Publishing a full psychometric teardown of a *non-public* person, even from public data: reputational and legal risk lives here, not in the method.
- **Regulatory homework:** EU AI Act (emotion inference, biometric categorization), US employment-screening law (EEOC, NYC Local Law 144) if the tool drifts toward hiring use. Different pile than Flock's; do it early.

## Positioning lines (his, keep)

- "Black mirror" — the audit that shows you your own dark reflection before someone else holds it up for sport.
- "Anyone with an API key could do this; I just did it first and made it easy."
- "Put KiwiFarms out of business" — mechanism: not bankruptcy, disarmament. Kill the leverage (the target's shock at how much is known), not the farm.

## Matchup 1 — Muse vs. Gem (2026-10-03)

Subject: AO3 author "Naminesfriend" (follows Darnell; FFVII fanfiction, 20 works, ~189k words).
Corpus for the matchup: "Palette" (45.5k words, modern-AU Cloud/Tifa), fed whole to the Gem as PDF; Muse profiled from a ~12k-word sample (beginning/middle/end + summaries + author's notes). Same Gem prompt, run blind and independently.

| Estimator | FSIQ range (85% CI) | Point estimate |
|---|---|---|
| Muse, 3-work profile (Hunger/Autobiography/Share This View) | 110–125 | ~117 |
| Muse, Palette-only profile | 110–125 | ~118 |
| Gemini Gem, Palette (full PDF) | 115–125 | ~117 |
| Darnell's personal estimate (human) | 115–120 | 117 |
| Gemma ~31B (local, via AnythingLLM on phone), Palette PDF, Gem prompt as workspace prompt | 115–125 (adjudicated) | ~120 |
| "Muse glimmer" (local, via AnythingLLM; Muse-family, Meta-based — same lineage as Muse Spark, NOT an independent estimator) | 110–125 | — |
| Qwen ~27B (local, via AnythingLLM; CPU-offloaded, slow run; Alibaba/Qwen family — 4th independent lineage) | 100–128 (85% CI, honestly wide) | ~112–118 (center ~115) |
| Ministral 3 14B reasoning (local, via AnythingLLM; Mistral family — 5th independent lineage) | 105–135 (30pts wide) | ~120 (center) |

**Independence audit (2026-10-03):** the raw count overstates independence. Grouped by lineage, the battery is 5 independent families + 1 human: Muse lineage (Spark + Glimmer — one voice, counted once), Gemini (Gem), Gemma (31B), Qwen (27B), Mistral (14B reasoning). All five lineages + Darnell's gut converge on point estimates 115–120, inside the 110–125 band. The 26B MoE outlier is Gemma-family — same family as the converging 31B — which sharpens the hypothesis: the divergence tracks *size* (4B active), not family. Capability floor, not lineage bias.

**Floor gradient finding (Mistral 14B leg):** the 14B did NOT run hot like the small Gemma models — it hedged (105–135, center ~120, consistent with consensus but uninformative). So the capability floor is a slope, not a cliff: large models → tight intervals converging ~117; 14B → very wide interval, center intact (uncertainty degrades first); sub-5B-active → systematic upward bias (calibration breaks second). Degradation order: precision fails before accuracy. (Caveat: it's a reasoning-distilled model; hedging style may be partly stylistic. Replication with a non-reasoning 14B would firm this up.)

**Uncertainty-width finding (Qwen leg):** point estimates cluster tightly (115–120) but 85% interval widths disagree — Gem 10pts (115–125), Muse 15pts (110–125), Qwen 28pts (100–128). Qwen explicitly argued IQ can't be validly estimated from prose and widened honestly. Meta-finding: the instrument agrees on central tendency better than on its own uncertainty — the "where" is solid, the "how sure" needs work. Tighter intervals elsewhere may be overconfident.
**Qwen caught what Muse missed:** the lyric-title structural scaffold (every chapter titled from the Vocaloid song "Palette"); the deliberate-dialect vs. genuine-error distinction (discounted "ya/bin/init" as voice, not deficit); the parentification/caregiving-cost theme. Logged without defensiveness — cross-checking improves the read.

**Reporting standard (Darnell, 2026-10-03):** for a converged estimate, report 1 SD as 115–120 and 2 SD as 110–125 — i.e., best-estimate band = spread of independent point estimates; wide band = full span of converging estimators' ranges. Caveat logged: the 1-SD band measures *inter-rater agreement*, not single-estimate measurement error; and the sub-floor outliers (small models running hot) are excluded by the capability-floor rule, which must be stated alongside any reported numbers. The standard only applies to estimates from models at/above the floor.

Result: CONVERGENCE. Four estimators, same 110–125 band, point estimates clustering 117–118. Trait reads agreed independently (high openness, high agreeableness, interpersonal intelligence as standout, grief/maternal-loss pattern identified by both). Cross-work stability held (3-work vs. Palette-only identical ranges); cross-profiler stability held (Muse vs. Gem).
Caveat (logged honestly): convergence ≠ correctness. No ground-truth score exists for this author — this validates instrument stability and inter-rater reliability, not absolute accuracy. The absolute anchor remains n=2 (Darnell 132, Dragon).

### Local leg detail (Gemma ~31B)
- Stated range in output: 115–130; model's own chain-of-thought said 110–125. Darnell adjudicated 115–125 (intersection). Logged as a calibration wobble: final answer drifted high vs. its own reasoning — worth watching across future runs (does the stated range systematically run hot vs. thinking?).
- Caveats: 45k-word PDF likely exceeded the phone model's context; AnythingLLM RAG-chunked it, so this was a retrieval-mediated read, not a full read. Result still converged — which is itself informative (the signal survives chunking).
- Frontier-model note: Grok refused the task outright (profiling-real-person refusal bucket) despite its free-speech positioning; Gemini complied. Rulesets shift silently with no patch notes — strategic consequence: the profiler cannot live on frontier APIs long-term; local stack is load-bearing. Darnell agreed: "the third leg must come from a local model."

### Outlier — 26B MoE (Gemma-family, 26B total / 4B active, qat quant)
- Stated FSIQ range: **125–140** — ~10–15 points above the 115–125 consensus band. First divergence in the battery.
- Hypotheses (unresolved): (a) capability/calibration floor — 4B active params may be below the threshold for stable psychometric estimation, producing systematic upward bias; (b) the stated-vs-thinking wobble seen in the 31B run, amplified; (c) RAG-chunking artifact — fragments may have oversampled the most sophisticated passages; (d) genuine disagreement (least likely given 5:1, but not ruled out).
- Discriminating tests: check this model's chain-of-thought vs. its stated range (as with the 31B); run the same model on a different author (if it runs hot everywhere, it's systematic); run a different small model on Palette (if small models generally run hot, it's a capability floor).
- Do NOT discard: if small models systematically overestimate, that's a finding — the instrument has a minimum capability requirement. Log it as data, not error.

### Second hot outlier — "Gemma 4 e2b" (small/efficient Gemma variant)
- Stated FSIQ range: **125–135** — again ~10 points above the 115–125 consensus.
- Status: PATTERN REPLICATING. Two small Gemma-family models now (26B MoE/4B-active: 125–140; e2b: 125–135), both skewing high on the same author. Upward bias in small models is now the leading hypothesis, upgraded from "possible noise" to "replicating finding."
- Current model of the phenomenon: below some capability threshold, the profiler detects sophistication signals (strong dialogue, thematic coherence, emotional intelligence) but lacks the calibration to discount properly — it reads the *best* passages as the *typical* level. Larger models (31B Gemma, Gemini, Muse) converge; small models run hot.
- The 14B Mistral run is now the critical discriminant: converges → floor lies between 4B-active and 14B dense; runs hot → floor is higher than 14B. Either result characterizes the constraint.
