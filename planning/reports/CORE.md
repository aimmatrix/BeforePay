# CORE handoff — runtime and integration

Status: VERIFIED — integrated runtime, delivered components and packaged extension.
Checkout: /Users/ammad/Documents/FinTech (shared, explicitly authorized by user).
Baseline: 3b8da96. Contract v1 frozen.

Implemented: MV3 service worker and popup actions, manual scan injection, optional per-site script registration/removal, minimal page observation, checkout detection, scan cancellation/timeouts/navigation invalidation, result identity/scan validation, Shadow DOM mount/lifecycle, reduced-motion override and keyboard focus return. Builds select delivered owned components and record source hashes.

Integrated: C1 store, C2 evidence panel, C3 popup, S1 fixture files. RISK/PIP are still pending; temporary core adapters allow runtime testing. Their presence is not claimed as final risk logic or final mascot.

Validation actually run:
- 9 initial core tests passed, including stale result cancellation and identity-policy boundary.
- Chrome preview scenarios: suspicious warning, matching demo_match, no page errors.
- Actual unpacked extension in isolated Chrome for Testing 151, preview OFF: worker loaded, automatic checkout warning, one mount, payment button unobstructed on desktop, dismissal survives page mutation, matching demo identity label, no page errors.
- Actual extension unfamiliar local checkout with fake verified claim: remains uncertain; password/card input values absent from evidence; dismiss returns focus to guardian.
- Combined agent suite runs; known S1 demo-origin mismatch and newly arriving tests are still being reconciled. Full green suite not claimed yet. See TEST_FEEDBACK.md.

Core integration server: http://127.0.0.1:4174/demo/index.html
Preview: http://127.0.0.1:4174/dist/preview.html
Load unpacked: /Users/ammad/Documents/FinTech/dist/extension
Existing server 4173 preserved. Don't restart servers or modify other agents' owned files without transfer.

Optional independent reputation APIs are cut for the sprint per S5 research. Real stores have no independent identity verification until a suitable source is connected. No real payment occurs.

Final result: 349/349 tests passed, no skipped/todo cases, including actual isolated Chromium extension tests. Product bundle selects RISK/PIP/C2/C3, no temporary adapters. See docs/VALIDATION.md.
