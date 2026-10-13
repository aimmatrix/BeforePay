const EXT = 'fignfifoniblkonapihmkfakmlgkbkcf';
const CDP = 'http://127.0.0.1:9333';

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let next = 0;
    const pending = new Map();
    ws.addEventListener('error', reject);
    ws.addEventListener('open', () => {
      ws.addEventListener('message', (event) => {
        const msg = JSON.parse(String(event.data));
        if (msg.id && pending.has(msg.id)) {
          const { res, rej } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) rej(Object.assign(new Error(msg.error.message), msg.error));
          else res(msg.result);
        }
      });
      resolve({
        ws,
        send(method, params = {}) {
          const id = ++next;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          ws.close();
        }
      });
    });
  });
}

async function list() {
  return fetch(`${CDP}/json/list`).then((r) => r.json());
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.text || details.exception?.description || 'evaluate failed');
  }
  return result.result?.value;
}

const SNAP = `(() => {
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
    bannerText: (banner?.innerText || '').replace(/\\s+/g, ' ').trim(),
    scanHidden: Boolean(scan?.hidden),
    scanDisabled: Boolean(scan?.disabled),
    scanText: scan?.textContent || '',
    requestHidden: Boolean(request?.hidden),
    removeHidden: Boolean(remove?.hidden),
    systemChecked: Boolean(root.querySelector('input[value="system"]')?.checked),
    reducedChecked: Boolean(root.querySelector('input[value="reduced"]')?.checked)
  };
})()`;

const report = [];
function log(name, ok, detail) {
  report.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 280) : ''}`);
}

async function waitFor(predicate, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const value = await predicate();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

async function main() {
  const version = await fetch(`${CDP}/json/version`).then((r) => r.json());
  const browser = await connect(version.webSocketDebuggerUrl);

  await browser.send('Target.createTarget', {
    url: `chrome-extension://${EXT}/popup.html`,
    newWindow: true,
    width: 400,
    height: 640
  });

  const popupTarget = await waitFor(async () => {
    const pages = await list();
    return pages.find((p) => p.url.includes(`${EXT}/popup.html`));
  });
  log('popup.html opened in Chrome', Boolean(popupTarget), popupTarget?.url);
  if (!popupTarget) throw new Error('popup.html target missing');

  const popup = await connect(popupTarget.webSocketDebuggerUrl);
  await popup.send('Runtime.enable');
  await new Promise((r) => setTimeout(r, 500));
  let snap = await evaluate(popup, SNAP);
  log('C3 mountPopup mounted', !snap.missing, snap.missing ? snap.text : `${snap.origin} / ${snap.chip}`);

  const unsupported =
    snap.scanHidden === true && (snap.bannerKind === 'unsupported' || /cannot be inspected/i.test(snap.bannerText));
  log('unsupported extension-page context hides scan', unsupported, JSON.stringify(snap));

  await evaluate(popup, `document.querySelector('input[value="reduced"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  snap = await evaluate(popup, SNAP);
  log(
    'Reduce motion control is reachable',
    snap.reducedChecked === true || snap.systemChecked === true,
    JSON.stringify({ motion: snap.motion, reduced: snap.reducedChecked, system: snap.systemChecked })
  );

  // Open a second popup after focusing the demo tab by activating it.
  const pages = await list();
  const demo = pages.find((p) => p.url.includes('127.0.0.1:4173'));
  log('demo tab still open', Boolean(demo), demo?.url);
  if (demo) {
    const demoClient = await connect(demo.webSocketDebuggerUrl);
    await demoClient.send('Page.bringToFront');
    demoClient.close();
  }

  const swPages = await list();
  const sw = swPages.find((p) => p.type === 'service_worker' && p.url.includes(EXT));
  if (sw) {
    const worker = await connect(sw.webSocketDebuggerUrl);
    await worker.send('Runtime.enable');
    try {
      await evaluate(worker, 'chrome.action.openPopup()');
      log('openPopup from service worker', true, '');
    } catch (error) {
      log('openPopup from service worker', false, error.message);
    }
    try {
      const stored = await evaluate(worker, `(async()=>(await chrome.storage.local.get('motion')).motion)()`);
      log('motion preference readable from storage', stored === 'reduced' || stored === 'system' || stored == null, String(stored));
    } catch (error) {
      log('motion preference readable from storage', false, error.message);
    }
    worker.close();
  } else {
    log('service worker visible after popup', false, 'idle/not listed — popup page still exercised');
  }

  await new Promise((r) => setTimeout(r, 500));
  const after = await list();
  const toolbarPopup = after.find(
    (p) => p.url.includes(`${EXT}/popup.html`) && p !== popupTarget && p.id !== popupTarget.id
  );
  if (toolbarPopup) {
    const real = await connect(toolbarPopup.webSocketDebuggerUrl);
    await real.send('Runtime.enable');
    await new Promise((r) => setTimeout(r, 400));
    const live = await evaluate(real, SNAP);
    log(
      'toolbar/live popup origin',
      Boolean(live.origin),
      JSON.stringify({ origin: live.origin, scanHidden: live.scanHidden, chipOn: live.chipOn })
    );
    if (!live.scanHidden) {
      await evaluate(real, `document.querySelector('[data-action="SCAN_ACTIVE_TAB"]').click()`);
      await new Promise((r) => setTimeout(r, 1200));
      const scanned = await evaluate(real, SNAP);
      log(
        'Check this store on live popup',
        scanned.bannerKind === 'info' || scanned.bannerKind === 'error' || /Pip opened|could not|Checking/i.test(scanned.bannerText + scanned.scanText),
        JSON.stringify({ kind: scanned.bannerKind, text: scanned.bannerText })
      );
      if (!scanned.requestHidden) {
        await evaluate(real, `document.querySelector('[data-action="REQUEST_SITE_ACCESS"]').click()`);
        await new Promise((r) => setTimeout(r, 1000));
        const perm = await evaluate(real, SNAP);
        log(
          'permission grant or visible denial',
          perm.chipOn === 'true' || /declined|not granted|could not|permission|Open a regular/i.test(perm.bannerText),
          JSON.stringify({ chipOn: perm.chipOn, kind: perm.bannerKind, text: perm.bannerText, removeHidden: perm.removeHidden })
        );
        if (perm.chipOn === 'true' && !perm.removeHidden) {
          await evaluate(real, `document.querySelector('[data-action="REMOVE_SITE_ACCESS"]').click()`);
          await new Promise((r) => setTimeout(r, 700));
          const removed = await evaluate(real, SNAP);
          log('Stop automatic checks', removed.chipOn === 'false', JSON.stringify(removed));
        }
      }
    }
    real.close();
  }

  popup.close();
  browser.close();
  const failed = report.filter((row) => !row.ok);
  console.log(JSON.stringify({ failed: failed.length, report }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
