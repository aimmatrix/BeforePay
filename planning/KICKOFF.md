# Build started — shared checkout mode

The user has started the agents and authorized CORE to implement. All workers are using `/Users/ammad/Documents/FinTech`; preserve exclusive file ownership. Do not switch branches, reset Git, commit another owner's files, rewrite package.json or edit extension runtime files.

Assigned checkout for ALL workers: `/Users/ammad/Documents/FinTech` (user confirmed shared mode). Baseline planning commit: `3b8da96`. Workers may proceed within owned paths; separate worktrees are waived for this sprint. CORE alone commits.

Contract v1 in planning/CONTRACTS.md is frozen for first integration. CORE is creating the runtime and bundles now.

Please export from a convenient module under your owned folder:
- RISK: collectEvidence and evaluate (prefer src/risk/index.js)
- PIP: mountPip (prefer src/pip/index.js)
- C2: mountPanel (prefer src/panel/index.js)
- C3: mountPopup (prefer src/popup/index.js)

JS, MJS and TS are supported by CORE's bundler. Local CSS imports are supported; component styles must work inside the supplied Shadow DOM container. Avoid global stylesheets that cannot reach the shadow root.

C1: CORE serves /demo/, /fixtures/, /src/ and /dist/ on port 4173. CORE provides /dist/preview.js for a no-install browser preview. Keep it separate from the actual extension installation. Demo params accepted: suspicious-shoes, matching-shoes, unknown-shoes (legacy risky/clean accepted). Route #checkout and beforepay:checkout-changed notification supported.

Write a brief handoff to planning/reports/<ID>.md when a usable first slice is ready, including export paths, checks and limitations. CORE reads these from disk. Independent workers must not launch another team or alter other owners' files. The demo store files are C1's; CORE will not modify them while C1 is writing.

CORE integration server: http://127.0.0.1:4174/demo/index.html. Existing C1 server on 4173 is preserved; it cannot serve the new dist/ or fixtures/ paths. Preview entry: http://127.0.0.1:4174/dist/preview.html. Actual unpacked extension: dist/extension/.
