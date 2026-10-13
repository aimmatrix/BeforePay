# Final verification — 13 October 2026

The complete suite now runs current source and installed-extension lifecycle tests: 349 passed, 0 failed, 0 skipped, 0 todo. Previous 306/23/7 and provisional-module reports are superseded.

Resolved S2 requirements:

- Synthetic evidence is discarded on non-allowlisted observations; live pages cannot produce demo_match.
- Null/undefined rejections render an error safely.
- Mailbox exclusion normalises trailing-dot hosts.
- Text and link extraction excludes hidden descendants, personal roots/ancestors and extension UI.
- Validate dist/extension/content.js; absence of generated extension/content.js in the source folder is intentional.
- Copy follows contract v1: unverified live sites, sample-only match, missing checks visible, no certification or guarantees.
- Credential-bearing links are excluded. The userinfo test retains suffix-host and protocol-relative coverage without requiring such a link in observations.
- Pure synthetic evaluator vectors use an explicitly permitted local observation in their evaluation adapter; fixture JSON keeps reserved example hosts and independent expected outcomes.
- Installed tests are active rather than recorded as skipped. Their content-script assessment queries use its actual execution world; data-beforepay-preview=false is correctly treated as installed mode.

Installed desktop/mobile/live-page/action scripts and separate preview checks passed. The action harness loads the installed popup document and supplies its active tab lookup because headless toolbar popup targets are not exposed. Real messaging, scan, storage and visible permission-error handling were exercised. Optional remote permission prompt and physical toolbar presentation are manual checks, not claimed as automated passes.

Required localhost permissions are part of the demo manifest and cannot be removed via chrome.permissions.remove; the popup shows the rejection. No external providers were added. Full evidence and final demo commands are in README.md and planning/INTEGRATION_STATUS.md.
