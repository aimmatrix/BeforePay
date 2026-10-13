# Final build validation — 13 October 2026

The integrated bundle uses the delivered RISK evidence/evaluator modules, PIP character, C2 panel and C3 popup. Temporary adapters are excluded from the product bundle. C1 provides the fictional store and checkout; S1 provides synthetic scenarios; S2/RISK/PIP/Cursor tests were run by CORE together.

## Acceptance actually run

Command: `node scripts/test.cjs` using the local Node runtime with permission to launch isolated Chrome for Testing.

Result: **349 tests, 349 passed, 0 failed, 0 skipped, 0 todo**.

Coverage includes provider failures/timeouts, synthetic-vs-live gating, deceptive-domain inputs, missing/stale evidence, malicious merchant text, privacy extraction, stale scan cancellation, Pip states/cleanup, panel safety, popup state/actions and actual unpacked extension lifecycle cases.

Installed extension tests run without the preview shim. Browser cases include duplicate checkout hints, marker flicker, extra frames, dismissal and new checkout key, navigation during scans, concurrent scans and desktop payment accessibility. CORE's standalone installed checks also confirmed unknown-site self-claims remain uncertain, password/card field values are absent from findings, keyboard focus returns after dismissal, and compact mobile Pip works with reduced motion.

No real payments or private mailbox data were used. No external identity/reputation source is connected. Real websites remain unverified; the extension can flag visible warning signs. Demo identity matches use a fictional directory and must not be represented as real-store certification. These synthetic tests do not establish real-world fraud-detection accuracy.

## Outputs

- Load unpacked folder: `/Users/ammad/Documents/FinTech/dist/extension`
- ZIP: `/Users/ammad/Documents/FinTech/artifacts/BeforePay-extension.zip`
- Store: `http://127.0.0.1:4173/demo/index.html`
- No-install preview: `http://127.0.0.1:4173/dist/preview.html`
- Bundle selection / source hashes: `dist/build-report.json`
- Test output: `artifacts/final-tests.txt`

The default public Chrome installation was not modified. Testing used isolated temporary Chromium profiles. Chrome Web Store publishing, live merchant verification and hackathon submission were not performed.
