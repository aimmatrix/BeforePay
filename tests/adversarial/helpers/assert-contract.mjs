import assert from 'node:assert/strict';

const VERDICTS = new Set(['warning', 'uncertain', 'no_flags', 'error']);
const IDENTITIES = new Set(['verified', 'unverified', 'mismatch', 'demo_match']);

export function assertAssessmentShape(result) {
  assert.equal(result.schemaVersion, 1, 'schemaVersion must be 1');
  assert.equal(typeof result.scanId, 'string');
  assert.equal(typeof result.pageKey, 'string');
  assert.ok(VERDICTS.has(result.verdict), `unexpected verdict ${result.verdict}`);
  assert.ok(IDENTITIES.has(result.identityStatus), `unexpected identity ${result.identityStatus}`);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(Array.isArray(result.reasons));
  assert.ok(Array.isArray(result.limitations));
  assert.ok(Array.isArray(result.nextSteps));
  const blob = `${result.headline} ${result.summary} ${result.reasons.map((r) => r.detail).join(' ')}`;
  assert.doesNotMatch(
    blob,
    /\b\d{1,3}%\s+(risk|likely|probability|chance of fraud|safe)\b/i,
    'no fabricated risk percentage'
  );
}

export function assertNotIndependentlyVerified(result) {
  assert.notEqual(result.identityStatus, 'verified', 'page or missing checks cannot yield verified');
}

export function assertNotDemoMatch(result) {
  assert.notEqual(result.identityStatus, 'demo_match', 'demo_match is only for the local demo adapter');
}

export function assertNotClean(result, why) {
  assert.notEqual(result.verdict, 'no_flags', why || 'missing/error/stale checks cannot become a clean result');
}

export function assertNoSynthetic(evidence) {
  const synthetic = (evidence || []).filter((item) => item.sourceType === 'synthetic');
  assert.equal(synthetic.length, 0, 'remote or non-demo pages must not receive synthetic evidence');
}

export function assertPageCannotMintIndependent(evidence) {
  for (const item of evidence || []) {
    if (item.sourceType === 'independent' || item.sourceType === 'synthetic') {
      assert.notEqual(
        item.sourceLabel?.toLowerCase(),
        'the website',
        'a website cannot grant itself independent status'
      );
    }
  }
}
