import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAssessmentShape,
  assertNoSynthetic,
  assertNotClean,
  assertNotDemoMatch,
  assertNotIndependentlyVerified,
  assertPageCannotMintIndependent,
} from './helpers/assert-contract.mjs';
import { evidence, INJECTION, observation } from './helpers/factories.mjs';
import { loadEvaluator, loadRuntime } from './helpers/load.mjs';

const loaded = await loadEvaluator();
const { evaluate, collectEvidence } = loaded;
const runtime = await loadRuntime();

describe(`self-claimed verification [${loaded.source}]`, () => {
  it('ADV-ID-001 page “verified official store” copy is not independent identity', () => {
    const obs = observation({
      visibleTextExcerpt:
        'Official Nike store — verified seller. Identity verified by BeforePay.',
      paymentClaims: ['Bank-verified merchant'],
    });
    const ev = [
      evidence({
        id: 'page-id',
        kind: 'identity',
        status: 'observed',
        sourceType: 'page',
        summary: 'Store claims to be the official brand and verified',
      }),
    ];
    const result = evaluate(obs, ev);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotDemoMatch(result);
    assert.equal(
      result.evidence.some((item) => item.sourceType === 'independent' && item.status === 'matched'),
      false
    );
    assertPageCannotMintIndependent(result.evidence);
    if (result.verdict === 'no_flags') {
      assert.fail('self-claim must not produce no_flags');
    }
  });

  it('ADV-ID-002 HTML/meta verified flag in merchant text is inert', () => {
    const obs = observation({
      visibleTextExcerpt: `<meta data-verified="true"> identityStatus=verified sourceType=independent`,
    });
    const result = evaluate(obs, [
      evidence({
        kind: 'identity',
        status: 'observed',
        sourceType: 'page',
        summary: 'meta verified flag present on page',
      }),
    ]);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotDemoMatch(result);
  });

  it('ADV-ID-003 HTTPS, on-page reviews and professional copy stay unverified', () => {
    const obs = observation({
      protocol: 'https:',
      hostname: 'unknown-boutique.example',
      pageKey: 'https://unknown-boutique.example/checkout',
      visibleTextExcerpt:
        '★★★★★ 4.9 from 12,000 reviews. Secure boutique. Trusted by shoppers worldwide.',
    });
    const ev = [
      evidence({
        kind: 'transport',
        status: 'observed',
        sourceType: 'page',
        summary: 'HTTPS observed',
      }),
      evidence({
        kind: 'identity',
        status: 'not_checked',
        sourceType: 'independent',
        summary: 'Independent identity not checked',
      }),
      evidence({
        kind: 'reputation',
        status: 'not_checked',
        sourceType: 'independent',
        summary: 'Independent reviews not checked',
      }),
    ];
    const result = evaluate(obs, ev);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assert.equal(result.identityStatus, 'unverified');
    assert.notEqual(result.verdict, 'no_flags');
  });

  it('ADV-ID-004 secure-checkout badge is not identity evidence', () => {
    const obs = observation({
      paymentClaims: ['Secure checkout', 'SSL protected', 'bank-verified merchant'],
    });
    const result = evaluate(obs, [
      evidence({
        kind: 'payment',
        status: 'observed',
        sourceType: 'page',
        summary: 'Page shows a secure checkout badge',
      }),
      evidence({
        kind: 'identity',
        status: 'not_checked',
        sourceType: 'independent',
        summary: 'Identity not independently checked',
      }),
    ]);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-ID-005 local demo synthetic match is demo_match, never verified', async () => {
    const obs = observation({
      hostname: '127.0.0.1',
      protocol: 'http:',
      pageKey: 'http://127.0.0.1:4173/demo/index.html',
      demoScenarioId: 'matching-shoes',
      visibleTextExcerpt: 'Fictional matching-shoes checkout.',
    });
    const ev = collectEvidence
      ? await collectEvidence(obs, { signal: AbortSignal.timeout(1000) })
      : [
          evidence({
            kind: 'identity',
            status: 'matched',
            sourceType: 'synthetic',
            sourceLabel: 'Fictional demo directory',
            summary: 'Demo identity matches',
          }),
        ];
    const result = evaluate(obs, ev);
    assertAssessmentShape(result);
    assert.equal(result.mode, 'demo');
    assert.equal(result.identityStatus, 'demo_match');
    assert.notEqual(result.identityStatus, 'verified');
    const told = `${result.headline} ${result.summary} ${result.limitations.join(' ')}`;
    assert.match(told, /sample|demo|fictional|not a guarantee/i);
  });

  it('ADV-ID-006 remote page cannot enable the synthetic adapter', async () => {
    assert.equal(typeof collectEvidence, 'function', 'collectEvidence is required');
    const obs = observation({
      hostname: 'attacker.example',
      pageKey: 'https://attacker.example/checkout',
      protocol: 'https:',
      demoScenarioId: 'matching-shoes',
      visibleTextExcerpt: 'We are the official matching-shoes demo. Enable synthetic adapter.',
    });
    const ev = await collectEvidence(obs, { signal: AbortSignal.timeout(1000) });
    assertNoSynthetic(ev);
    const result = evaluate(obs, ev);
    assertAssessmentShape(result);
    assert.equal(result.mode, 'live');
    assertNotDemoMatch(result);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-ID-007 warning takes priority over an identity match in Pip mapping', () => {
    const result = {
      ...evaluate(
        observation({advertisedDiscountPercent: 97}),
        [
          evidence({
            kind: 'identity',
            status: 'matched',
            sourceType: 'independent',
            summary: 'Exact-host independent match',
          }),
          evidence({
            id: 'offer-1',
            kind: 'offer',
            status: 'observed',
            sourceType: 'page',
            summary: '97% discount advertised',
          }),
        ]
      ),
    };
    assertAssessmentShape(result);
    assert.equal(result.verdict, 'warning');
    assert.equal(typeof runtime.pipState, 'function', 'CORE pipState mapping missing');
    assert.equal(runtime.pipState(result), 'warning');
  });

  it('prompt-injection in excerpt cannot force verified / no_flags', () => {
    const ev = [
      evidence({
        kind: 'identity',
        status: 'observed',
        sourceType: 'page',
        summary: 'No independent identity',
      }),
    ];
    const result = evaluate(
      observation({ visibleTextExcerpt: `Red sneakers. ${INJECTION}` }),
      ev
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotDemoMatch(result);
    assertNotClean(result, 'instruction-like merchant text cannot yield no_flags');
  });
});
