# Independent evidence sources — sprint feasibility

**Task:** S5  
**Date:** 13 October 2026  
**Method:** Primary documentation only. No accounts created, no API keys obtained, no paid services, no live lookups, no provider implementation.  
**Contract mapping:** frozen v1 `Evidence` / `identityStatus` in `planning/CONTRACTS.md`.  
**Sprint rule:** if working access is not identified by minute 8, ship synthetic identity records and keep real sites unverified.

## Sprint decision — accepted

The S5 no-live-provider recommendation is **accepted for this sprint**. RISK, CORE, S1, C2, and S3 should treat the following as binding. S5 does not implement adapters.

1. **No live evidence providers.** Do not call Safe Browsing, RDAP, Web Risk, or any other remote reputation/identity API. Do not invent domain age, affiliation, or list results.
2. **Synthetic adapter only on CORE’s explicitly allowed local demo pages.** Remote page claims, query parameters, and lookalike hosts cannot activate synthetic evidence. Exact origin/path gating is CORE’s.
3. **Label every synthetic finding as demo data.** `sourceType` is `synthetic`. Copy must say it is sample/demo evidence, not certification.
4. **Real websites remain `identityStatus: unverified`.** Visible page observations (`sourceType: page`) may support **warnings** (offer, payment claims, contact missing, lookalike patterns). They cannot establish merchant identity and cannot become `verified`.
5. **Unavailable external checks appear as `not_checked` or `unavailable`.** Timeouts, missing adapters, and this cutoff must stay visible. They must not collapse into a clean result.
6. **A matching demo identity uses `demo_match`, never `verified`.**
7. **Missing independent identity evidence keeps the verdict `uncertain`**, unless specific completed findings justify `warning`. `no_flags` is not “safe to buy.” `verified` is unused this sprint.

Implementation owners: RISK (`collectEvidence` / `evaluate`), CORE (demo-origin allowlist and no remote evidence hosts), S1 (fixture expected `identityStatus`), C2 (visible demo labels and not-checked rows). S5 owns only this note.

## Recommendation (this 80-minute build)

**Do not integrate either source in this sprint.** Accepted. RISK keeps the optional independent adapter unwired and uses the synthetic demo adapter only on allowed local demo pages. Real checkouts stay `identityStatus: unverified`. Missing checks stay visible. Do not invent domain age, reputation, or affiliation.

| Source | Evidence kinds it could feed | Can it justify `verified`? | Practical by minute 8? |
| --- | --- | --- | --- |
| Google Safe Browsing Lookup API (v4) | `reputation` (warning only) | No | No — needs Google account, Cloud project, API key, ToS notices, and a backend so the key is not in the extension |
| ICANN/IANA RDAP | `domain` (registration facts) | No | No as identity; theoretically hostname-only and keyless, but bootstrap, many origins, redaction, and honest mapping do not fit the cutoff |

Both sources can still be useful later. Neither is a merchant-verification directory.

## Scam-list absence is not merchant verification

These are different claims. The contract already separates them; providers must not collapse them.

**A list hit (Safe Browsing match):** independent evidence that Google currently classifies that URL as a listed unsafe resource (malware, social engineering / phishing and deceptive sites, unwanted software, or potentially harmful application). That can support a **warning**, with mandated qualifying language (“may”, “potentially”). It does not prove the shop is fake, the goods are counterfeit, or that payment will fail.

**A list miss (empty Safe Browsing `matches` object):** the URL was **not found on the lists queried**. Google’s own usage rules require saying protection is imperfect: risky sites may be missing and safe sites may be flagged. A miss is **`not_checked` remaining clean for this check**, or at most an informational “not currently listed” note. It is **not** `identityStatus: verified`, not `no_flags` meaning “safe to buy”, and not proof the seller is the brand they claim.

**RDAP public data:** can show that a domain object exists at a registry/registrar and, for gTLDs, typically the registrar, creation/expiry events, and status. Registrant name, street, phone and similar contact fields are commonly **redacted** under the Registration Data Policy. A privacy/proxy service may be what is published. Domain existence and age are **not** the legal identity of the checkout merchant, **not** product authenticity, and **not** delivery assurance. A lookalike domain has its own, equally “valid”, RDAP record.

**`verified` in BeforePay** requires independent evidence that **this exact host** is the named merchant under a documented rule. Neither “not on a scam list” nor “domain is registered” meets that rule. HTTPS, a badge on the shop’s own page, and synthetic demo data also do not.

---

## Source 1 — Google Safe Browsing Lookup API (v4)

### What it can establish

Google documents that the Safe Browsing APIs let clients check URLs against Google’s lists of unsafe web resources. Examples given are social engineering sites (phishing and deceptive sites) and sites that host malware or unwanted software. “Any URL found on a Safe Browsing list is considered unsafe” **in that list-membership sense**.

Threat types in the v4 enum: `MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE`, `POTENTIALLY_HARMFUL_APPLICATION`.

Lookup method: HTTP `POST` to `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=API_KEY` with JSON `threatEntries` URLs (up to 500 per request). If none of the URLs are on the requested lists, the response body is an **empty object**. If there is a match, the response includes `threatType`, the URL, optional metadata, and `cacheDuration`.

Supported BeforePay claim, if wired honestly:

- Match → `kind: reputation`, `sourceType: independent`, `status: matched`, warning language qualified as suspected/potential, Google attribution required.
- Empty object → **not a clean bill of health**. Map to no reputation hit from this check; do **not** promote identity.

Unsupported claims: merchant identity, Companies House-style legal entity, “this shoe shop is legitimate”, product authenticity, delivery, price fairness, or a fraud probability.

Google’s advisory describes the lists as compiled with algorithms and user feedback, focused on social engineering, malware, and unwanted software — not a general “fake shop” or brand-affiliation register. A newly made storefront that is not phishing in Google’s sense can miss the lists entirely.

### Access requirements

From Get started and Lookup API docs:

1. Google Account  
2. Google Developer Console / Cloud project  
3. API key (passed as the URL `key` query parameter)  
4. Enable “Safe Browsing APIs” on the project  

S5 did not create any of these. CORE would have to supply a key that already exists. Remote credentials belong on a backend, not in the Chrome package.

Chrome: Lookup sends **full URLs** to Google. The service-worker would need host permission for `safebrowsing.googleapis.com` (or a BeforePay backend origin). Putting the API key in the unpacked extension leaks it.

### Setup time

Account + project + key + enable API is longer than the minute-8 evidence cutoff unless the key already exists in the environment. Update API (local hash lists) needs a local database and URL canonicalisation/hashing — out of scope for this sprint. This research did not implement or time a live setup.

### Costs

Official pricing page: **all use of Safe Browsing APIs is free of charge**, subject to a default quota visible in the Developer Console; increases are by request.

**Permitted use is non-commercial** (“not for sale or revenue generating purposes”). Commercial URL detection is directed to the **Web Risk API**. Web Risk Lookup `uris.search` is documented as free for the first 100,000 calls per month, then $0.50 per 1,000 calls (USD). This sprint must not purchase Web Risk; it is noted only as the documented commercial alternative.

### Privacy

Lookup API: URLs are **not hashed**; Google’s server knows which URLs are queried. No lookup latency guarantee.

Update API: hash prefixes locally; the server is not told the actual URL except after a prefix collision. Too heavy for this sprint.

BeforePay must not send card, address, or password field values. Hostname/URL of the checkout page is still shopping telemetry. A backend still learns which stores users scanned.

### Latency and freshness

No response-time SLA for Lookup. Terms additionally say a client may not treat a listed URL as unsafe unless it received updated information via the API **within the past thirty minutes**. Lookup matches also carry `cacheDuration`; a warning may be shown only while that cache is valid. Stale matches must become `stale` / `unavailable`, not a lingering warning and not a clean result.

### Usage / UI constraints that affect Pip and the panel

From Usage Restrictions and Terms:

- Qualify warnings (suspected, potentially, may be). Do not tell users the page is unsafe with certainty.  
- Attribute Google list-based warnings: “Advisory provided by Google,” linking the Safe Browsing Advisory. Do not put that attribution on non-Google findings.  
- If the product claims protection against unsafe resources, show a conspicuous imperfect-protection notice **before** the user enables it (false positives and false negatives).  
- Suggested social-engineering copy is about phishing/deception and credentials, not “this shoe seller is unverified.”

Chrome already runs Safe Browsing for navigations. Duplicating Lookup in Pip adds little for malware/phishing Chrome already interstitially warns about, and still does not verify the merchant.

### Sprint verdict

**Not practical.** Blockers: no pre-existing key (and S5 must not create one), backend required, ToS copy and 30-minute freshness, empty match must not look verified, commercial-use restriction if BeforePay is later sold. Cut at minute 8.

Primary docs:

- [Overview](https://developers.google.com/safe-browsing/v4)  
- [Get started](https://developers.google.com/safe-browsing/v4/get-started)  
- [Lookup API](https://developers.google.com/safe-browsing/v4/lookup-api)  
- [Lists](https://developers.google.com/safe-browsing/v4/lists)  
- [ThreatType](https://developers.google.com/safe-browsing/v4/reference/rest/v4/ThreatType)  
- [Usage restrictions](https://developers.google.com/safe-browsing/v4/usage-limits)  
- [Pricing](https://developers.google.com/safe-browsing/v4/pricing)  
- [Terms](https://developers.google.com/safe-browsing/v4/terms)  
- [Advisory](https://developers.google.com/safe-browsing/v4/advisory)  
- [Web Risk pricing](https://cloud.google.com/web-risk/pricing) (commercial alternative only)

---

## Source 2 — Registration Data Access Protocol (RDAP)

### What it can establish

RDAP is the IETF replacement for WHOIS: HTTPS JSON lookup of **current registration data** from registries and registrars. ICANN requires gTLD registries and registrars to operate RDAP using the gTLD RDAP Profile. As of 28 January 2025 they are no longer required to operate WHOIS except for `.com`, `.name`, and `.post`.

Public gTLD RDDS **must** publish (Registration Data Policy §9.1.1), among other elements: domain name, registrar URL, creation date, registry expiry (with stated exceptions), registrar name, registrar IANA ID, registrar abuse email/phone, domain status(es), last RDDS update. Nameservers and DNSSEC are published when collected/generated (§9.1.2).

Supported BeforePay claim, if wired honestly:

- Successful lookup of the **exact registrable host** → `kind: domain`, `sourceType: independent`, `status: observed` (or `matched` only against a documented synthetic/demo directory, never against the shop’s self-description). Summaries limited to facts in the RDAP object (e.g. creation event, sponsoring registrar, status).  
- HTTP 404 / no bootstrap match / timeout → `unavailable` or `error`, not a favourable finding.

Unsupported claims: “this is the official Brand shoe store”; legal-person identity of the merchant; that the registrant organisation (when present) operates the checkout; product authenticity; delivery; that an old domain is trustworthy or a new domain is a scam.

Registrant name, street, phone, email and related fields are **in-scope for redaction** when operators apply §9.2 (including where required by applicable law, or globally where they choose). Registry operators **may redact Registrant Organization**. Privacy/proxy registrations **must publish the privacy/proxy service’s data**, not the underlying customer. Non-public data is available only through a **disclosure request** process (identity of requestor, legal basis, up to 30 days, or urgent authenticated channels) — not a checkout-time shopper lookup, and S5 must not submit such requests.

ccTLDs are not bound by the ICANN gTLD Registration Data Policy; bootstrap may still list an RDAP server, with different fields and policies.

### Access requirements

No API key for the public RDAP layer.

1. Fetch IANA bootstrap JSON: `https://data.iana.org/rdap/dns.json` ([IANA RDAP DNS registry](https://www.iana.org/assignments/rdap-dns), [RFC 9224](https://www.rfc-editor.org/rfc/rfc9224.html)).  
2. Longest label-wise match, right to left; prefer HTTPS base URLs.  
3. Query `GET {base}domain/{fqdn}` ([RFC 9082](https://datatracker.ietf.org/doc/html/rfc9082) §3.1.3). Example from RFC 9224: `https://registry.example.com/myrdap/domain/a.b.example.com`.  
4. Follow registry vs registrar behaviour: a registrar RDAP **must** 404 if it is not the sponsoring registrar (gTLD Response Profile §2.11.1). Clients may need the registry response plus optional registrar URL from links — extra requests and failure modes.

Chrome: each TLD’s RDAP host is a different origin. Manifest V3 would need broad optional host permissions or a CORE-owned backend proxy. That is outside the documented minimum of `activeTab` + `scripting`, and needs CORE review before any fetch.

Differentiated (authenticated) RDAP access to non-public contacts is out of scope for the public profile and for this sprint.

### Setup time

Zero account creation. Non-zero engineering: bootstrap cache, IDN A-label handling, timeout/404/redirect mapping, permission or proxy, and copy that does not over-claim. That is an adapter plus CORE origin review, not an 8-minute confirmation of “working access.”

### Costs

Public queries: no published per-lookup fee from ICANN/IANA. No client SLA for a shopping extension. Operators may rate-limit; quotas are not a single documented global number. Do not assume unlimited bulk scanning.

### Privacy

Query data is the **domain name** (and the fact of a lookup) sent to IANA (bootstrap) and the authoritative RDAP operator. Do not send page text, payment claims, or form fields. ICANN’s lookup tool states that for RDAP-compliant lookups ICANN does not retain query data; individual registries/registrars have their own logs. BeforePay should treat RDAP operators as third parties who see which host was scanned.

Do not display redacted or proxy contact data as if it were the shopper-facing merchant. Do not store RDAP contact PII if a rare unredacted record appears; hostname, registrar, and event timestamps are enough if this is ever wired.

### Limitations

- Redaction and proxy services remove the identity signal shoppers might expect.  
- Creation date is a domain fact, not a risk score. No calibrated “too new” threshold exists in this project.  
- Exact-host rule: `brand.example.attacker.example` is a different FQDN with its own RDAP row; naive suffix/`includes('brand')` matching is forbidden by contract.  
- Coverage holes: missing bootstrap entry, thin historic models, ccTLD policy, rate limits, CORS if anyone tries a page-context fetch.  
- RFC 9082 notes authentication exists in the protocol family; public BeforePay must not pretend it has disclosure-tier data.

### Sprint verdict

**Not practical as verification.** **Not recommended as a wired adapter** in 80 minutes. The only honest later use is optional `kind: domain` observations (registrar + creation event) with `not_checked` for identity. Never map RDAP success to `identityStatus: verified`.

Primary docs:

- [ICANN RDAP](https://www.icann.org/rdap/)  
- [IANA bootstrap registry](https://www.iana.org/assignments/rdap-dns) / [dns.json](https://data.iana.org/rdap/dns.json)  
- [RFC 9224](https://www.rfc-editor.org/rfc/rfc9224.html)  
- [RFC 9082](https://datatracker.ietf.org/doc/html/rfc9082)  
- [gTLD RDAP Response Profile (21 Feb 2024)](https://itp.cdn.icann.org/en/files/registry-operators/rdap-response-profile-21feb24-en.pdf)  
- [Registration Data Policy](https://www.icann.org/en/contracted-parties/consensus-policies/registration-data-policy)  
- [Temporary Specification (historical GDPR layering)](https://www.icann.org/en/contracted-parties/generic-top-level-domains/temporary-specification-for-gtld-registration-data-01-01-2020-en)  
- [Registration Data Policy FAQs](https://www.icann.org/en/system/files/files/registration-data-policy-faqs-21aug25-en.pdf)

---

## Mapping to BeforePay statuses (if someone later wires a provider)

| Provider outcome | `Evidence.status` | `identityStatus` | Notes |
| --- | --- | --- | --- |
| Safe Browsing match, cache still valid | `matched` | unchanged (not verified) | Warning; qualified copy; Google attribution |
| Safe Browsing empty object | do not use `matched`; not a pass | still `unverified` unless another independent rule applies | “Not listed” ≠ safe |
| Safe Browsing error / no key / timeout | `error` or `unavailable` | not improved | Visible miss |
| Safe Browsing match older than cache / >30 min | `stale` | not improved | Must not show as current warning |
| RDAP 200 with registrar + registration event | `observed` | not `verified` | Domain facts only |
| RDAP 404 / no TLD bootstrap | `unavailable` | not improved | Unknown TLD or unregistered |
| Redacted registrant / proxy service | `observed` with limitation text | not `verified` | Absence of name is not a mismatch with the shop |

Page-sourced contact links and HTTPS remain `sourceType: page` observations. They cannot be upgraded because RDAP or Safe Browsing ran.

## Minute-8 cutoff — in force

Accepted 13 October 2026:

1. Independent providers are **unavailable**. Surface them as `not_checked` or `unavailable`, not as a pass.  
2. Demo scenarios use **synthetic** evidence only, on CORE-allowed local demo pages, labelled sample, `demo_match` at most.  
3. Live real sites: **unverified**, even with HTTPS and on-page reviews. Page observations may warn; they cannot verify identity.  
4. Do not display invented domain age or scam-database results.  
5. Later (not this sprint): RDAP only as optional `domain` evidence with CORE-approved origins; Safe Browsing only with an existing key, a backend, and ToS-compliant copy — still never as verification.

## Not tested

Live `threatMatches.find` or RDAP HTTP calls; quota numbers in a Console project; Chrome host-permission prompts; Web Risk signup; ccTLD-specific RDAP profiles; latency distributions.
