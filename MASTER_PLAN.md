# BeforePay: master plan for a coordinated agent build

**Status: BUILDING.** The user explicitly kicked off implementation and confirmed all agents use the shared FinTech folder. Exclusive file ownership applies; separate checkouts are waived for this sprint. Read planning/KICKOFF.md and planning/INTEGRATION_STATUS.md for current details. This plan supersedes the earlier invoice-led BUILD_BRIEF.md.

## Product decision

BeforePay is a Chrome shopping-security extension. Pip, an animated guardian, appears when a shopper reaches an online checkout and explains evidence about the seller, offer and payment request. The demonstration is buying shoes from an unfamiliar store. Ramp is inspiration for checks before spending, not an integration requirement or a product to replicate.

One-line pitch: **A second opinion before you pay, with a little guardian that shows you what deserves a closer look.**

Pip is the interface; the evidence engine determines findings. Pip cannot verify a store by itself. Distinguish identity evidence, warning signs, missing checks and purchase value. Verified identity never guarantees product authenticity, delivery or a worthwhile purchase.

## What ships in the first build

1. A locally installable Chrome Manifest V3 extension.
2. A fictional shoe store with a suspicious and a matching-directory scenario, plus an unknown scenario if time permits.
3. An automatic Pip appearance at checkout on the demo. A manual Check this store action on accessible real web pages. Optional per-site permission enables subsequent automatic checks on that granted site if completed and tested.
4. A local deterministic evaluation with inspectable evidence. Website text, links and claims are observations, never independent proof.
5. An animated Pip and evidence panel, with dismiss, rescan and reduced-motion behaviour.
6. Honest unknown, timeout and unsupported-page states. No fabricated risk percentages or claims of universal protection.
7. A recorded 90-second demonstration and clear setup instructions.

Use synthetic data. No real payment execution or card-field collection. Physical card terminals, automatic whole-mailbox scanning, browser-store publishing, login/accounts, a database, bank integrations and comprehensive price comparison are outside the first build. Invoice email checking is a later input adapter into the same evaluator.

Real independent evidence is optional for the sprint. At kickoff, the evidence lead has until minute 8 to identify an available, suitable source and working access. Otherwise ship the demonstrator with synthetic identity records and explicitly unverified real sites. Do not invent reputation data, domain age or affiliation. No model or paid service is required for the core.

## Team and exclusive ownership

Use three Cursor workers and three Sonnet workers initially. Add workers four/five only to the independent optional tasks listed below. More sessions do not remove dependencies. With the two Opus sessions and Codex this is nine builders; a terminal coordinator, if separate, is a tenth session and does not also write product code.

| ID | Agent | Responsibility | Exclusive implementation paths | Depends on |
| --- | --- | --- | --- | --- |
| CORE | Codex, this chat | Architecture, Chrome runtime, build pipeline, integration and final QA | package.json, lockfile, build scripts, extension/manifest.json, extension/background.*, extension/content.*, src/runtime/**, src/contracts/**, tests/integration/** | Frozen contract |
| RISK | Main Claude Opus session, requested Opus 5.5 | Evaluation logic, evidence provenance, decision policy, optional evidence adapter | src/risk/**, src/evidence/**, tests/risk/**; optional server/** only if CORE assigns it | Frozen contract |
| PIP | Separate Claude Opus session | Character, animation, expression states, accessible mascot controller | src/pip/**, assets/pip/**, tests/pip/** | PipView contract |
| C1 | Cursor worker 1 | Fictional shoe shop and simulated checkout | demo/** | Scenario contract |
| C2 | Cursor worker 2 | Evidence panel and explanatory UI | src/panel/**, tests/panel/** | Assessment and Panel contract |
| C3 | Cursor worker 3 | Extension popup/settings presentation | src/popup/**, tests/popup/** | Runtime action contract |
| S1 | Sonnet worker 1 | Synthetic cases and expected outcomes | fixtures/**, tests/fixtures/** | Evidence contract |
| S2 | Sonnet worker 2 | Independent adversarial/behaviour tests | tests/adversarial/**, planning/reports/S2.md | Contract first; implementation later |
| S3 | Sonnet worker 3 | Installation guide, demo script and disclosure copy | README.md, docs/demo-script.md, docs/limitations.md | Product scope; final validation from CORE |
| C4 | Optional Cursor worker 4 | Accessibility and small-screen review | planning/reports/C4.md; no product edits | First integration |
| C5 | Optional Cursor worker 5 | Demo opening/closing slides | presentation/** | Stable claims |
| S4 | Optional Sonnet worker 4 | Local performance and dependency review | tests/performance/**, planning/reports/S4.md | First integration |
| S5 | Optional Sonnet worker 5 | Independent real-site evidence-provider feasibility note | docs/provider-research.md | None; do not implement APIs |

CORE alone edits shared configuration and performs integration. Workers may read any project module, but do not patch another owner's files, upgrade dependencies, rewrite contracts or merge branches. Request ownership transfers through CORE. If CORE fixes an owner's file during integration, that owner stops editing it until ownership is returned.

The main Opus and Pip sessions remain separate from the Sonnet team. Use the requested Opus version only if the account exposes it; record the actual model at kickoff. No assumption is made that this chat can directly select or control models in the external applications.

## Architecture

Use browser-native ES modules and JSDoc contract types, with one small bundler pipeline owned by CORE for extension entrypoints. Use CSS/SVG animation for Pip. Avoid a framework or animation dependency unless CORE changes the baseline before dispatch. Build the web demo and extension UI from the same Pip/panel components. The no-install preview must identify itself as a preview; it is not evidence that the extension works.

Flow: checkout detection → collect minimal observations → evaluate evidence → deliver Assessment → render Pip and evidence panel. Content scripts never decide identity verification. The renderer never changes verdicts. The source website cannot provide a verified flag or inject HTML into the extension UI.

The Chrome service worker handles permissions and, if present, approved external evidence calls. Remote credentials stay on a backend. Page content is untrusted data, not model instructions. Automatic detection is advisory: the extension is not a bank or payment-processor enforcement mechanism.

Detailed interfaces are in planning/CONTRACTS.md. Agree these before dispatching workers. Freeze the public interfaces for the build; CORE resolves proposed changes once and publishes the new version to every affected owner.

## Pip direction

A small, original shield-shaped companion with eyes and expressive arms. Calm, helpful, slightly playful; no alarmist behaviour or purchase pressure. Suggested palette: sage/cream for neutral, amber for uncertainty, rust for warning. Icons and text convey status in addition to colour.

States: idle → noticing → checking → warning / uncertain / identity_matched / error → dismissed. Soft float and occasional blink at idle, a scanning glance while checking, a raised hand for warnings. Identity match produces a calm nod, not confetti or encouragement to pay. Reduced motion replaces animation with static state changes. Pip never covers the primary payment action or traps keyboard focus.

Pip and the panel are independent modules. CORE mounts both in one extension-owned Shadow DOM root. Pip dispatches open-panel/dismiss intents; the panel dispatches rescan/dismiss intents; CORE owns transitions and lifecycle.

## Work isolation and coordination

At kickoff, CORE creates a Git baseline from the reviewed scaffold and these plans. Existing files are untested and incomplete. Then each implementation worker gets one named branch and isolated worktree, all based on the same commit. Suggested branch prefix: codex/beforepay-<ID>. Worktree tooling must be verified per host; directories are assigned explicitly, not inferred.

For the Sonnet team, use separate worktrees where supported by the installed session. If it only supports a shared checkout, put the whole terminal team in ONE isolated team worktree; S1/S2/S3 retain the disjoint paths above, and the terminal coordinator alone commits that worktree. Never share the main checkout among concurrent agents. Cursor-managed worktrees are suitable if rooted in the same Git repository and baseline.

The source of truth across applications is the committed contract plus the assignment. Do not assume Cursor, Claude and Codex share message history or task lists. Each worker maintains only its own planning/reports/<ID>.md in its assigned checkout. CORE maintains planning/TASK_BOARD.md. The terminal lead additionally reports the three Sonnet handoffs together. Human copy/paste is an acceptable bridge; no cross-application automation is required for the first build.

Every handoff states: task ID; baseline SHA; branch/worktree; commit SHA or patch location; files changed; public exports; checks actually run and outcomes; unresolved issues; real vs synthetic behaviour. No 'done' without the artifact and validation. At minute 15 return a thin working slice; report a blocker after three minutes instead of silently rearchitecting.

CORE inspects changes, imports only the assigned work, runs relevant checks, then advances the board. Default integration is commit cherry-pick from isolated branches; coordinate ordered commits from a shared terminal-team branch. Do not merge whole unrelated worktrees. Never reset or overwrite another worker's unfinished changes.

## Eighty-minute execution window

This is an execution budget for the future kickoff, not a timer started by this planning request. If tonight's hackathon deadline still applies, the fixed 20:10 London deadline overrides it.

| Elapsed | Gate |
| --- | --- |
| 0–8 | CORE and RISK freeze contract; initialize baseline and worktrees; confirm models/tools; cut unavailable external APIs |
| 8–25 | Independent implementation: extension runtime, risk module, Pip, store, panel, popup, fixtures and tests |
| 25–40 | CORE integrates first slices: store → scan → assessment → panel; Pip mounts alongside panel |
| 40–55 | Complete automatic demo checkout appearance; reload/rescan/dismiss/error flows; test unpacked extension separately from preview |
| 55–65 | Feature freeze; independent adversarial checks, accessibility and narrow fixes |
| 65–80 | Record the 90-second demo and backup take; package and prepare submission materials |

Critical path: frozen contract → assessment module + runtime → panel → checkout demonstration → validation → video. Pip develops in parallel and joins through its fixed controller interface. Optional tasks never delay that path.

Cutoffs: no evidence API access at minute 8 → synthetic provider only. No advanced animation by minute 40 → retain simple blink/float. No permission flow by minute 45 → manual real-page scan plus automatic demo only. No model extraction by minute 40 → deterministic findings. No working extension by minute 55 → disclose web preview limitation; do not claim it is installed or protecting real purchases.

## Acceptance gates

- Suspicious synthetic shoe store yields explainable warning; matching scenario is explicitly sample-only.
- Unknown real store remains unverified even with HTTPS, reviews printed on its own page, or a professional design.
- Missing/error/stale checks are visible and cannot become a clean result.
- Lookalike domains and 'officialbrand.example.attacker.example' do not pass identity comparisons.
- Pip appears once at checkout; dismiss/rescan/navigation work; no repeated popup loop.
- One active assessment per page snapshot; stale scan results cannot overwrite a newer page's result.
- Panel uses safe text rendering. Prompt-injection strings and HTML in merchant content remain inert.
- No card/password/address field values are collected, stored or sent. No live payments occur.
- All external checks, if present, display source, retrieval time and limits. Sample signals are labelled sample.
- Keyboard navigation, reduced motion and narrow-screen checkout are usable.
- Installed extension is tested with the preview shim disabled. Video clearly states what is real and synthetic.

## Current workspace snapshot

An interrupted earlier attempt created package.json, server.cjs, extension/manifest.json, extension/background.js, extension/rules.js, demo/index.html and demo/app.js. The referenced extension/content.js and demo/styles.css do not exist. No tests, launch, installed-extension validation or working Pip are confirmed. This is a partial scaffold, not a product. Preserve it for inspection; CORE decides what to reuse at kickoff. No product code is changed as part of this planning turn.

## Reading order

Read this file → planning/CONTRACTS.md → planning/TASK_BOARD.md → your prompt in planning/prompts/. The launch runbook is planning/EXECUTION_RUNBOOK.md. All task rows are held until the user starts the build.
