# BeforePay — 90-second recording script

Use the installed extension from `/Users/ammad/Documents/FinTech/dist/extension`, reload its card after `npm run build`, and open http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes. Keep the fictional-store banner visible. Use a desktop viewport; narrow screens start with compact Pip and a closed panel.

1. **0:00–0:12:** Show the £14 shoes, 90% off, bank transfer only. “You find trainers on an unfamiliar shop. The page looks finished, but there are details worth checking.”
2. **0:12–0:40:** Click Continue to checkout. “At checkout, Pip shows a warning and the evidence behind it.” Read the identity mismatch, unusual discount and bank-transfer findings. “The directory and store are fictional. These are reasons to pause, not proof of fraud.” Point at the sample disclosure and not-checked sources.
3. **0:40–1:10:** Switch to Matching demo store and continue to checkout. Show Sample match / Demo sample match / Sample record matched, no warning signs. “This is a match against a made-up sample record. It does not promise authenticity or delivery.”
4. **1:10–1:30:** Show Pip and the popup. “The extension, rules and overlay are real. The shop, identity records and payment are simulated. On live websites identity stays unverified. BeforePay is a second opinion, not a guarantee.”

Before recording, confirm one Pip, panel Dismiss and Rescan, Escape returning focus to Pip, and the simulated payment button remaining accessible. Hide Pip returns focus to a visible page control; manual popup scanning brings it back.

The installed extension checks passed on desktop and narrow screens; the no-install preview was checked separately at http://127.0.0.1:4173/dist/preview.html. If recording the preview, identify it as a preview. Do not combine preview injection with the installed extension.

Do not use unknown-shoes in the storefront: it is a fixture-only evaluator scenario. Do not describe a sample match as verified or promise purchase safety. Narrate the working screen if wording changes. Existing slides in presentation/ state the same sample-data boundary.
