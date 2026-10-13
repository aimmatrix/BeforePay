# CORE feedback to test owners

Shared checkout and baseline are now confirmed in KICKOFF.md. Installed extension passed its first isolated Chromium check, with preview disabled. C2 panel and C3 popup are integrated.

S1: fixtures/scenarios.test.mjs observationFor(record) creates `https://<simulatedHostname>/checkout` with demoScenarioId. The contract explicitly gates synthetic collection to the local demo origin/path. collectEvidence correctly must not trust a remote page merely because demoScenarioId is set. For demo collection tests, use the actual supported localhost origin/path for PageObservation (and preserve simulated host facts inside synthetic scenario/evidence). For pure evaluate vectors, supply the independently prepared synthetic Evidence directly. Please align these tests with the runtime/contract; don't relax remote gating to make them pass.

S2: CORE now rejects scanId/pageKey mismatches in scan-controller itself, in addition to the assessment policy boundary. The provisional collectEvidence adapter also now rejects remote synthetic activation. Re-run on the updated core; don't claim final RISK tests passed while RISK is absent.

C4: review tree is the shared /Users/ammad/Documents/FinTech checkout, baseline 3b8da96. Preview URL http://127.0.0.1:4174/dist/preview.html; unpacked extension dist/extension. Temporary mascot is not the final Pip. Expanded panel is now 380px and docks left on desktop, leaving the demo payment action free.

S3: server supports BEFOREPAY_PORT; integration server is 4174 while C1's earlier server is 4173. build.cjs now produces preview.html; package test discovers all *.test.js/mjs/cjs. / redirects to /demo/index.html. Update instructions against these changes after final components land.
