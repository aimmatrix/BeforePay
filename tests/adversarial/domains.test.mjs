import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAssessmentShape,
  assertNotDemoMatch,
  assertNotIndependentlyVerified,
} from './helpers/assert-contract.mjs';
import { evidence, observation } from './helpers/factories.mjs';
import { loadEvaluator } from './helpers/load.mjs';

const { evaluate, source } = await loadEvaluator();

function naiveIncludesWouldMatch(hostname, brandHost) {
  return hostname.includes(brandHost) || hostname.endsWith(brandHost);
}

describe(`deceptive domains [${source}]`, () => {
  it('ADV-DOM-001 brand substring in attacker hostname does not verify', () => {
    const hostname = 'n1ke-official.example';
    assert.equal(
      naiveIncludesWouldMatch(hostname, 'n1ke'),
      true,
      'fixture must be a substring trap'
    );
    const result = evaluate(
      observation({
        hostname,
        pageKey: `https://${hostname}/checkout`,
        visibleTextExcerpt: 'Official Nike outlet. Authentic trainers.',
      }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          sourceLabel: 'Lookalike directory (naive includes)',
          summary: 'Provider matched because hostname contains a brand fragment',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotDemoMatch(result);
  });

  it('ADV-DOM-002 nested suffix officialbrand.example.attacker.example does not verify', () => {
    const hostname = 'officialbrand.example.attacker.example';
    assert.equal(hostname.endsWith('officialbrand.example') === false, true);
    assert.equal(hostname.includes('officialbrand.example'), true);
    const result = evaluate(
      observation({
        hostname,
        pageKey: `https://${hostname}/pay`,
        visibleTextExcerpt: 'Official Brand checkout',
      }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          summary: 'Naive suffix/includes treated nested attacker host as officialbrand.example',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotDemoMatch(result);
    assert.ok(
      result.identityStatus === 'mismatch' || result.identityStatus === 'unverified',
      'lookalike must fail the identity comparison'
    );
  });

  it('ADV-DOM-003 brand as subdomain of attacker does not verify', () => {
    const hostname = 'nike.attacker.example';
    const result = evaluate(
      observation({ hostname, pageKey: `https://${hostname}/checkout` }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          summary: 'Leftmost label matches a brand name',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-DOM-004 hyphenated lookalike host fails closed', () => {
    const hostname = 'official-brand-shop.example';
    const result = evaluate(
      observation({ hostname, pageKey: `https://${hostname}/checkout` }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          summary: 'Fuzzy brand match',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-DOM-005 third-party checkout host is neither auto-match nor auto-scam', () => {
    const hostname = 'checkout.payments-example.com';
    const result = evaluate(
      observation({
        hostname,
        pageKey: `https://${hostname}/c/abc`,
        visibleTextExcerpt: 'Pay for Unfamiliar Shoes',
      }),
      [
        evidence({
          kind: 'identity',
          status: 'not_checked',
          sourceType: 'independent',
          summary: 'Exact-host identity not checked for this checkout host',
        }),
      ]
    );
    assertAssessmentShape(result);
    assert.equal(result.identityStatus, 'unverified');
    assert.notEqual(result.verdict, 'error');
  });

  it('ADV-DOM-006 independent record for a different host does not verify this host', () => {
    const result = evaluate(
      observation({
        hostname: 'shop-brand.example',
        pageKey: 'https://shop-brand.example/checkout',
      }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          detail: 'Directory record is for brand.example, not shop-brand.example',
          summary: 'Match against a different host',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
  });

  it('ADV-DOM-007 www vs apex fails closed without a documented host rule', () => {
    const result = evaluate(
      observation({
        hostname: 'www.brand.example',
        pageKey: 'https://www.brand.example/checkout',
      }),
      [
        evidence({
          kind: 'identity',
          status: 'matched',
          sourceType: 'independent',
          summary: 'Directory match for brand.example (apex only)',
          detail: 'No published www-stripping rule in contract v1',
        }),
      ]
    );
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
  });
});
