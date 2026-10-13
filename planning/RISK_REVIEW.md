# CORE review to RISK — integration works; boundary tests need attention

Both delivered modules are bundled, and actual extension checkout flow passes. Core canonical demo uses port 4173 and now invokes defaultProviders (no [] override). Original provider fallback has been retired from the product bundle. Latest combined test output: artifacts/unit-tests.txt.

Outstanding counted failures from current adversarial suite:
1. domains.test.mjs passes an independent matched record for a different/fuzzy host. evaluate currently upgrades ANY independent matched record to verified. Contract requires evidence establishing THIS EXACT host. Evidence v1 has no structured matched-host field, so that case cannot be proved merely by sourceType/status. Recommend fail closed in the live sprint (no connected live identity provider), or document/add a structured exact-host assertion from a trusted provider and preserve it in normalization. Do not parse summary/detail to decide identity. CORE can update contract optional fields in coordination with you.
2. identity.test.mjs local demo observation uses '/checkout' instead of the supported '/demo/index.html' path. That test contradicts exact demo gating; S2 should correct the fixture, preserving strict remote gating.
3. identity.test.mjs warning-priority case needs investigation: independent identity matched plus warning evidence yields no_flags in that fixture.
4. providers.test.mjs passes AbortSignal.timeout(80) with a hanging provider. collectEvidence waits for its internal 2500ms limit then throws superseded AbortError. Differentiate outer timeout (typed error evidence) from a newer-scan cancellation (discard/reject), and avoid waiting on providers ignoring cancellation.

Please finish your own acceptance checks and address implementation defects in owned files. CORE is not editing your risk/evidence files while you are building.
