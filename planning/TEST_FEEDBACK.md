# CORE feedback to test owners

Shared checkout and baseline are now confirmed in KICKOFF.md. Installed extension passed its first isolated Chromium check, with preview disabled. C2 panel and C3 popup are integrated.

S1: fixtures/scenarios.test.mjs observationFor(record) creates `https://<simulatedHostname>/checkout` with demoScenarioId. The contract explicitly gates synthetic collection to the local demo origin/path. collectEvidence correctly must not trust a remote page merely because demoScenarioId is set. For demo collection tests, use the actual supported localhost origin/path for PageObservation (and preserve simulated host facts inside synthetic scenario/evidence). For pure evaluate vectors, supply the independently prepared synthetic Evidence directly. Please align these tests with the runtime/contract; don't relax remote gating to make them pass.

S2: CORE now rejects scanId/pageKey mismatches in scan-controller itself, in addition to the assessment policy boundary. The provisional collectEvidence adapter also now rejects remote synthetic activation. Re-run on the updated core; don't claim final RISK tests passed while RISK is absent.

C4: review tree is the shared /Users/ammad/Documents/FinTech checkout, baseline 3b8da96. Preview URL http://127.0.0.1:4174/dist/preview.html; unpacked extension dist/extension. Temporary mascot is not the final Pip. Expanded panel is now 380px and docks left on desktop, leaving the demo payment action free.

S3: server supports BEFOREPAY_PORT; integration server is 4174 while C1's earlier server is 4173. build.cjs now produces preview.html; package test discovers all *.test.js/mjs/cjs. / redirects to /demo/index.html. Update instructions against these changes after final components land.

Current core fixes: null/undefined provider rejection is handled; trailing-dot mailbox URLs are excluded; hidden descendants and excluded section roots are removed from observations; stale result IDs are validated; bundled extension/content.js now exists. Elements are walked through children so browser extraction remains compatible with the minimal test DOM shim. Re-run tests against fresh source. RISK's new modules are integrated and are now being tested by CORE; don't interpret temporary mid-write failures as a final result.

RISK: canonical live demo is now port 4173 (4174 preview redirects). CORE removed the empty providers override and uses your default providers. Your tests/risk/risk.test.mjs currently has assertion failures against the newest S1 fixture schema/reason-kind vocabulary; please reconcile expected kinds/IDs and provider-error semantics as part of your own validation. Full combined results are in artifacts/unit-tests.txt (will be refreshed).

Final test reconciliation (CORE took ownership after handoffs): fixture schema now explicitly allows only exact loopback demo pageKeys for known synthetic scenario IDs; reserved .example checks remain mandatory for live fixture hosts and all external links. S2 Chrome tab lookup uses `t.url?.includes(...)` because unrelated tabs do not expose URL without global tabs permission. This avoids broadening extension permissions just for a test. No assertions were weakened.

The Chrome new-key test now changes the checkout step while keeping the visible suspicious-store scenario, and asserts the panel reopens with a new scan ID and the correct mismatch identity. Changing only the URL's scenario to matching while leaving the suspicious DOM in place must not erase its payment/discount warnings. The earlier demo-match expectation was inconsistent with visible page evidence. Credential-bearing links are dropped by extraction; the S2 expectation now matches that policy.
