# Runtime scenarios (unpacked extension, after frozen SHA)

Official surface: load `/Users/ammad/Documents/FinTech/dist/extension`, preview shim **off**. Demo: `http://127.0.0.1:4173/demo/index.html`. Record Chrome version, extension ID, frozen SHA, and `dist/build-report.json` first.

Preview (`/dist/preview.html`) is a separate pass. Save only under `results/preview/`. Do not mix into extension tables. Preview is not evidence the extension works.

Primary checks: **content-script** context.

```js
document.querySelectorAll('#beforepay-root').length
BeforePayGuardian?.getAssessment?.()
```

Timing: paste `probes/scan-timing.js`. `await scan()` is DOM update, not first paint. Five runs, min/median/max. No invented pass budget.

## A. Automatic demo checkout (extension)

1. `http://127.0.0.1:4174/demo/index.html?scenario=suspicious-shoes`
2. Product view: **one** `#beforepay-root`, no auto-scan.
3. Continue to checkout. Still one root; one `scanId`.
4. 10s idle: `scanId` must not keep changing.

## A2. Scan-await vs render

On checkout, content-script context:

```js
await __S4_TIME__.runN(5, 'suspicious')
```

Record `scanAwaitMs` and `renderAfterScanMs` in **separate** tables. Repeat for `matching-shoes` and one rescan set.

## B. Duplicate-mount pressure

1. Checkout → product → checkout three times.
2. Switch suspicious → matching on checkout.
3. Rescan twice quickly.
4. Fire `beforepay:checkout-changed` plus a real hash change.
5. Host count stays 1.

## C. Observer ignore-self and debounce

1. Note `scanId`. Mutate announcement text 10 times quickly.
2. Expect 0–1 new scans after ~180ms, not 10.
3. Mutate `#beforepay-root` attributes. Expect no scan.
4. Dismiss, mutate the page again. Expect no scan on the same checkout key.

## D. Dismiss, navigate, destroy

1. Dismiss. Root may remain. No remount loop.
2. Clear `#checkout`. Stale assessment must not show. Root stays 1.
3. Return to checkout. One new scan.
4. `BeforePayGuardian.destroy()`. Root count 0. Guardian undefined.
5. Reload. One new root, not two.

## E. Reduced motion

1. DevTools Rendering → `prefers-reduced-motion: reduce`.
2. Open checkout. Attribute animation cost to the `mountPip` file in the build report.

## F. Network (extension HAR)

1. Network: All, disable cache, preserve log.
2. Product → checkout → open panel → rescan → dismiss.
3. Save HAR to `tests/performance/results/extension/demo.har`.
4. Repeat popup “Check this store” on the demo origin.
5. Unexpected: any host outside `allowlist.json`.

## G. Popup / manual scan

Skip if CORE has not shipped manual scan on a real `https` page. Record not-tested. If present, a popup scan must not add a second `#beforepay-root`.

## P. Preview-only (optional, after freeze)

Same A–F on `http://127.0.0.1:4174/dist/preview.html`. Write exclusively to `tests/performance/results/preview/` and the preview tables in `planning/reports/S4.md`.
