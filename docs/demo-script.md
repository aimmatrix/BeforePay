# BeforePay — 90-second recording script

## What to show and say

| Time | Show / action | Say |
| --- | --- | --- |
| 0:00–0:15 | Start on the suspicious product page. Point at £14, 90% off and bank transfer only. | “This is BeforePay: a second opinion before you pay. An unfamiliar shop can look convincing, even when the offer and payment request deserve a closer look.” |
| 0:15–0:40 | Click **Continue to checkout**. Pause for Pip and **Pause before you pay**. Point to the identity mismatch, discount and payment findings. | “When I reach checkout, Pip brings the warning signs into view and explains the evidence. Here, the address does not match our fictional sample record, the discount is unusually large, and the shop asks for bank transfer. These are reasons to pause, not proof of fraud.” |
| 0:40–1:05 | Click **Matching demo store**, then **Continue to checkout**. Show **Sample match** and **Demo sample match**. | “Now I switch to the matching example. The sample record matches, and the completed checks show no warning signs. The result is clearly labelled as sample data; it does not guarantee authenticity or delivery.” |
| 1:05–1:20 | Dismiss the panel. Click **Simulate purchase** and show the confirmation. | “The shopper stays in control. BeforePay never clicks the payment button. This checkout is a simulation: no payment was made.” |
| 1:20–1:30 | Finish with Pip visible. Optionally show the pinned extension popup if rehearsed. | “The extension, rules and evidence panel work locally. The shop and identity directory are fictional. Live merchant verification is future work. BeforePay helps you pause and make a more informed decision.” |

## Quick setup

- Use Chrome with the extension loaded and pinned, a desktop window, and notifications silenced.
- For the frozen recording package, load `/Users/ammad/Documents/FinTech/release/ac4c1e3/extension` if available. Otherwise use the existing `/Users/ammad/Documents/FinTech/dist/extension` build. New clones can generate a loadable package with `npm install` and `npm run build`.
- Open [the suspicious product page](http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes) with no `#checkout` at the end. Keep **Fictional stores. No real payments.** visible.
- Rehearse the two scenario switches once. Wait for each result before speaking about it. Keep the final recording focused on the browser; code and test output are optional supporting material.
- If Pip's panel is closed, click Pip to open it. If the extension does not appear, check that it is enabled, reload the page, and use the popup's scan action. Use the separately labelled preview only if you choose to record the preview.

## Existing verification notes

Before recording, confirm one Pip, panel Dismiss and Rescan, Escape returning focus to Pip, and the simulated payment button remaining accessible. Hide Pip returns focus to a visible page control; manual popup scanning brings it back.

The installed extension checks passed on desktop and narrow screens; the no-install preview was checked separately at http://127.0.0.1:4173/dist/preview.html. If recording the preview, identify it as a preview. Do not combine preview injection with the installed extension.

Do not use unknown-shoes in the storefront: it is a fixture-only evaluator scenario. Do not describe a sample match as verified or promise purchase safety. Narrate the working screen if wording changes. Existing slides in presentation/ state the same sample-data boundary.
