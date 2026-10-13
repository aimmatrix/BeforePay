import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAssessmentShape,
  assertNotClean,
  assertNotIndependentlyVerified,
} from './helpers/assert-contract.mjs';
import { assessment, evidence, observation } from './helpers/factories.mjs';
import { loadEvaluator, loadRuntime } from './helpers/load.mjs';

const { evaluate, collectEvidence, source } = await loadEvaluator();
const runtime = await loadRuntime();

describe(`stale results [${source}]`, () => {
  it('ADV-STALE-001 stale identity evidence cannot verify or clean a result', () => {
    const result = evaluate(observation(), [
      evidence({
        kind: 'identity',
        status: 'stale',
        sourceType: 'independent',
        summary: 'Previously matched identity, now stale',
        checkedAt: '2020-01-01T00:00:00.000Z',
      }),
    ]);
    assertAssessmentShape(result);
    assertNotIndependentlyVerified(result);
    assertNotClean(result, 'stale evidence cannot yield no_flags');
    assert.ok(result.evidence.some((item) => item.status === 'stale'));
  });

  it('ADV-STALE-005 collectEvidence must not rewrite stale payloads to matched', async () => {
    if (typeof collectEvidence !== 'function') {
      assert.fail('collectEvidence missing');
    }
    const staleProvider = {
      name: 'stale-directory',
      supportedKinds: ['identity'],
      async lookup() {
        return [
          evidence({
            kind: 'identity',
            status: 'stale',
            sourceType: 'independent',
            sourceLabel: 'stale-directory',
            summary: 'Cached match is stale',
            checkedAt: '2020-01-01T00:00:00.000Z',
          }),
        ];
      },
    };
    const obs = observation();
    const ev = await collectEvidence(obs, { providers: [staleProvider], signal: AbortSignal.timeout(500) });
    const fromProvider = ev.filter((item) => item.sourceLabel === 'stale-directory');
    for (const item of fromProvider) {
      assert.notEqual(item.status, 'matched');
    }
  });
});

describe('stale results [CORE scan controller]', () => {
  it('ADV-STALE-002 older scanId must not overwrite a newer result', async () => {
    assert.equal(typeof runtime.createScanController, 'function');
    const events = [];
    let assessCalls = 0;
    const controller = runtime.createScanController({
      timeoutMs: 1000,
      collect(scanId) {
        return observation({ scanId: String(scanId), pageKey: 'https://a.example/checkout' });
      },
      currentKey() {
        return 'https://a.example/checkout';
      },
      onChecking() {
        events.push('checking');
      },
      onResult(result) {
        events.push({ type: 'result', scanId: result.scanId, verdict: result.verdict });
      },
      onError(err) {
        events.push({ type: 'error', message: String(err) });
      },
      async assess(obs) {
        const n = ++assessCalls;
        if (n === 1) {
          await new Promise((r) => setTimeout(r, 40));
          return assessment({
            scanId: obs.scanId,
            pageKey: obs.pageKey,
            verdict: 'warning',
            identityStatus: 'mismatch',
            headline: 'stale-winner-if-buggy',
          });
        }
        return assessment({
          scanId: obs.scanId,
          pageKey: obs.pageKey,
          verdict: 'uncertain',
          identityStatus: 'unverified',
          headline: 'newer-scan',
        });
      },
    });
    await Promise.all([controller.scan(), controller.scan()]);
    const results = events.filter((e) => e && e.type === 'result');
    assert.equal(results.length, 1, 'exactly one scan result may render');
    assert.equal(results[0].verdict, 'uncertain');
    assert.notEqual(results[0].headline, 'stale-winner-if-buggy');
  });

  it('ADV-STALE-003 pageKey change discards in-flight work', async () => {
    let key = 'https://a.example/checkout';
    const events = [];
    const controller = runtime.createScanController({
      timeoutMs: 1000,
      collect(scanId) {
        return observation({ scanId: String(scanId), pageKey: key });
      },
      currentKey() {
        return key;
      },
      onChecking() {},
      onResult(result) {
        events.push(result.pageKey);
      },
      onError() {},
      async assess(obs) {
        if (obs.pageKey.includes('a.example')) {
          await new Promise((r) => setTimeout(r, 40));
        }
        return assessment({
          scanId: obs.scanId,
          pageKey: obs.pageKey,
          verdict: 'warning',
          headline: obs.pageKey,
        });
      },
    });
    const first = controller.scan();
    key = 'https://b.example/checkout';
    const second = controller.scan();
    await Promise.all([first, second]);
    assert.deepEqual(events, ['https://b.example/checkout']);
  });

  it('ADV-STALE-002b confirms Assessment.scanId and pageKey before render', async () => {
    const events = [];
    const controller = runtime.createScanController({
      timeoutMs: 1000,
      collect() {
        return observation({ scanId: 'scan-live', pageKey: 'https://a.example/checkout' });
      },
      currentKey() {
        return 'https://a.example/checkout';
      },
      onChecking() {},
      onResult(result) {
        events.push(result);
      },
      onError() {},
      async assess() {
        return assessment({
          scanId: 'forged-old-scan',
          pageKey: 'https://other.example/checkout',
          verdict: 'no_flags',
          identityStatus: 'verified',
          headline: 'forged clean result',
        });
      },
    });
    await controller.scan();
    assert.equal(
      events.length,
      0,
      'CORE must confirm scanId and pageKey before rendering; forged assessments must be dropped'
    );
  });

  it('ADV-STALE-004 rescan / invalidate cancels the previous generation', async () => {
    const events = [];
    const controller = runtime.createScanController({
      timeoutMs: 1000,
      collect(scanId) {
        return observation({ scanId: String(scanId) });
      },
      currentKey() {
        return 'https://a.example/checkout';
      },
      onChecking() {},
      onResult(result) {
        events.push(result.scanId);
      },
      onError() {},
      async assess(obs) {
        await new Promise((r) => setTimeout(r, 30));
        return assessment({ scanId: obs.scanId, pageKey: obs.pageKey });
      },
    });
    const first = controller.scan();
    controller.invalidate();
    await first;
    assert.equal(events.length, 0, 'invalidated scan must not render');
  });
});
