# CORE integration status

Shared checkout is confirmed and authorized. Baseline: 3b8da96. Contract v1 frozen. All owners may proceed inside their assigned paths in /Users/ammad/Documents/FinTech; separate-worktree requirement is waived for the live sprint.

Core server: http://127.0.0.1:4174/demo/index.html
Web preview with guardian: http://127.0.0.1:4174/dist/preview.html
Unpacked extension folder: /Users/ammad/Documents/FinTech/dist/extension

CORE writes bundles using `node scripts/build.cjs`. Agents should not restart either server or edit package.json/build outputs. Existing C1 server 4173 is preserved.

First integration: C1 storefront, C2 panel and C3 popup now available. RISK and PIP are still temporary core adapters until their exports appear. No independent evidence API is connected; S5 research recommends cutting it this sprint. Eight initial core unit tests and two headless preview scenarios passed; real extension verification is in progress.

C4 may inspect the current overlay/checkout placement on the preview. Full Pip review waits for PIP; do not mistake the temporary core shield for the final mascot. Baseline and assigned review tree are now provided above. S2/S4 can use the same preview and report reproducible findings without writing core files.

Installed extension validation now passed in isolated Chrome for Testing 151: service worker loaded, automatic suspicious warning, one mount, desktop payment action unobstructed, dismissal persists through mutations, sample-only match on matching scenario, no page errors. Screenshot artifacts/installed-extension-checkout.png. Updated tests run across all agent-owned test directories; remaining known mismatches are described in TEST_FEEDBACK.md, so a full-suite green result is not claimed yet.

The user confirmed both Opus sessions are actively building. CORE waits for their owned exports and avoids duplicating their implementation.

RISK exports are landing. The evaluator's demo directory currently uses canonical port 4173. That server now serves dist/fixtures correctly, so final validation uses http://127.0.0.1:4173/demo/index.html and /dist/preview.html. The 4174 preview redirects to canonical 4173. Core now invokes collectEvidence with its default providers (no empty providers override). Pip is integrated from src/pip/index.js; desktop/mobile installed validation is being repeated against the delivered modules.

FINAL: all delivered components integrated. 349/349 tests passed with no skips/todo. ZIP packaged. Canonical port 4173. See docs/VALIDATION.md; freeze SHA is published after the final integration commit.
