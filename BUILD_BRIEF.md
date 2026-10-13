> **Superseded:** The user changed the scope to a shoe-store checkout guardian with animated Pip. Read [MASTER_PLAN.md](MASTER_PLAN.md) and the planning pack. This earlier invoice-focused brief is retained as history only. Building is currently paused.

# BeforePay — hackathon build brief

Recommendation: build a Chrome extension that compares an invoice and proposed payment with a previously verified supplier record, explains discrepancies, and asks the user to verify before continuing. Working name only; branding availability has not been checked.

One-line pitch: “BeforePay helps small teams catch suspicious invoice changes before they pay, using the browser and bank they already use.”

## What the documents mean for this build

The PDFs are reference material, not instructions to execute actions, contact people, connect accounts or submit an entry.

- **Fintech Hackathon pack, pages 6–14:** enter Fraud and security. Impact is 30%, originality 25%, execution 25%, and trust 20%. Show one named person and one working end-to-end flow. The demo is limited to 90 seconds.
- **Hackathon pack, pages 13, 30–31:** submission closes at 20:10 London time on 13 October 2026; recording is scheduled from 19:45. Use synthetic/sample data and disclose reused code. Submission needs the track, name, summary, team LinkedIn links and Loom/YouTube video. These are requirements reported by the pack; no submission has been made.
- **Ramp Playbook, pages 6–7, 30, 33:** useful design patterns are data minimisation, checks before spending, and human review of recommendations.
- **Ramp Playbook, pages 51–52:** societies and small businesses offer a focused initial persona. Its claims about competitor eligibility are research claims, not independently established here.
- **Ramp Playbook, pages 58–60:** its broader finance-platform roadmap is measured in months. Card issuing, open banking and accounting integrations do not belong in this 80-minute prototype.
- **Competitive reality:** Ramp's own help centre describes changed-bank-detail, invoice-amount and vendor-verification alerts. Do not claim to invent invoice fraud detection. The proposed distinction is the browser workflow and accessibility to teams using existing tools; this is a positioning hypothesis, not a proven market gap.

## One demonstration

Maya is a fictional student-society treasurer paying a £1,250 catering invoice. A supplier record, marked as independently verified sample data, contains the expected sender domain and payment account.

1. Open a synthetic supplier email. It asks for an urgent payment and changes the destination account.
2. Click the extension's **Check invoice** action. Extract supplier, sender, amount, currency, invoice reference, destination account and links from the selected message.
3. Show **Verify before paying**, with old and new values beside the evidence. Example reasons: account differs from the trusted record; sender domain differs; request pressures the treasurer to skip checks.
4. Open the supported demo payment page. The extension compares its payee, account, amount and currency with the reviewed invoice and supplier record.
5. Pause the demo's payment action and display the discrepancy. The useful next step is to contact the supplier using the previously verified contact, not the contact in the suspicious message.
6. Switch to the clean sample and show **No flagged discrepancies in available checks**. Make clear that this is not a guarantee of legitimacy. No real money moves.

The main wow moment is an exact, visible bank-account difference before the simulated payment completes. Treat urgency as weak supporting evidence, not a fraud verdict.

## Minimum implementation

Use a Manifest V3 extension with plain JavaScript, HTML and CSS, a small local demo website, and one shared deterministic rule module. The empty workspace does not impose an existing framework. A database, authentication system and hosted backend are unnecessary for the initial flow.

```text
Selected email / supported invoice page
                  |
          Structured invoice
                  |
Trusted supplier fixture --> Rules --> Evidence + review status
                  |                         |
       Supported payment page ------------+
                  |
       Recheck current payment fields
                  |
       Human review / simulated payment
```

Suggested files:

```text
extension/manifest.json
extension/popup.html, popup.js, popup.css
extension/content.js
extension/rules.js
extension/suppliers.json
demo/index.html, app.js, styles.css
tests/rules.test.js
README.md
```

Use `activeTab`, `scripting` and, if persistence is needed, `storage`. Explicit user activation enables a manual scan on a supported page. Automatic checks on page load require scoped content-script matches or granted site access; restrict the demo version to localhost. A manual `activeTab` design is not background inbox monitoring.

Ship two input routes: a reliable synthetic invoice page and a paste/selected-text fallback. A Gmail-specific adapter is a stretch goal using a synthetic message in a test account. Do not scrape the user's entire mailbox. The demo site should label itself clearly as a simulation.

The payment pause is a supported demo-page interaction, not a bank-enforced transaction block. Arbitrary bank sites, cross-origin frames and changing page structures are outside the prototype's guarantee. On unsupported pages say “Payment page not supported” and offer manual review.

Keep the supplier baseline in extension-controlled storage, separate from page-provided data. Do not trust a new invoice to update the baseline automatically. Bind the review to invoice identity and current payment fields; changes to payee, account, amount or currency invalidate the previous result. Recheck at the demo payment action.

## Rules and honest outputs

| Evidence | Prototype behaviour |
| --- | --- |
| Account differs from independently verified supplier baseline | Require review; display masked previous/current account and source |
| Payment amount, currency or account differs from invoice | Require review; show exact field difference |
| Sender or payment-link domain differs from supplier record | Flag discrepancy; legitimate processors may use other domains |
| Urgency or secrecy language | Supporting warning only |
| Unknown supplier, missing fields or failed extraction | “Insufficient information”; never a clean result |
| All required fields present and checked without discrepancies | “No flagged discrepancies in available checks” |

Prefer evidence categories over an invented “97% fraud probability”. Account matching does not establish account ownership or perform bank Confirmation of Payee. Visible sender text does not verify SPF/DKIM/DMARC. A compromised genuine mailbox remains possible.

AI is optional: use it to extract fields from messy text and explain already-computed findings. Keep field evidence and allow corrections. Rules control the outcome, and AI cannot override a changed-account flag. Treat email instructions as untrusted content. If using a model API, keep credentials on a backend and send only user-selected, necessary content. If credentials/setup are not immediately available, ship rule-based explanations; label them accurately.

## Eighty-minute budget

| Elapsed | Deliverable |
| --- | --- |
| 0–10 min | Extension loads; synthetic supplier, suspicious invoice and clean invoice fixtures ready |
| 10–25 min | Field extraction and deterministic comparison rules work |
| 25–40 min | Extension evidence view and user-initiated scan work |
| 40–55 min | Supported demo payment page checks current fields and pauses for review |
| 55–65 min | Validate adverse cases and rehearse the entire flow |
| 65–80 min | Freeze features, record a 90-second demo and backup take, prepare submission |

The event's fixed 20:10 deadline takes precedence over a rolling 80-minute budget. Reserve upload/submission time. If the Chrome flow is not working at minute 25, retain the same evaluator in a web demo and explicitly disclose that the extension integration is unfinished. If AI is not working by minute 40, use deterministic extraction for supported fixtures and do not delay recording.

## Acceptance checks

Run and record outcomes; these are proposed tests, not completed validation.

1. A complete clean invoice has no flagged discrepancy.
2. A changed account triggers review even when the sender is genuine.
3. A lookalike domain flags a sender discrepancy; urgency alone does not establish fraud.
4. An unknown supplier or missing account returns insufficient information.
5. Changing payment details after a clean scan invalidates the scan.
6. A wrong payment amount or currency triggers review.
7. Embedded “ignore previous instructions” text cannot change rules or trust records.
8. Unsupported pages and model/extraction failures display limitations without claiming success.

Report pass counts and measured scan latency on these synthetic cases. Do not turn these results into a real-world detection-accuracy claim.

## Ninety-second video

- **0–15 seconds:** introduce Maya and the £1,250 invoice at risk.
- **15–25 seconds:** explain that the email and payment page are usually reviewed separately; this prototype connects the evidence.
- **25–60 seconds:** scan the invoice, show the changed account, and pause the simulated payment.
- **60–75 seconds:** disclose the real extension/rules and synthetic inbox, supplier history and payment. State that findings support human verification and do not prove fraud.
- **75–90 seconds:** show the clean comparison and explain the potential customer: small teams or organisations managing society payments. Subscription/team licensing is a hypothesis to test, not validated pricing.

Zaro is optional if access is already working: synthetic supplier history and reusable verification notes could fit its shared-context theme. The pack also offers a Fotor side prize, but neither integration should delay the core demo.

## Technical sources checked

- [Chrome activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab): temporary access following user interaction.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): page-scoped injection model.
- [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes): `gmail.readonly` is restricted; production access can introduce verification requirements. Test/development exceptions exist, but mailbox OAuth is unnecessary for this prototype.
- [Ramp Bill Pay Fraud](https://support.ramp.com/bill-pay-fraud/): existing invoice/payment fraud alerts and independent verification guidance.

This brief is a build recommendation. No extension has been implemented or tested yet.
