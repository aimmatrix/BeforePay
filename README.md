# BeforePay — Pip, your checkout guardian

BeforePay is a local Chrome MV3 hackathon prototype that gives a second opinion before checkout. Animated Pip shows warning signs and opens an evidence panel. Solehouse, its products, identity directory and payment are fictional. Real websites remain unverified. No remote identity or reputation providers are connected, and no real payments occur.

## Run and load

```sh
npm install
npm run build
npm start
npm test
npm run package
```

The existing server at **http://127.0.0.1:4173** serves the current build. If it is already running, reuse it. Port 4174 also serves these files, but synthetic evidence is allowed only on port 4173.

Chrome → `chrome://extensions` → Developer mode → Load unpacked → **`/Users/ammad/Documents/FinTech/dist/extension`**. Reload the extension and refresh the demo after rebuilding. `extension/` contains source; `dist/extension/` is the complete loadable package.

Start recording at [the suspicious product page](http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes). Click **Continue to checkout**. Expect **Pause before you pay**, warning evidence, and animated Pip. Switch to **Matching demo store**, then checkout: **Sample record matched, no warning signs**, labelled **Sample match**, **Demo sample match**, and **Sample demonstration. Not a real store check.**

The installed extension was verified in isolated Chrome for Testing on desktop and at 390×844 with reduced motion. Preview checks were run separately at [the no-install preview](http://127.0.0.1:4173/dist/preview.html). Do not inject preview.js into a tab with the extension installed.

## Build and checks

The build explicitly selects `src/risk/index.js` for collectEvidence/evaluate, `src/pip/index.js`, `src/panel/index.js` and `src/popup/index.js`. Missing exports fail the build. `dist/build-report.json` records selections and source hashes.

`npm test` discovers all test.js/mjs/cjs files. Final suite: **349 passed, 0 failed, 0 skipped, 0 todo**. The adversarial runner (`node tests/adversarial/run.mjs`) passed **214/214**, also with zero skips/todos. Installed lifecycle coverage includes duplicate hints, iframe exclusion, scenario/navigation invalidation, cancellation and payment access. Separate browser checks:

```sh
node scripts/extension-smoke.cjs
node scripts/mobile-smoke.cjs
node scripts/extension-live-check.cjs
node scripts/extension-actions-check.cjs
node scripts/browser-smoke.cjs
```

These scripts use the workspace Playwright runtime. `BEFOREPAY_CHROME` can select a Chrome for Testing executable; the supplied helper also finds this machine's cached browser. Popup-document automation adapts the active-tab lookup because headless toolbar popup targets are unavailable; the extension's messaging and storage remain real. A physical toolbar permission prompt has not been verified.

`npm run package` writes the complete loadable extension to `artifacts/BeforePay-extension.zip`. Generated dist and artifacts are excluded from source control.

## Boundaries

Observation excludes form values, hidden descendants, personal-content roots and extension UI. Mailbox/account pages, including trailing-dot hostnames, are excluded. Page claims cannot establish identity. Synthetic evidence is gated to exact local demo origins and paths, labelled, and yields only `demo_match`. Missing identity means uncertain unless completed observations justify warning. HTTPS is a connection property, not seller verification.

Manual popup scanning uses activeTab. Optional site access enables automatic checks on a granted origin. Localhost has built-in demo access; Chrome does not permit removal of that required permission. Removal errors remain visible. The extension never clicks payment controls. The demo button only reports **Simulation complete. No payment was made.**

See [demo narration](docs/demo-script.md), [limitations](docs/limitations.md), and [final integration status](planning/INTEGRATION_STATUS.md). Existing opening/closing slides remain in `presentation/`.
