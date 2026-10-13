# PIP: animated checkout companion

Task ID: PIP
Status: **REVIEW**. mountPip is ready for integration: all eight states, animation, reduced motion, keyboard, mobile layout and cleanup.
Baseline SHA: `3b8da96` (planning/KICKOFF.md)
Assigned branch and absolute worktree: shared checkout `/Users/ammad/Documents/FinTech`, branch `codex/beforepay-core` (separate worktrees waived per KICKOFF.md). No branch switch, reset or commit by PIP.
Commit SHA or patch path: none. Uncommitted files in the owned paths below, for CORE to commit.

Files changed (all new, owned paths only):
- `src/pip/index.js`: `mountPip` (+ re-exports `PIP_STATES`)
- `src/pip/figure.js`: the SVG built with DOM calls from a static spec (no innerHTML)
- `src/pip/states.js`: the eight states, tones and the unknown-state fallback
- `src/pip/styles.js`: the scoped CSS string (`.bp-pip`, `bp-pip-` keyframes)
- `src/pip/preview.html`, `src/pip/preview.js`: the component preview (not bundled)
- `src/pip/README.md`: integration notes
- `assets/pip/pip-reference.svg`: a reference sheet of the eight poses, generated from figure.js
- `tests/pip/pip.test.js`, `tests/pip/fake-dom.js`

Exports / contract version: `mountPip(container, {onOpen, onDismiss, reducedMotion}) → {update(view), destroy()}`, contract v1 unchanged. `scripts/build.cjs` selects `src/pip/index.js` automatically (it is the index file that exports `mountPip`).

Checks run and exact outcomes (Node v22.23.1):
- `node --test tests/pip/pip.test.js`: **44 pass, 0 fail**.
- `node --test tests/adversarial/pip.test.mjs tests/adversarial/lifecycle.test.mjs`: Pip cases ADV-PIP-001, ADV-LIFE-001 and ADV-PIP-002 **pass against src/pip/index.js**. ADV-PIP-001b failed at the time because `extension/content.js` was missing (CORE path, not Pip).
- `npm test` (whole repo): 346 tests, 306 pass, 23 fail, 7 todo. **No failing test involves Pip**; the failures are in RISK, fixtures and CORE runtime cases.
- `npx esbuild src/pip/index.js --bundle --format=iife --target=chrome120` (written to a scratch path, not dist/): builds, 19.5 kB unminified.
- Browser (`http://127.0.0.1:4174/src/pip/preview.html`, mounted inside a Shadow DOM):
  - All 8 poses render.
  - Animations are active by default (`bp-pip-float`, `-blink`, `-shadow`). With reducedMotion every animated node computes to `animation-name: none`.
  - Hostile `<img onerror>` copy rendered as text, with 0 `<img>` elements.
  - Hide → onDismiss → `dismissed` sets the root to `display:none`; the next state brings it back.
  - Tab reached the figure, the focus ring is visible, and Enter fired onOpen.
  - At a 375×812 mobile viewport the compact 64×72 figure and clamped bubble fit within the viewport.

Not tested: the unpacked extension in Chrome; Pip inside CORE's real host on the demo store (CORE has not rebuilt with Pip yet); screen-reader output (the aria-live and aria-label values were inspected, not heard); a Windows forced-colours check (only a CSS rule exists).

Real / synthetic / unavailable: Pip shows only the copy CORE passes. Copy in the preview is sample text. No findings, scores or store judgements are made by Pip.

Integration notes for CORE (no action needed by Pip):
1. With `expanded: true`, Pip hides its speech bubble because the panel holds the detail. With `expanded: false`, the bubble shows the label and message plus a Hide button.
2. `dismissed` hides Pip entirely, including its buttons, to satisfy ADV-LIFE-001. In `content-entry.js`, `close()` restores focus to Pip's figure, and then the dismissed update hides it. Focus therefore falls back to the page body. If you would rather keep a visible re-open tab, tell me and I'll add one (it would need ADV-LIFE-001 relaxed).
3. Escape inside Pip calls onDismiss only while the bubble is showing. The panel's own document-level Escape handler still covers the expanded state.
4. Unknown states render the error pose and log one warning. They never fall back to a calm pose.

Blockers and proposed owner: none for Pip. CORE: rebuild (`npm run build`) so the bundle uses `src/pip/index.js` instead of the fallback shield, then check placement next to the panel in `dist/preview.html`.
