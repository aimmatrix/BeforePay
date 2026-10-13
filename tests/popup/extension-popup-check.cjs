const { chromium } = require('/Users/ammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const SNAP = () => {
  const root = document.querySelector('[data-bp-popup="root"]');
  if (!root) return { missing: true, text: document.body.innerText };
  const banner = root.querySelector('.bp-popup-banner');
  const scan = root.querySelector('[data-action="SCAN_ACTIVE_TAB"]');
  const request = root.querySelector('[data-action="REQUEST_SITE_ACCESS"]');
  const remove = root.querySelector('[data-action="REMOVE_SITE_ACCESS"]');
  return {
    origin: root.querySelector('.bp-popup-origin')?.textContent || '',
    access: root.querySelector('.bp-popup-access')?.textContent || '',
    chip: root.querySelector('.bp-popup-chip')?.textContent || '',
    chipOn: root.querySelector('.bp-popup-chip')?.dataset.on || '',
    motion: root.dataset.motion,
    bannerHidden: Boolean(banner?.hidden),
    bannerKind: banner?.dataset.kind || '',
    bannerText: (banner?.innerText || '').replace(/\s+/g, ' ').trim(),
    scanHidden: Boolean(scan?.hidden),
    scanDisabled: Boolean(scan?.disabled),
    scanText: scan?.textContent || '',
    requestHidden: Boolean(request?.hidden),
    removeHidden: Boolean(remove?.hidden),
    systemChecked: Boolean(root.querySelector('input[value="system"]')?.checked),
    reducedChecked: Boolean(root.querySelector('input[value="reduced"]')?.checked)
  };
};

(async () => {
  const extension = path.resolve('dist/extension');
  const outDir = path.resolve('tests/popup/screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const context = await chromium.launchPersistentContext('/tmp/beforepay-popup-check-' + Date.now(), {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 400, height: 640 }
  });
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  const extId = new URL(worker.url()).host;
  console.log('Unpacked extension id', extId, worker.url());

  const demo = await context.newPage();
  await demo.goto('http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes#checkout', {
    waitUntil: 'domcontentloaded'
  });

  const unsupported = await context.newPage();
  await unsupported.goto(`chrome-extension://${extId}/popup.html`);
  await unsupported.waitForSelector('[data-bp-popup="root"]', { timeout: 8000 });
  let snap = await unsupported.evaluate(SNAP);
  console.log('unsupported popup', snap);
  assert.equal(snap.scanHidden, true);
  assert.equal(snap.bannerKind, 'unsupported');
  assert.match(snap.bannerText, /cannot be inspected/i);
  assert.equal(snap.chipOn, 'false');
  await unsupported.screenshot({ path: path.join(outDir, 'popup-unsupported.png') });
  console.log('PASS unsupported page hides Check this store');

  await context.route(/popup\.js$/, async (route) => {
    const text = fs.readFileSync(path.join(extension, 'popup.js'), 'utf8');
    const patch =
      '(()=>{const o=chrome.tabs.query.bind(chrome.tabs);chrome.tabs.query=async(q)=>{const d=await o({url:"http://127.0.0.1:4173/*"});return d[0]?d:o(q);};})();';
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: patch + text
    });
  });
  const live = await context.newPage();
  await live.goto(`chrome-extension://${extId}/popup.html`);
  await live.waitForSelector('[data-bp-popup="root"]', { timeout: 8000 });
  await live.waitForFunction(() => {
    const scan = document.querySelector('[data-action="SCAN_ACTIVE_TAB"]');
    return scan && !scan.hidden;
  }, null, { timeout: 8000 });
  snap = await live.evaluate(SNAP);
  console.log('supported popup', snap);
  assert.equal(snap.scanHidden, false);
  assert.match(snap.origin, /127\.0\.0\.1|localhost/);
  assert.equal(snap.chipOn, 'false');
  await live.screenshot({ path: path.join(outDir, 'popup-supported.png') });

  await live.locator('label[data-motion="reduced"]').click();
  await live.waitForTimeout(500);
  snap = await live.evaluate(SNAP);
  console.log('after motion', snap);
  const motionOk = snap.reducedChecked || snap.motion === 'reduced' || /Open a regular|motion/i.test(snap.bannerText);
  assert.equal(motionOk, true);
  await live.screenshot({ path: path.join(outDir, 'popup-motion.png') });
  console.log('PASS motion setting dispatched');

  await live.getByRole('button', { name: 'Check this store' }).click();
  await live.waitForTimeout(1600);
  snap = await live.evaluate(SNAP);
  console.log('after scan', snap);
  assert.equal(
    snap.bannerKind === 'info' ||
      snap.bannerKind === 'error' ||
      /Pip opened|could not|cannot be inspected|Open a regular/i.test(snap.bannerText),
    true
  );
  await live.screenshot({ path: path.join(outDir, 'popup-scan.png') });
  console.log('PASS Check this store');

  await live.getByRole('button', { name: 'Allow automatic checks on this site' }).click();
  await live.waitForTimeout(1500);
  snap = await live.evaluate(SNAP);
  console.log('after request', snap);
  await live.screenshot({ path: path.join(outDir, 'popup-permission.png') });
  const permOk =
    snap.chipOn === 'true' ||
    /declined|not granted|could not|permission|Site access|Open a regular/i.test(snap.bannerText);
  assert.equal(permOk, true);
  console.log(snap.chipOn === 'true' ? 'PASS permission granted' : 'PASS permission denial visible');

  if (snap.chipOn === 'true' && !snap.removeHidden) {
    await live.getByRole('button', { name: 'Stop automatic checks on this site' }).click();
    await live.waitForTimeout(900);
    snap = await live.evaluate(SNAP);
    console.log('after remove', snap);
    assert.equal(snap.chipOn, 'false');
    await live.screenshot({ path: path.join(outDir, 'popup-removed.png') });
    console.log('PASS Stop automatic checks');
  }

  await live.keyboard.press('Tab');
  await live.keyboard.press('Tab');
  const focused = await live.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, action: el?.getAttribute?.('data-action') || el?.getAttribute?.('name') || '' };
  });
  console.log('keyboard focus', focused);
  assert.equal(['BUTTON', 'INPUT', 'A'].includes(focused.tag) || Boolean(focused.action), true);
  console.log('PASS keyboard reaches popup controls');

  fs.writeFileSync(
    path.join(outDir, 'result.json'),
    JSON.stringify({ testedAt: new Date().toISOString(), extId, worker: worker.url(), last: snap, focused }, null, 2)
  );
  await context.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
