/**
 * Paste into the BeforePay *content-script* context on the demo, with the
 * unpacked extension loaded from dist/extension.
 *
 * await BeforePayGuardian.scan() ends after panel.update + pip.update return.
 * That is a DOM update, not first paint. Render is the following double-rAF.
 *
 *   const row = await __S4_TIME__.run('suspicious-await')
 *   await __S4_TIME__.runN(5, 'suspicious-await')
 */
(function installBeforePayS4ScanTiming() {
  async function nextPaint() {
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  async function run(label = 'scan') {
    if (!globalThis.BeforePayGuardian?.scan) {
      throw new Error('BeforePayGuardian.scan is missing. Use the content-script context on a page with the unpacked extension.');
    }
    const t0 = performance.now();
    await BeforePayGuardian.scan();
    const afterDomUpdate = performance.now();
    await nextPaint();
    const afterRender = performance.now();
    const row = {
      label,
      href: location.href,
      scanId: BeforePayGuardian.getAssessment?.()?.scanId ?? null,
      scanAwaitMs: Math.round((afterDomUpdate - t0) * 100) / 100,
      renderAfterScanMs: Math.round((afterRender - afterDomUpdate) * 100) / 100,
      notes: {
        scanAwait: 'await scan() through DOM update (update() returned); not first paint',
        renderAfterScan: 'double requestAnimationFrame after scan settled'
      }
    };
    console.log('[S4 timing]', row);
    return row;
  }

  async function runN(n, label) {
    const rows = [];
    for (let i = 0; i < n; i += 1) rows.push(await run(`${label}#${i + 1}`));
    const pick = (key) => {
      const xs = rows.map((r) => r[key]).sort((a, b) => a - b);
      const mid = xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
      return { min: xs[0], median: mid, max: xs[xs.length - 1], n: xs.length };
    };
    const summary = { label, scanAwaitMs: pick('scanAwaitMs'), renderAfterScanMs: pick('renderAfterScanMs'), rows };
    console.log('[S4 timing summary]', summary);
    return summary;
  }

  globalThis.__S4_TIME__ = { run, runN };
  console.log('[S4 timing] ready — await __S4_TIME__.runN(5, "suspicious")');
})();
