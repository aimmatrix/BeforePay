/**
 * S2 adversarial suite, part 2 (contract-first):
 *   3. provider errors, timeouts and aborts at the scan-controller / guardian boundary
 *   4. stale findings and race conditions (rapid rescans, SPA route changes)
 *   7. repeated popup / dismiss / rescan / destroy lifecycle
 *
 * Sections A (controller) test src/runtime/scan-controller.js in isolation.
 * Section B boots the REAL src/runtime/content-entry.js inside a fake DOM (s2-contract-helpers/fake-dom.mjs); the bundler alias
 * `beforepay-components` is redirected to s2-contract-helpers/components-stub.mjs which delegates to real owner modules when
 * they exist (src/risk, src/panel, src/pip) and falls back to src/runtime/fallback.js otherwise.
 */
import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { scanController, srcUrl } from './s2-contract-helpers/impl.mjs';
import { installPageEnvironment } from './s2-contract-helpers/fake-dom.mjs';

register('./s2-contract-helpers/resolve-hooks.mjs', import.meta.url);

const { createScanController } = scanController;
const settle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

function assessment(scanId, extra = {}) {
  return {
    schemaVersion: 1, scanId: String(scanId), pageKey: 'https://shop.example/checkout', createdAt: new Date().toISOString(), mode: 'live',
    verdict: 'uncertain', identityStatus: 'unverified', headline: 'h', summary: 's', reasons: [], evidence: [], nextSteps: [], limitations: [], ...extra
  };
}

/** Controller harness with observable callbacks and per-call deferred assess(). */
function harness({ key = () => '/checkout', timeoutMs = 6000, collect } = {}) {
  const log = { checking: 0, results: [], errors: [], assessCalls: [] };
  const controller = createScanController({
    collect: collect ?? ((scanId) => ({ scanId, pageKey: 'https://shop.example/checkout' })),
    assess: (observation, { signal }) => {
      const d = deferred();
      log.assessCalls.push({ observation, signal, ...d });
      return d.promise;
    },
    currentKey: key,
    onChecking: () => { log.checking++; },
    onResult: (r) => log.results.push(r),
    onError: (e) => log.errors.push(e),
    timeoutMs
  });
  /** Resolve the i-th assess() with an Assessment that truthfully belongs to its own observation. */
  log.answer = (i, extra = {}) => log.assessCalls[i].resolve(assessment(log.assessCalls[i].observation.scanId, { pageKey: log.assessCalls[i].observation.pageKey, ...extra }));
  log.scanId = (i) => log.assessCalls[i].observation.scanId;
  return { controller, log };
}

/* ======================================================================= A. scan-controller */

test('[3] a throwing assess() surfaces onError exactly once and never onResult', async () => {
  const errors = [], results = [];
  const c = createScanController({
    collect: (id) => ({ scanId: id }), assess: () => { throw new Error('provider exploded'); }, currentKey: () => 'k',
    onChecking() {}, onResult: (r) => results.push(r), onError: (e) => errors.push(e.message)
  });
  await c.scan();
  assert.deepEqual(errors, ['provider exploded']);
  assert.equal(results.length, 0);
  c.destroy();
});

test('[3] a rejecting assess() and a throwing collect() both surface onError, never a result', async () => {
  for (const mode of ['reject', 'collect']) {
    const errors = [], results = [];
    let assessed = 0;
    const c = createScanController({
      collect: (id) => { if (mode === 'collect') throw new Error('page not supported'); return { scanId: id }; },
      assess: async () => { assessed++; throw new Error('provider 503'); }, currentKey: () => 'k',
      onChecking() {}, onResult: (r) => results.push(r), onError: (e) => errors.push(e.message)
    });
    await c.scan();
    assert.equal(errors.length, 1, mode);
    assert.equal(results.length, 0, mode);
    if (mode === 'collect') assert.equal(assessed, 0, 'assess must not run if observation collection failed');
    c.destroy();
  }
});

test('[3] a provider that rejects with a non-Error value still reaches onError (scan() itself never rejects)', async () => {
  for (const thrown of ['boom', null, undefined, 42, { message: 'x' }]) {
    const errors = [];
    const c = createScanController({
      collect: (id) => ({ scanId: id }), assess: async () => { throw thrown; }, currentKey: () => 'k',
      onChecking() {}, onResult: () => assert.fail('no result'), onError: (e) => errors.push(e)
    });
    await assert.doesNotReject(c.scan());
    assert.equal(errors.length, 1, String(thrown));
    c.destroy();
  }
});

test('[3] timeout: reports one error, aborts in-flight work, and a late provider answer is ignored', async () => {
  const { controller, log } = harness({ timeoutMs: 20 });
  await controller.scan();
  assert.equal(log.errors.length, 1);
  assert.match(log.errors[0].message, /timed out/i);
  assert.equal(log.assessCalls[0].signal.aborted, true, 'in-flight provider work must receive the abort');
  log.answer(0, { verdict: 'no_flags', identityStatus: 'verified' });
  await settle();
  assert.equal(log.results.length, 0, 'a clean result arriving after the timeout must not be rendered');
  assert.equal(log.errors.length, 1);
  controller.destroy();
});

test('[3] a provider that honours the abort signal causes exactly one error, with no hang', async () => {
  const errors = [];
  const c = createScanController({
    collect: (id) => ({ scanId: id }),
    assess: (o, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    currentKey: () => 'k', onChecking() {}, onResult: () => assert.fail('no result'), onError: (e) => errors.push(e), timeoutMs: 20
  });
  await c.scan();
  assert.equal(errors.length, 1);
  c.destroy();
});

test('[3] the timeout timer is cleared after a normal result (no late abort of finished work)', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { controller, log } = harness({ timeoutMs: 60_000 });
    const p = controller.scan();
    log.answer(0);
    await p;
    mock.timers.tick(120_000);
    assert.equal(log.assessCalls[0].signal.aborted, false);
    assert.equal(log.errors.length, 0);
    assert.equal(log.results.length, 1);
    controller.destroy();
  } finally { mock.timers.reset(); }
});

test('[4] rapid rescans: only the newest scan may render, whatever order providers answer', async () => {
  const { controller, log } = harness();
  const p1 = controller.scan(), p2 = controller.scan(), p3 = controller.scan();
  assert.equal(log.checking, 3);
  assert.equal(log.assessCalls[0].signal.aborted, true);
  assert.equal(log.assessCalls[1].signal.aborted, true);
  assert.equal(log.assessCalls[2].signal.aborted, false);
  log.answer(2);
  log.answer(0);
  log.answer(1);
  await Promise.all([p1, p2, p3]);
  assert.deepEqual(log.results.map((r) => r.scanId), [log.scanId(2)]);
  assert.equal(log.errors.length, 0);
  controller.destroy();
});

test('[4] a superseded scan that FAILS late cannot surface a stale error over newer state', async () => {
  const { controller, log } = harness();
  const p1 = controller.scan(), p2 = controller.scan();
  log.answer(1);
  await p2;
  log.assessCalls[0].reject(new Error('old provider failure'));
  await p1;
  assert.deepEqual(log.results.map((r) => r.scanId), [log.scanId(1)]);
  assert.equal(log.errors.length, 0);
  controller.destroy();
});

test('[4] page key change mid-scan discards both results and errors for the old page', async () => {
  for (const outcome of ['result', 'error']) {
    let key = '/checkout#a';
    const { controller, log } = harness({ key: () => key });
    const p = controller.scan();
    key = '/checkout#b';
    if (outcome === 'result') log.answer(0); else log.assessCalls[0].reject(new Error('late'));
    await p;
    assert.equal(log.results.length + log.errors.length, 0, outcome);
    controller.destroy();
  }
});

test('[4] #product -> #checkout -> #product with invalidate(): the first scan stays stale even though the key matches again', async () => {
  let key = '/p#product';
  const { controller, log } = harness({ key: () => key });
  const first = controller.scan();
  key = '/p#checkout'; controller.invalidate();
  key = '/p#product'; controller.invalidate();
  log.answer(0);
  await first;
  assert.equal(log.results.length, 0, 'finding for an earlier visit must not be rendered');
  assert.equal(log.assessCalls[0].signal.aborted, true);
  const second = controller.scan();
  log.answer(1);
  await second;
  assert.deepEqual(log.results.map((r) => r.scanId), [log.scanId(1)], 'controller must remain usable after invalidate()');
  controller.destroy();
});

test('[4] a result whose scanId or pageKey does not belong to the requesting observation is rejected before rendering', async () => {
  for (const wrong of [{ scanId: 'some-older-scan' }, { pageKey: 'https://other-shop.example/checkout' }, { scanId: 'x', pageKey: 'y' }]) {
    const { controller, log } = harness();
    const p = controller.scan();
    log.answer(0, wrong);
    await p;
    assert.equal(log.results.length, 0, JSON.stringify(wrong));
    assert.equal(log.errors.length, 1, 'a mismatched answer must surface as an error, not vanish');
    controller.destroy();
  }
});

test('[7] invalidate() aborts in-flight work, suppresses late callbacks, and does not break a later manual scan', async () => {
  const { controller, log } = harness();
  const p = controller.scan();
  controller.invalidate();
  assert.equal(log.assessCalls[0].signal.aborted, true);
  log.answer(0);
  await p;
  assert.equal(log.results.length, 0);
  const again = controller.scan();
  log.answer(1);
  await again;
  assert.deepEqual(log.results.map((r) => r.scanId), [log.scanId(1)]);
  controller.destroy();
});

test('[7] destroy() aborts work, drops late results AND errors, and makes scan()/invalidate()/destroy() inert and safe', async () => {
  for (const outcome of ['result', 'error']) {
    const { controller, log } = harness();
    const p = controller.scan();
    controller.destroy();
    assert.equal(log.assessCalls[0].signal.aborted, true);
    if (outcome === 'result') log.answer(0); else log.assessCalls[0].reject(new Error('late'));
    await p;
    assert.equal(log.results.length + log.errors.length, 0, outcome);
    const checkingBefore = log.checking;
    await controller.scan();
    assert.equal(log.checking, checkingBefore, 'scan() after destroy must not start work');
    assert.equal(log.assessCalls.length, 1);
    assert.doesNotThrow(() => { controller.invalidate(); controller.destroy(); });
  }
});

/* ======================================================================= B. guardian lifecycle (content-entry.js) */

let runId = 0;
let env = null;

async function boot(url = 'https://shop.example/cart', html = '<main><h1>Plain Shoes</h1><a href="/contact">Contact</a></main>') {
  globalThis.__bpTest = { calls: [], uiLog: [], pending: [] };
  env = installPageEnvironment(url, html);
  const h = globalThis.__bpTest;
  /** Default: every evidence collection is held until the test releases it. */
  h.collectEvidence = (obs, opts, real) => new Promise((resolve, reject) => {
    const p = { obs, signal: opts.signal, done: false };
    p.release = () => { if (p.done) return; p.done = true; real(obs, opts).then(resolve, reject); };
    p.fail = (error) => { if (p.done) return; p.done = true; reject(error); };
    h.pending.push(p);
  });
  await import(`${srcUrl('src/runtime/content-entry.js')}?run=${++runId}`);
  return { env, h, g: globalThis.BeforePayGuardian };
}

afterEach(async () => {
  const h = globalThis.__bpTest;
  mock.timers.reset();
  if (h) for (const p of h.pending) p.release();
  await settle();
  env?.restore();
  env = null;
  delete globalThis.__bpTest;
});

const count = (h, ui, pred = () => true) => h.uiLog.filter((e) => e.ui === ui && pred(e)).length;
const checkingUpdates = (h) => count(h, 'panel.update', (e) => e.phase === 'checking');
const lastPipState = (h) => [...h.uiLog].reverse().find((e) => e.ui === 'pip.update')?.view.state;
const SHOP_CHECKOUT = 'https://shop.example/checkout';

test('[7] guardian mounts once per document and a second injection does not create a second root', async () => {
  const { env: e, g } = await boot();
  const first = g;
  await import(`${srcUrl('src/runtime/content-entry.js')}?run=${++runId}`);
  assert.equal(globalThis.BeforePayGuardian, first);
  assert.equal(e.document.documentElement.querySelectorAll('#beforepay-root').length, 1);
});

test('[7] entering checkout opens ONE popup/scan; repeated polls, events and mutations never loop it', async () => {
  const { env: e, h } = await boot();
  assert.equal(h.calls.length, 0, 'no scan on a non-checkout page');
  e.navigate(SHOP_CHECKOUT, 'popstate');
  assert.equal(h.calls.length, 1);
  for (let i = 0; i < 6; i++) { e.fire('beforepay:checkout-changed'); e.fire('hashchange'); e.fire('popstate'); e.tickIntervals(); }
  await settle();
  assert.equal(h.calls.length, 1, 'same checkout must not trigger another scan');
  assert.equal(checkingUpdates(h), 1);
  h.pending[0].release();
  await settle();
  for (let i = 0; i < 4; i++) { e.tickIntervals(); e.fire('beforepay:checkout-changed'); }
  await settle();
  assert.equal(h.calls.length, 1);
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 1);
});

test('[7] dismiss survives same-checkout mutations/polls; manual rescan reopens; a genuinely new checkout reopens', async () => {
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].release();
  await settle();
  assert.ok(g.getAssessment());

  h.panelOptions.onDismiss();
  const afterDismiss = h.uiLog.length;
  for (let i = 0; i < 5; i++) { e.tickIntervals(); e.fire('beforepay:checkout-changed'); e.fire('hashchange'); }
  await settle();
  assert.equal(h.calls.length, 1, 'dismissed checkout must not be re-scanned by mutations');
  assert.equal(h.uiLog.slice(afterDismiss).some((x) => x.ui === 'panel.setOpen' && x.open === true), false, 'dismissed panel must not reopen itself');
  assert.equal(h.uiLog.slice(afterDismiss).some((x) => x.ui === 'panel.update' && x.phase === 'checking'), false);

  h.panelOptions.onRescan();
  assert.equal(h.calls.length, 2, 'explicit manual rescan after dismiss must work');
  assert.equal(h.uiLog.slice(afterDismiss).some((x) => x.ui === 'panel.setOpen' && x.open === true), true);
  h.pending[1].release();
  await settle();
  assert.ok(g.getAssessment());

  h.panelOptions.onDismiss();
  e.navigate('https://shop.example/checkout/review', 'popstate');
  assert.equal(h.calls.length, 3, 'a different checkout page is a genuinely new checkout and may reopen');
});

test('[7] Pip dismiss: stays dismissed while polling, comes back for an explicit rescan', async () => {
  const { env: e, h } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].release();
  await settle();
  h.pipOptions.onDismiss();
  assert.equal(lastPipState(h), 'dismissed');
  for (let i = 0; i < 5; i++) { e.tickIntervals(); e.fire('beforepay:checkout-changed'); }
  await settle();
  assert.equal(lastPipState(h), 'dismissed');
  assert.equal(h.calls.length, 1);
  h.panelOptions.onRescan();
  assert.equal(h.calls.length, 2);
  assert.equal(lastPipState(h), 'checking', 'explicit rescan must bring Pip back');
});

test('[4][7] leaving checkout invalidates the old finding and aborts its scan', async () => {
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].release();
  await settle();
  assert.ok(g.getAssessment());
  e.navigate('https://shop.example/cart', 'popstate');
  assert.equal(g.getAssessment(), null, 'finding from the previous page must be dropped');
  assert.equal(lastPipState(h), 'idle');

  e.navigate(SHOP_CHECKOUT, 'popstate'); // new scan, hold it
  const inflight = h.pending[1];
  e.navigate('https://shop.example/cart', 'popstate');
  assert.equal(inflight.signal.aborted, true);
  inflight.release();
  await settle();
  assert.equal(g.getAssessment(), null, 'stale scan must not repopulate state on a non-checkout page');
});

test('[4] SPA #step1 -> #step2 -> #step1 mid-scan: only the newest page snapshot may populate state', async () => {
  for (const order of [[2, 1, 0], [0, 1, 2], [1, 0, 2], [1, 2, 0]]) {
    const { env: e, h, g } = await boot('https://shop.example/cart');
    e.navigate(`${SHOP_CHECKOUT}#step1`);
    e.navigate(`${SHOP_CHECKOUT}#step2`);
    e.navigate(`${SHOP_CHECKOUT}#step1`);
    assert.equal(h.pending.length, 3, 'each genuine route change starts its own scan');
    assert.deepEqual(h.pending.map((p) => p.signal.aborted), [true, true, false]);
    for (const i of order) { h.pending[i].release(); await settle(); }
    const finalAssessment = g.getAssessment();
    assert.ok(finalAssessment, `order ${order}`);
    assert.equal(finalAssessment.scanId, h.pending[2].obs.scanId, `order ${order}: newest snapshot must win`);
    assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 1, `order ${order}: stale results must not render`);
    e.restore(); delete globalThis.__bpTest;
  }
});

test('[4] rapid manual rescans: older answers never overwrite the newest assessment or the panel', async () => {
  const { env: e, h, g } = await boot(SHOP_CHECKOUT);
  assert.equal(h.pending.length, 1, 'booting on a checkout page scans once');
  h.panelOptions.onRescan(); h.panelOptions.onRescan(); h.panelOptions.onRescan();
  assert.equal(h.pending.length, 4);
  for (const i of [3, 0, 2, 1]) { h.pending[i].release(); await settle(); }
  assert.equal(g.getAssessment().scanId, h.pending[3].obs.scanId);
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 1);
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'error'), 0);
  assert.ok(e.activeIntervals() === 1);
});

test('[3] a provider failure is shown as an honest error (never a clean result) and can be retried', async () => {
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].fail(new Error('independent directory unavailable'));
  await settle();
  const a = g.getAssessment();
  assert.equal(a.verdict, 'error');
  assert.equal(a.identityStatus, 'unverified');
  assert.notEqual(a.verdict, 'no_flags');
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 0);
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'error'), 1);
  assert.equal(lastPipState(h), 'error');
  assert.ok(a.limitations.length > 0);

  h.panelOptions.onRescan();
  h.pending[1].release();
  await settle();
  assert.notEqual(g.getAssessment().verdict, 'error', 'a successful manual retry replaces the error');
});

test('[3] an evaluator that returns an incomplete / contract-invalid object is reported as an error, not rendered', async () => {
  const { env: e, h, g } = await boot();
  h.evaluate = () => ({ verdict: 'no_flags', identityStatus: 'verified' });
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].release();
  await settle();
  assert.equal(g.getAssessment().verdict, 'error');
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 0);
});

test('[3] an evaluator that throws is reported as an error', async () => {
  const { env: e, h, g } = await boot();
  h.evaluate = () => { throw new Error('rule crash'); };
  e.navigate(SHOP_CHECKOUT, 'popstate');
  h.pending[0].release();
  await settle();
  assert.equal(g.getAssessment().verdict, 'error');
  assert.equal(g.getAssessment().identityStatus, 'unverified');
});

test('[3] a hung provider times out as an error, aborts its signal, and a late "clean" answer is ignored', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  const hung = h.pending[0];
  mock.timers.tick(6001);
  await settle();
  assert.equal(hung.signal.aborted, true);
  assert.equal(g.getAssessment().verdict, 'error');
  assert.match(g.getAssessment().summary, /timed out|try again/i);
  hung.release();
  await settle();
  assert.equal(g.getAssessment().verdict, 'error', 'late provider data must not replace the timeout error');
  assert.equal(count(h, 'panel.update', (x) => x.phase === 'complete'), 0);
});

test(
  '[3] a provider that rejects with null/undefined is still surfaced as an error assessment without an unhandled rejection',
  async () => {
    const unhandled = [];
    const onUnhandled = (reason) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const { env: e, h, g } = await boot();
      e.navigate(SHOP_CHECKOUT, 'popstate');
      h.pending[0].fail(null);
      await settle();
      assert.deepEqual(unhandled, []);
      assert.equal(g.getAssessment()?.verdict, 'error');
    } finally { process.off('unhandledRejection', onUnhandled); }
  }
);

test('[7] destroy() mid-scan: aborts work, removes every listener/timer/observer/DOM node, and late answers touch nothing', async () => {
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  const inflight = h.pending[0];
  assert.equal(e.activeIntervals(), 1);
  assert.equal(e.activeObservers(), 1);
  assert.ok(e.windowListenerCount() >= 3);

  const mark = h.uiLog.length;
  g.destroy();
  assert.equal(inflight.signal.aborted, true);
  assert.equal(globalThis.BeforePayGuardian, undefined);
  assert.equal(e.activeIntervals(), 0, 'route polling interval leaked');
  assert.equal(e.activeObservers(), 0, 'MutationObserver leaked');
  assert.equal(e.windowListenerCount(), 0, 'window listeners leaked');
  assert.equal(e.document.documentElement.querySelectorAll('#beforepay-root').length, 0, 'host element left in the page');
  assert.ok(h.panelDestroyed && h.pipDestroyed);

  const afterDestroy = h.uiLog.length;
  inflight.release();
  for (let i = 0; i < 3; i++) { e.navigate(`${SHOP_CHECKOUT}#late${i}`); e.fire('beforepay:checkout-changed'); e.tickIntervals(); }
  await settle();
  assert.equal(h.uiLog.length, afterDestroy, 'no UI call may happen after destroy');
  assert.equal(h.calls.length, 1, 'no new scan may start after destroy');
  assert.ok(h.uiLog.slice(mark).every((x) => x.ui.endsWith('destroy')), 'only teardown calls during destroy');
});

test('[7] destroy() after a result, then re-injection, yields a fresh working guardian (no stale state carried over)', async () => {
  const { env: e, h, g } = await boot(SHOP_CHECKOUT);
  h.pending[0].release();
  await settle();
  assert.ok(g.getAssessment());
  g.destroy();
  assert.doesNotThrow(() => g.destroy(), 'destroy must be idempotent');
  await import(`${srcUrl('src/runtime/content-entry.js')}?run=${++runId}`);
  const fresh = globalThis.BeforePayGuardian;
  assert.ok(fresh && fresh !== g);
  assert.equal(fresh.getAssessment(), null, 'new guardian starts without the old assessment until its own scan completes');
  assert.equal(e.document.documentElement.querySelectorAll('#beforepay-root').length, 1);
  assert.equal(e.activeIntervals(), 1);
});

test('[7] manual scan API after navigation away still works and reports against the CURRENT page only', async () => {
  const { env: e, h, g } = await boot();
  e.navigate(SHOP_CHECKOUT, 'popstate');
  e.navigate('https://shop.example/cart', 'popstate');
  g.scan();
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].obs.pageKey, 'https://shop.example/cart');
  h.pending[0].release(); await settle();
  assert.equal(g.getAssessment(), null, 'the scan of the old page is stale');
  h.pending[1].release(); await settle();
  assert.equal(g.getAssessment().pageKey, 'https://shop.example/cart');
});

test('[1][3] end to end through content-entry: the local demo yields demo_match only, and a remote page copying its URL stays live/unverified', async () => {
  const demo = await boot('http://127.0.0.1:4173/demo/index.html?scenario=matching-shoes#checkout', '<main><h1>Solehouse</h1><a href="/contact">Contact</a><a href="/returns">Returns</a></main>');
  demo.h.pending[0].release();
  await settle();
  const a = demo.g.getAssessment();
  assert.equal(a.mode, 'demo', 'content-entry must hand the evidence layer what it needs to run the (gated) demo adapter');
  assert.equal(a.identityStatus, 'demo_match');
  assert.notEqual(a.identityStatus, 'verified');
  demo.env.restore();
  delete globalThis.__bpTest;

  const remote = await boot('https://evil.example/demo/index.html?scenario=matching-shoes#checkout', '<main><h1>Solehouse Official Verified Partner</h1><a href="/contact">Contact</a><a href="/returns">Returns</a></main>');
  const scan = remote.g.scan();
  await settle();
  remote.h.pending[0].release();
  await scan;
  await settle();
  const b = remote.g.getAssessment();
  assert.equal(b.mode, 'live');
  assert.equal(b.identityStatus, 'unverified');
  assert.notEqual(b.verdict, 'no_flags');
});
