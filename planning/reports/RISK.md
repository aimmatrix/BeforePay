# RISK handoff

- **Task ID:** RISK
- **Status:** INTEGRATED (see verification update below)
- **Baseline SHA:** `bb3955b` (preceded by `3b8da96`; existing history preserved)
- **Branch / worktree:** `codex/beforepay-core`, shared checkout `/Users/ammad/Documents/FinTech` (not committed; CORE commits)
- **Files (all new, RISK-owned):**
  - `src/risk/index.js`: public entry
  - `src/risk/evaluate.js`: pure evaluator
  - `src/evidence/collect.js`: provider runner, normalisation, timeouts
  - `src/evidence/page.js`: page-observation adapter (sourceType `page`)
  - `src/evidence/demo-directory.js`: gated SYNTHETIC demo directory
  - `src/evidence/independent-none.js`: live fallback, "no independent source connected"
  - `src/evidence/hostname.js`: exact-host comparison and lookalike explanations
  - `tests/risk/risk.test.mjs`
- **Contract:** v1, unchanged. No new Assessment or Evidence fields.

## Exports (`src/risk/index.js`)
- `collectEvidence(observation, {signal, providers?, timeoutMs=2500, now?, maxAgeMs?}) => Promise<Evidence[]>`
  - Built-in adapters always run: page, demo directory, independent-none. `providers` adds external sources.
  - Each provider gets its own time limit; one that doesn't finish becomes `unavailable`, one that throws becomes `error`.
  - If `signal` aborts because of a timeout (`AbortSignal.timeout`), the call resolves with typed evidence. Any other abort (a superseded scan) rejects with an `AbortError`.
  - `sourceType` comes from the provider, never from the item it returns.
  - Synthetic items are dropped unless the observation passes the demo gate.
  - `sourceUrl` must be http(s), otherwise it becomes `null`. Strings are length-limited.
  - Non-page `matched`/`mismatch` records older than `maxAgeMs` (default 7 days) become `stale`.
- `evaluate(observation, evidence, {now?}?) => Assessment`
  - Pure and deterministic. `createdAt` is `now`, otherwise `observation.capturedAt`.
- Also exported: `createPageProvider`, `createDemoDirectoryProvider`, `createNoIndependentSourceProvider`, `isDemoObservation`, `DEMO_ORIGINS`, `DEFAULT_DEMO_DIRECTORY`, `defaultProviders`, `normaliseEvidence`, `exactHostMatch`, `lookalikeReasons`, `normalizeHost`.
- `src/runtime/fallback.js` `collectEvidence`/`evaluate` can be swapped for these directly; same signatures.

## Decision rules (documented in evaluate.js)
- **Identity**
  - Synthetic `matched` on a demo observation gives `demo_match`.
  - Any non-page `mismatch` gives `mismatch`.
  - Two `matched` records from different sources count as a conflict and give `mismatch`.
  - Everything else is `unverified`.
  - Page-sourced identity claims are never counted.
- **`verified` cannot be reached in contract v1.** Evidence has no structured field tying a record to an exact host, and free text can't be trusted to do it: S2's ADV-DOM-006 names the host inside a "not this host" sentence. Independent `matched` records are shown with severity `unknown` and the title "Not tied to this exact address".
  - **Proposed v2:** add `Evidence.subjectHost` and verify only when `exactHostMatch(observation.hostname, [subjectHost])`.
- **Verdict**
  - `warning`: any warning reason. Warning reasons are:
    - identity mismatch or conflict
    - lookalike domain
    - risky payment request (bank transfer only, wire/Western Union, crypto, gift card, friends-and-family, "details sent after order")
    - discount of 70% or more
    - http (not https) on a live page
  - `error`: the observation is invalid, or every identity source errored and there are no warnings.
  - `no_flags`: no warnings, identity `demo_match` or `verified`, and no `error`/`stale` evidence.
  - `uncertain`: everything else.
- **Reasons**
  - One reason per evidence item, plus summary reasons for unverified identity, a missing identity check, conflicts and sample-only data.
  - Order: warning, then unknown, then info.
  - Reason ids are `<reasonKind>:<evidenceId>`, where `reasonKind` uses S1's `reasonKindVocabulary` (e.g. `identity-mismatch:demo-directory:identity`). Panel and Pip should treat ids as opaque; tests can split on `:`.
- **Missing or failed checks** (`not_checked`/`unavailable`/`error`/`stale`) always appear with severity `unknown`, never `info`.
- **Page text** is matched against fixed patterns only. No page text is copied into reason titles or details. Copy avoids the banned word "scam".
- **Demo gate**
  - `demoScenarioId` must be a known scenario, the `pageKey` origin must be `http://127.0.0.1:4173` or `http://localhost:4173`, and the path must be `/demo/index.html` or `/`.
  - Brand and simulated host come from `DEFAULT_DEMO_DIRECTORY`, which mirrors `fixtures/scenarios.json`; a test checks they stay in sync. Solehouse is listed only at `shop.solehouse.example`.
  - Transport is `not_checked` on the demo, because the local server runs over plain http.

## Checks run (exact outcomes)
- `node --test tests/risk/*.test.mjs` → **26 pass, 0 fail.** Covered:
  - all 3 canonical scenarios
  - all 7 S1 evaluator vectors in `tests/fixtures/vectors.json`
  - all 5 hostname vectors
  - remote page claiming a scenario
  - rogue synthetic and self-promoting providers
  - provider timeout/throw, stale records, scan-level timeout, superseded abort
  - http and payment warnings
  - prompt injection and HTML
  - invalid observation, determinism
  - CORE `isAssessment`
- `node --test tests/adversarial/*.test.mjs` → **195 pass, 5 fail, 4 todo.** Every S2 suite run against `src/risk/index.js` passes (domains, identity, providers, missing, stale, not-run, 01-identity, copy rules). The 5 failures are outside RISK:
  - **#124** e2e through content-entry: harness error `Cannot read properties of undefined (reading 'release')`
  - **#127** link scheme filtering: `src/runtime/observation.js` (CORE)
  - **#132** trailing-dot mailbox exclusion: `observation.js` (CORE)
  - **#133** hidden-element text extraction: `observation.js` (CORE)
  - **#134** self-marked personal section: `observation.js` (CORE)
- `npm run build` → "Built dist/extension and dist/preview.js"; CORE's build already maps `evaluate` to `src/risk/index.js`.
- `npm test` → 329 pass, 5 fail (the same 5).

## Not tested
- Inside the installed extension or the preview bundle in a real browser.
- Real third-party sites.

## Real / synthetic / unavailable
- **Real:** page-observation checks (HTTPS, contact/returns links, discount, payment-method wording, self-claims).
- **Synthetic:** demo directory only, labelled "Sample data" in every title and in the limitations.
- **Unavailable:** no independent identity, review or domain-records source (cut at minute 8 as planned; RDAP domain age not implemented). These always appear as `not_checked`.

## Requests to CORE
1. Add `tests/risk/*.test.mjs` to `npm test`.
2. Swap `src/runtime/fallback.js` collect/evaluate for `src/risk/index.js` at integration if not already done.
3. Ratify the `verified` fail-closed rule, or add `Evidence.subjectHost` in v2.
4. S2 gaps GAP-S2-7/8 ("scam" wording) remain in `fallback.js` and `extension/rules.js`; RISK copy is already clean.


## Integration verification — 13 October 2026

- Real sites remain `unverified`; synthetic matches use `demo_match`. Contract v1 remains unchanged and no live providers were added.
- Build selects `src/risk/index.js` for both `collectEvidence` and `evaluate`; rebuilt `dist/build-report.json` confirms the real collector/evaluator and Pip, panel and popup.
- Extraction imports `DEMO_ORIGINS` and `DEMO_PATHS` directly from the evidence adapter. Exact localhost/127.0.0.1 HTTP origins on **4173** and paths `/` or `/demo/index.html` are the single allowlist. Port 4174 is not a synthetic origin. Remote origins, lookalike hosts and other paths cannot activate samples.
- Added a matrix regression comparing extraction, collection and evaluation at that boundary.
- Original five failures now pass: harness release timing, unsafe link schemes, trailing-dot mailbox refusal, hidden text and personal-content roots. Credential-bearing links are also rejected.
- Fixed installed test harness tabs without URLs using optional chaining. A URL-only scenario change retains merchant warning text, so the lifecycle assertion correctly expects warning with `demo_match` identity.
- `node --test tests/risk/*.test.mjs`: **27 pass, 0 fail**.
- `npm test`: **349 pass, 0 fail, 0 skipped, 0 TODO**. The shared recursive runner discovers `tests/risk/`.
- Actual unpacked-extension desktop smoke: suspicious warning, matching sample, one mount, dismissal preserved after mutations, payment unobstructed, no page errors.
- Actual unpacked-extension mobile smoke: compact initial guardian, payment unobstructed, open/dismiss with reduced motion.
- Installed non-demo fixture: self-claimed identity remains unverified, HTTP transport warning remains, password/card values excluded, dismiss restores focus.
- Extension load path: `/Users/ammad/Documents/FinTech/dist/extension`.
- Existing commits and unrelated uncommitted work were preserved. No real third-party provider verification is claimed.

- Additional popup action probe reached scan/rescan, keyboard focus, hide and motion persistence, but its optional-site revoke/regrant sequence times out on localhost. Localhost has required manifest host permission, so removing optional permission cannot make it manual. This probe is not counted as a passing full test; no remote provider was added.

Final takeover verification: the corrected installed popup-document probe passed scan, motion and visible required-localhost permission-removal rejection. It no longer waits for an impossible revoke/regrant on required permissions. See docs/VALIDATION.md for remaining physical toolbar and remote prompt limits.
