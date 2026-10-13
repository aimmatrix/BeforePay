import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAssessmentShape,
  assertNotClean,
  assertNotIndependentlyVerified,
} from './helpers/assert-contract.mjs';
import { evidence, observation } from './helpers/factories.mjs';
import { loadEvaluator } from './helpers/load.mjs';

const { evaluate, collectEvidence, source } = await loadEvaluator();

const hangingProvider = {
  name: 'hang-directory',
  supportedKinds: ['identity', 'reputation'],
  lookup() {
    return new Promise(() => {});
  },
};

const throwingProvider = {
  name: 'boom-directory',
  supportedKinds: ['identity'],
  async lookup() {
    throw new Error('provider exploded');
  },
};

const unavailableProvider = {
  name: 'cut-directory',
  supportedKinds: ['identity'],
  async lookup() {
    return [
      evidence({
        kind: 'identity',
        status: 'unavailable',
        sourceType: 'independent',
        sourceLabel: 'cut-directory',
        summary: 'Provider access unavailable',
      }),
    ];
  },
};

describe(`provider errors [${source}]`, () => {
  it('ADV-PROV-001 timeout returns typed evidence, not a favourable identity', async () => {
    assert.equal(typeof collectEvidence, 'function');
    const obs = observation();
    const ev = await collectEvidence(obs, {
      signal: AbortSignal.timeout(80),
      providers: [hangingProvider],
    });
    assert.ok(Array.isArray(ev));
    const identity = ev.filter((item) => item.kind === 'identity');
    for (const item of identity) {
      assert.notEqual(item.status, 'matched');
      assert.notEqual(item.sourceType === 'independent' && item.status === 'matched', true);
    }
    const result = evaluate(obs, ev);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotClean(result);
  });

  it('ADV-PROV-002 unavailable access stays visible and unverified', async () => {
    const obs = observation();
    const ev = collectEvidence
      ? await collectEvidence(obs, { providers: [unavailableProvider], signal: AbortSignal.timeout(500) })
      : [evidence({ kind: 'identity', status: 'unavailable', sourceType: 'independent' })];
    assert.ok(ev.some((item) => item.status === 'unavailable' || item.status === 'not_checked'));
    const result = evaluate(obs, ev);
    assertNotIndependentlyVerified(result);
    assertNotClean(result);
  });

  it('ADV-PROV-003 provider throw does not become a clean match', async () => {
    assert.equal(typeof collectEvidence, 'function');
    const obs = observation();
    let ev;
    try {
      ev = await collectEvidence(obs, {
        providers: [throwingProvider],
        signal: AbortSignal.timeout(500),
      });
    } catch (err) {
      assert.fail(
        `collectEvidence must return typed error evidence, not throw: ${err instanceof Error ? err.message : err}`
      );
    }
    assert.ok(Array.isArray(ev));
    assert.equal(
      ev.some((item) => item.status === 'matched' && item.kind === 'identity'),
      false
    );
    const result = evaluate(obs, ev);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-PROV-004 partial page observations remain when a provider errors', () => {
    const result = evaluate(observation({ paymentClaims: ['Bank transfer only'] }), [
      evidence({
        id: 'id-err',
        kind: 'identity',
        status: 'error',
        sourceType: 'independent',
        summary: 'Directory lookup failed',
      }),
      evidence({
        id: 'pay',
        kind: 'payment',
        status: 'observed',
        sourceType: 'page',
        summary: 'Bank transfer only',
      }),
    ]);
    assertAssessmentShape(result);
    assert.ok(result.evidence.some((e) => e.id === 'id-err' && e.status === 'error'));
    assert.ok(result.evidence.some((e) => e.id === 'pay' && e.status === 'observed'));
    assert.equal(result.verdict, 'warning');
  });
});
