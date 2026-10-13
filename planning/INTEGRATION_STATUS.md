# CORE integration status — complete, 13 October 2026

Shared checkout `/Users/ammad/Documents/FinTech`, branch `codex/beforepay-core`. Existing work preserved. The build explicitly selects `src/risk/index.js` for collectEvidence/evaluate and the real Pip, panel and popup index modules. Missing exports fail the build. No product fallback adapters or remote evidence providers are used.

Canonical server: http://127.0.0.1:4173/demo/index.html
Suspicious recording start: http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes
Matching sample: http://127.0.0.1:4173/demo/index.html?scenario=matching-shoes
Preview only: http://127.0.0.1:4173/dist/preview.html
Load unpacked: `/Users/ammad/Documents/FinTech/dist/extension`

Port 4173 was inspected and serves the current build. Both existing servers are preserved; port 4174 is not a synthetic-evidence origin. Reuse the running server. For a fresh session run `npm install`, `npm run build`, then `npm start`. Reload Chrome's extension card and the page after rebuilding.

Validation: `npm test` passed **349/349**, zero failures, skips or todos. `node tests/adversarial/run.mjs` passed **214/214**, zero failures, skips or todos. Installed-extension tests cover one mount, repeated hints, iframe exclusion, dismiss/new-checkout reopening, navigation and scan cancellation, payment access, desktop suspicious warning and matching sample, mobile reduced motion, and password/card exclusion. Preview was checked separately and passed both scenarios with no page errors.

Popup-document actions passed scan, motion persistence, keyboard focus, rescan, and visible failure when Chrome refuses removal of required local demo access. The headless popup harness supplies the active shopping tab; physical toolbar selection and a remote site's optional-permission prompt were not verified. This limitation does not block recording the local checkout flow.

S2 actionable defects are resolved: synthetic evidence cannot establish real-site identity; null/undefined rejections surface an error; trailing-dot mailbox hosts are excluded; hidden/private/extension descendants and roots are excluded; unsafe and credential-bearing links are dropped; production copy uses fraud-report wording. No assertions are hidden behind todo/skip.

Ready to record the suspicious checkout → scan → warning → Pip/panel flow, followed by the matching sample. Keep the demo disclosures visible. Real websites stay unverified. Missing identity means uncertain unless completed warning findings justify warning. Matching samples use demo_match, never verified. No real payments, independent identity lookup, or fraud-accuracy claim.

`npm run package` creates `artifacts/BeforePay-extension.zip`. Build outputs, screenshots and test logs are generated artifacts, excluded from the handoff commit. See `docs/VALIDATION.md` and README for commands and limitations. The final commit SHA is returned in the chat handoff.
