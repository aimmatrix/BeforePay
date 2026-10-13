# BeforePay limitations

BeforePay is a hackathon prototype and a second opinion, not a guarantee of identity, authenticity, delivery, refunds or value.

The Chrome MV3 extension, deterministic evaluator, animated Pip, evidence panel and popup are implemented. The final bundle uses the actual risk/evidence and all three UI modules. Installed extension checks and preview checks are separate.

Solehouse, products, prices, `.example` addresses, directory and simulated checkout are fictional. Synthetic evidence runs only on http://127.0.0.1:4173 or http://localhost:4173 at /demo/index.html or /. It is visibly labelled and matching records produce demo_match, never verified. Port 4174 is outside this evidence allowlist.

No remote identity, reputation, reviews, domain-age or company-record provider is connected. Real stores remain unverified. Missing independent identity keeps the result uncertain unless completed findings justify warning. Missing contact or returns information is missing evidence, not proof of wrongdoing. HTTPS and on-page badges/reviews cannot verify a seller. No fraud percentage is calculated.

Extraction is bounded to visible merchant text and links, excludes hidden/private roots and descendants, form values and extension UI, and blocks supported mailbox/account hostnames including trailing-dot variants. It is a heuristic, not comprehensive private-app detection. Checkout and payment patterns are English-oriented. Cross-origin frames are not scanned. Navigation and scenario changes invalidate previous findings; superseded scans are cancelled.

The extension never clicks or submits payments. Solehouse's Simulate purchase button reports that no payment was made. unknown-shoes is evaluator-only; the storefront renders the suspicious and matching samples.

Installed checks used isolated Chrome for Testing, including narrow-screen/reduced-motion, focus, keyboard, dismiss/rescan and stale-result behavior. Popup-document tests adapt active-tab selection in headless Chromium; physical toolbar UI and real optional permission prompts remain manual recording checks. Local demo hosts have required built-in access, which Chrome cannot remove; the popup displays that removal error. Automatic access on other sites requires an explicit optional grant.

No publication, submission, Chrome Web Store deployment or real payment integration was performed.
