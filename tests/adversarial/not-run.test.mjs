/** Actual unpacked-extension checks. Preview is never injected into this context. */
import {before, after, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require('/Users/ammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const cached = '/private/tmp/beforepay-browsers/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
let context, worker, page, cdp, world;
const worlds = new Map();
const demo = 'http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes#checkout';
async function isolated(action) {
  const func = async action => {
    if(action === 'scanId') return globalThis.BeforePayGuardian.getAssessment()?.scanId;
    if(action === 'identity') return globalThis.BeforePayGuardian.getAssessment()?.identityStatus;
    if(action === 'assessment') return globalThis.BeforePayGuardian.getAssessment();
    const scans = action === 'concurrent' ? [BeforePayGuardian.scan(),BeforePayGuardian.scan(),BeforePayGuardian.scan()] : [BeforePayGuardian.scan()];
    document.body.dataset.checkout='false';history.pushState(null,'','/demo/index.html?scenario=suspicious-shoes');
    window.dispatchEvent(new PopStateEvent('popstate'));await Promise.all(scans);
    return BeforePayGuardian.getAssessment();
  };
  const result = await cdp.send('Runtime.evaluate', {contextId:world, expression:`(${func})(${JSON.stringify(action)})`, awaitPromise:true, returnByValue:true});
  assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

before(async () => {
  const extension = path.resolve('dist/extension');
  context = await chromium.launchPersistentContext('/tmp/beforepay-adversarial-'+Date.now(), {
    channel:'chromium', headless:true, ...(existsSync(cached)?{executablePath:cached}:{}),
    args:[`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport:{width:1440,height:980}
  });
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  page = await context.newPage();
  cdp = await context.newCDPSession(page);
  cdp.on('Runtime.executionContextCreated', ({context}) => worlds.set(context.id,context));
  cdp.on('Runtime.executionContextsCleared', () => worlds.clear());
  await cdp.send('Runtime.enable');
});
after(async () => {await context?.close();});
beforeEach(async () => {
  await page.goto(demo);
  await page.locator('#beforepay-root .bp-panel[data-view="warning"]').waitFor();
  assert.equal(await page.locator('#beforepay-root[data-beforepay-preview="true"]').count(),0);
  world = null;
  for(const ctx of worlds.values()) {
    const r = await cdp.send('Runtime.evaluate',{contextId:ctx.id,expression:'Boolean(globalThis.BeforePayGuardian)',returnByValue:true});
    if(r.result.value) {world=ctx.id;break;}
  }
  assert.ok(world,'actual installed content-script context exists');
});
test('ADV-PIP-003 duplicate checkout hints do not remount or rescan Pip', async () => {
  const id = await isolated('scanId');
  await page.evaluate(() => {for(let i=0;i<10;i++)window.dispatchEvent(new Event('beforepay:checkout-changed'));});
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#beforepay-root').count(),1);
  assert.equal(await isolated('scanId'),id);
});
test('ADV-PIP-004 checkout marker flicker does not loop panels', async () => {
  const id = await isolated('scanId');
  await page.evaluate(() => {for(let i=0;i<10;i++){document.body.dataset.checkout='false';document.body.dataset.checkout='true';}});
  await page.waitForTimeout(300);
  assert.equal(await isolated('scanId'),id);
});
test('ADV-PIP-005 extra frames do not mount a second Pip', async () => {
  await page.evaluate(() => {const f=document.createElement('iframe');f.src='/demo/index.html?scenario=matching-shoes#checkout';document.body.append(f);});
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#beforepay-root').count(),1);
  assert.equal(await page.frames()[1].locator('#beforepay-root').count(),0);
});
test('ADV-LIFE-004 new checkout key reopens after dismiss', async () => {
  const previous = await isolated('scanId');
  await page.locator('#beforepay-root').getByRole('button',{name:'Dismiss',exact:true}).click();
  await page.evaluate(() => {history.pushState(null,'','/demo/index.html?scenario=suspicious-shoes&step=review#checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.locator('#beforepay-root .bp-panel[data-view="warning"]').waitFor();
  assert.notEqual(await isolated('scanId'),previous);
  assert.equal(await isolated('identity'),'mismatch');
});
test('ADV-LIFE-005 leaving checkout invalidates displayed findings', async () => {
  await page.evaluate(() => {document.body.dataset.checkout='false';history.pushState(null,'','/demo/index.html?scenario=suspicious-shoes');window.dispatchEvent(new PopStateEvent('popstate'));});
  assert.equal(await isolated('assessment'),null);
  assert.equal(await page.locator('#beforepay-root .bp-panel').isVisible(),false);
});
test('ADV-LIFE-006 navigation while checking cancels pending UI', async () => {
  const result = await isolated('navigationScan');
  assert.equal(result,null);
});
test('ADV-LIFE-008 guardian leaves desktop payment control clickable', async () => {
  await page.locator('#simulate').click({trial:true});
});
test('ADV-PROV-005 concurrent scans cannot commit after navigation', async () => {
  const result = await isolated('concurrent');
  assert.equal(result,null);
});
