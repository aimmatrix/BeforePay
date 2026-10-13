import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAssessmentShape,
  assertNotClean,
  assertNotIndependentlyVerified,
} from './helpers/assert-contract.mjs';
import { evidence, observation } from './helpers/factories.mjs';
import { loadEvaluator } from './helpers/load.mjs';

const { evaluate, source } = await loadEvaluator();

describe(`missing checks [${source}]`, () => {
  it('ADV-MISS-001 core identity not_checked stays uncertain, not no_flags', () => {
    const result = evaluate(observation(), [
      evidence({
        kind: 'identity',
        status: 'not_checked',
        sourceType: 'independent',
        summary: 'Independent identity not checked',
      }),
    ]);
    assertAssessmentShape(result);
    assert.equal(result.identityStatus, 'unverified');
    assert.equal(result.verdict, 'uncertain');
    assertNotClean(result);
  });

  it('ADV-MISS-003 warnings still apply while identity is missing', () => {
    const result = evaluate(observation({ advertisedDiscountPercent: 92 }), [
      evidence({
        kind: 'identity',
        status: 'not_checked',
        sourceType: 'independent',
        summary: 'Identity not checked',
      }),
      evidence({
        id: 'offer',
        kind: 'offer',
        status: 'observed',
        sourceType: 'page',
        summary: '92% discount advertised',
      }),
    ]);
    assertAssessmentShape(result);
    assert.equal(result.verdict, 'warning');
    assert.equal(result.identityStatus, 'unverified');
  });

  it('ADV-MISS-004 empty evidence is not a clean result', () => {
    const result = evaluate(observation(), []);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotClean(result, 'empty evidence cannot be no_flags');
    assert.ok(result.verdict === 'uncertain' || result.verdict === 'error');
  });

  it('ADV-MISS-005 partial results remain on the assessment', () => {
    const input = [
      evidence({
        id: 't',
        kind: 'transport',
        status: 'observed',
        sourceType: 'page',
        summary: 'HTTPS',
      }),
      evidence({
        id: 'r',
        kind: 'returns',
        status: 'not_checked',
        sourceType: 'page',
        summary: 'Returns not checked',
      }),
      evidence({
        id: 'i',
        kind: 'identity',
        status: 'unavailable',
        sourceType: 'independent',
        summary: 'Identity provider unavailable',
      }),
    ];
    const result = evaluate(observation(), input);
    assertAssessmentShape(result);
    const statuses = Object.fromEntries(result.evidence.map((e) => [e.kind, e.status]));
    assert.equal(statuses.transport, 'observed');
    assert.equal(statuses.returns, 'not_checked');
    assert.equal(statuses.identity, 'unavailable');
    assertNotClean(result);
  });
});
