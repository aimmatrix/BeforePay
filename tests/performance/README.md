# S4 performance harness

Owned by S4. Official measurement waits for CORE’s **frozen SHA** after RISK lands. Do not treat preview numbers as extension results.

## Surfaces

| Surface | Path | Results |
| --- | --- | --- |
| Unpacked extension (**official**) | `/Users/ammad/Documents/FinTech/dist/extension` | `results/extension/` |
| Web preview (informational) | `http://127.0.0.1:4174/dist/preview.html` | `results/preview/` only |

Copy `dist/build-report.json` into `results/extension/build-report.json` next to the frozen SHA so `evaluate` / `collectEvidence` / `mountPip` / `mountPanel` / `mountPopup` are identifiable.

## What this folder measures

1. **Scan-await:** `await BeforePayGuardian.scan()` through DOM update (`update()` returned). Not first paint.
2. **Render after scan:** double-rAF (or a cited paint entry), reported in a separate table.
3. Duplicate mounts (`#beforepay-root`).
4. Observer churn and cleanup after dismiss / navigation / `destroy()`.
5. Unexpected network (extension HAR vs preview HAR).
6. Unnecessary npm or remote-asset dependencies.

No invented pass thresholds. Contract violations go to owners, citing the build-report file.

## Commands after freeze

```sh
cp dist/build-report.json tests/performance/results/extension/build-report.json
node tests/performance/inventory.mjs --json > tests/performance/results/extension/inventory.json
```

Load unpacked `dist/extension` (preview shim off). In the **content-script** context:

```js
document.querySelectorAll('#beforepay-root').length
```

Paste `probes/scan-timing.js`, then:

```js
await __S4_TIME__.runN(5, 'suspicious')
```

That prints `scanAwaitMs` and `renderAfterScanMs` separately.

Optional mount/observer probe: `probes/devtools-probe.js` (page + content-script). Wrapping after load misses already-created observers.

## Not in this folder

Product mounts, bundling, and `package.json` scripts stay with CORE. S4 does not add Playwright or other measurement dependencies unless CORE adds them.
