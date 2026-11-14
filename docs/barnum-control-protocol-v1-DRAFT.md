# Barnum Control Protocol — v1 (DRAFT)

*Prepared 2026-10-12. Not run, not reviewed. Every design choice below is a
proposal you can veto or rewrite — the point is that the thinking is done and
the only thing left is your judgment.*

## Why this experiment goes first

The villain-arc dossier's literature review lands one uncomfortable finding:
Matšenas et al. (2026) showed participants rating LLM-generated personality
profiles as equally accurate as traditional questionnaire results even though
measured convergent validity was only moderate (r = 0.38–0.58). Perceived
accuracy decouples from measured accuracy. Your own notes say it plainly:
hand someone a profile built from someone else's text, and if they endorse it,
the instrument flatters — it doesn't measure.

That is the cheapest experiment that can kill the central claim, so it runs
before the trading-Discord volunteer battery, before AO3 clustering, and
before anything gets sold. The dossier's advice stands: run it early and
publish either outcome, because a failed Barnum control you disclose is a
credibility asset, and a passed one is the load-bearing wall of the product.

## The design: two conditions, one question

**Condition A — the swap (discrimination test).** For each volunteer, generate
two profiles with the identical frozen instrument: one from their own corpus,
one from a matched decoy corpus. Strip both of identifying markers, randomize
presentation order, and hand both to the volunteer blind. They rate each
profile on the endorsement instrument below, then make a forced choice:
"which profile was built from your writing?"

**Condition B — the Forer (raw flattery test).** A separate set of volunteers
each receives only one profile — built from someone else's corpus — presented
as theirs. They rate it on the same instrument. This is the classic Forer
paradigm and gives you the raw endorsement rate of a decoy with no comparison
anchor. Forer's original baseline sits around 4.26 out of 5; your instrument
has to beat flattery, not just beat chance.

## Decoy sourcing and matching

The control is only as strong as the decoy. A decoy built from a press
release will be spotted by register alone, which tells you nothing. The
preferred source is corpus-swapping within the consenting volunteer pool:
each volunteer's decoy is another consenting volunteer's corpus, matched on
word count within ±20% and on register (chat logs pair with chat logs, long
form with long form). Every volunteer consents twice — once to be profiled,
once to have their corpus serve as someone else's decoy. The fallback is
public-figure corpora (no consent needed, weaker control because the register
gap is harder to close). Do not mix the two sources within one run; log which
source each decoy came from so the analysis can split them.

## De-identification pass

Before presentation, both profiles go through the same scrub: names, handles,
locations, employers, and any biographical specifics the corpus leaked into the
profile get replaced with bracketed placeholders. Formatting is standardized —
same headings, same length band, same trait order. If a volunteer can identify
their profile by a leaked detail instead of by its accuracy, the forced choice
is contaminated and the run is void. One person does the scrub, a different
person (or a checklist) verifies it.

## The frozen instrument

The profiler runs that generate the test profiles use the same settings you
would ship: the item-first prompt architecture from Zhu, Jin & Coifman (2025),
a minimum of four runs per profile, empirical spread reported instead of
verbalized confidence, your 1-SD/2-SD reporting convention, and the
capability-floor rule enforced by protocol (frontier or ≥30B dense reports
normally; 14B-class reports with widened intervals and the below-floor flag;
under 10B is experimental and excluded from the analysis). Nothing about the
instrument changes between the volunteer's own profile and their decoy.

## The endorsement instrument

Every volunteer rates every profile they see on the same sheet:

1. Per-trait endorsement, 1–5 ("this describes me") for each trait the profiler
   reports — IQ band, the Big Five facets, and any bias/fear/goal claims.
2. Overall accuracy, 1–5.
3. Condition A only: forced choice, "which profile was built from your
   writing," plus a one-line reason in their own words.

Collect the trait-level ratings, not just the overall score. The overall score
is the headline; the trait-level matrix is where failure becomes informative.

## The false-acceptance matrix: predicting where flattery lives

Score the endorsement gap per trait: mean endorsement of own-profile minus
mean endorsement of decoy-profile. Traits with a real gap are measurement;
traits with no gap are flattery. The German PSYCH study (2026) gives you the
prior for which traits will false-accept: across model families, LLM profiles
systematically inflate agreeableness and aesthetic sensitivity and suppress
negative emotionality — socially desirable language patterns, not latent
traits. So expect decoys to score suspiciously well on exactly those traits,
and treat a flat gap there as the predicted failure mode rather than a
surprise. Log which traits get endorsed by whom in the decoy condition; that
table is the single most valuable artifact of the run because it tells you
which claims to stop making.

## Sample and logistics

- Condition A: at least 10 volunteers. Condition B: at least 10 different
  volunteers. The trading Discord is the planned consenting pool and the
  sample size is small enough to recruit by hand.
- Volunteers must not have seen the dossier, this protocol, or anyone else's
  results before rating. Prior exposure to the profiler concept is fine;
  knowledge of the decoy mechanism is not.
- Run the profiler generations before any volunteer sees anything, so no
  rating can leak into a generation.

## Pre-registered decision rule

Write this down before the first volunteer is recruited, and do not move it
after seeing data:

- **Pass:** mean own-minus-decoy endorsement gap of at least 0.75 scale points
  on the 1–5 overall accuracy item, forced-choice accuracy at or above 70%,
  and the trait-level gaps concentrated in traits the instrument claims to
  measure rather than in the predicted flattery traits.
- **Fail:** gap near zero, or decoy endorsement statistically
  indistinguishable from own endorsement, or forced choice at chance. A fail
  means the instrument is Barnum-flattery in its current form: no sale, no
  volunteer battery, back to prompt architecture before anything else.
- **Split:** overall gap passes but the false-acceptance matrix shows
  flattery on specific traits. Ship only the traits that survived, and the
  failed traits go on the public "we tested this and it doesn't work" list —
  which, per the dossier, is payment-processor armor and marketing in one.

## Ethics and the villain's code

This experiment uses mild deception: volunteers in both conditions are not
told a decoy exists until debrief. That is standard psych-experiment practice,
and the debrief is non-negotiable — every volunteer gets the full design,
their own results, and the aggregate outcome within a week of rating. Consent
is explicit and written (a message saying "I consent to be profiled and to
serve as a decoy corpus" counts; keep the receipts). Public information only,
consenting adults only, no non-public persons as decoys, data stays local.
The punch-up-never-down rule applies to subject selection too: volunteers opt
in, nobody gets profiled as a joke.

**Debrief script (use verbatim or adapt):** "Thank you for participating. One
of the profiles you rated was generated from your writing and the other was
generated from someone else's writing [Condition A] / the profile you rated
was generated from someone else's writing, not yours [Condition B]. We did
this to test whether the profiler measures real individual differences or
just produces flattering generic statements. Your ratings were [X]. Across
all participants so far, [aggregate]. You are free to withdraw your data at
any time, and nothing you wrote will be published or shared."

## Run artifacts to produce

1. A dated run log: volunteer IDs, corpus word counts, decoy pairings and
   sources, instrument settings hash, generation timestamps.
2. The rating sheets, one per volunteer per profile, with presentation order
   recorded.
3. The false-acceptance matrix: rows are traits, columns are own/decoy mean
   endorsement and the gap, split by decoy source.
4. The debrief record: date each volunteer was debriefed, any withdrawals.

## Open questions that stay with you

- Pilot on existing data first? Your WAIS anchor and Dragon's replication are
  already in hand; running the swap on the two of you costs nothing and shakes
  out the logistics before recruiting strangers. The risk is that n=2 tells
  you nothing statistical — treat it as a dry run, not a result.
- Decoy source: volunteer-to-volunteer swap (stronger control, needs the
  double consent) or public figures (weaker control, zero consent friction)?
- The dossier says publish either outcome. Confirm that's still the call
  before the first recruitment message goes out, because it determines what
  the consent message promises.

---
*Sources: villain-arc dossier §1 and Phase 1
(`/home/hatch/workspace/research_notes/ai-profiler-villain-arc-20261011/report.md`);
psychometric literature notes
(`/home/hatch/workspace/research_notes/ai-profiler-villain-arc-20261011/notes/01-psychometric-literature.md`);
validation protocol in `/home/hatch/workspace/black-mirror/NOTES.md`.
Literature: Matšenas et al. (2026), https://arxiv.org/abs/2602.15848v1; German
PSYCH study (MDPI Analytics, 2026),
https://www.mdpi.com/2813-2203/5/1/5/pdf; Zhu, Jin & Coifman (2025),
555-interview BFI-10 study.*
