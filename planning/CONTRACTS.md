# BeforePay interface agreement — proposed v1

Planning contract only. CORE and RISK ratify at kickoff, then CORE publishes runtime types/stubs under src/contracts/. These signatures are not implemented yet. Producers and consumers must use the same contract version. No agent silently alters a field or invents another status.

## Observation and evidence

PageObservation = {
  schemaVersion: 1,
  scanId: string,
  pageKey: string, // canonical origin + pathname; omit query/fragment values that may contain personal data
  capturedAt: ISO8601,
  hostname: string, // parsed URL hostname, normalised; exact registrable-domain handling if implemented
  protocol: 'https:' | 'http:',
  checkoutDetected: boolean,
  checkoutSignals: string[],
  visibleTextExcerpt: string, // bounded merchant/product content, excluding form-field values and private messaging pages
  links: Array<{label: string, hostname: string, pathname: string}>,
  advertisedDiscountPercent: number | null,
  paymentClaims: string[],
  demoScenarioId: 'suspicious-shoes' | 'matching-shoes' | 'unknown-shoes' | null
}

Evidence = {
  id: string,
  kind: 'identity' | 'reputation' | 'domain' | 'transport' | 'contact' | 'returns' | 'offer' | 'payment',
  status: 'observed' | 'matched' | 'mismatch' | 'not_checked' | 'unavailable' | 'error' | 'stale',
  sourceType: 'page' | 'independent' | 'synthetic',
  sourceLabel: string,
  sourceUrl: string | null, // display as text or vetted http(s) link; never execute javascript: URLs
  checkedAt: ISO8601 | null,
  summary: string,
  detail: string
}

A website cannot grant itself independent status. Synthetic evidence is available only through an explicitly enabled demo adapter on the exact local demo origin/path; remote page claims cannot activate it. Do not use a `.includes('brand')` or naive suffix comparison to verify identities. A legitimate third-party checkout domain is neither an automatic match nor an automatic scam.

## Risk module — RISK owns implementation

collectEvidence(observation, {signal, providers}) => Promise<Evidence[]>

evaluate(observation, evidence) => Assessment // pure, deterministic, no DOM or network access

Assessment = {
  schemaVersion: 1,
  scanId: string,
  pageKey: string,
  createdAt: ISO8601,
  mode: 'demo' | 'live',
  verdict: 'warning' | 'uncertain' | 'no_flags' | 'error',
  identityStatus: 'verified' | 'unverified' | 'mismatch' | 'demo_match',
  headline: string,
  summary: string,
  reasons: Array<{id:string, severity:'warning'|'info'|'unknown', title:string, detail:string, evidenceIds:string[]}>,
  evidence: Evidence[],
  nextSteps: string[],
  limitations: string[]
}

Identity and risk are separate: a verified identity can still have warning signs. `no_flags` means no warning signs in completed checks, never 'safe to buy'. Missing core identity evidence keeps the overall result uncertain unless specific warnings are present. `verified` requires independent evidence that establishes identity for this exact host under a documented rule. Neither HTTPS nor a website's badge qualifies. Demo evidence yields only `demo_match`. No fraud-probability percentage without a validated model/calibration dataset, which this sprint does not provide.

Provider interface: name, supportedKinds, async lookup(observation, {signal}) => Evidence[]. Unavailable access, provider timeout and stale responses return typed evidence, not a favourable finding. Partial results remain visible. Optional remote fetches require CORE review of origins, input validation and credential handling before inclusion.

## Pip module — PIP owns implementation

mountPip(container: HTMLElement, options: {onOpen:()=>void, onDismiss:()=>void, reducedMotion:boolean}) => {
  update(view: PipView): void,
  destroy(): void
}

PipView = {
  state: 'idle'|'noticing'|'checking'|'warning'|'uncertain'|'identity_matched'|'error'|'dismissed',
  label: string,
  message: string,
  expanded: boolean
}

CORE maps Assessment to PipView; PIP does not infer risk. A warning takes priority over any identity match. identity_matched is used only without warnings, with explicit demo labelling when relevant. The mascot reads no page content and uses no Chrome APIs. Mount under the supplied root only. No global CSS or DOM selectors; bundle original SVG/CSS assets locally; no remote scripts, fonts or render-time dependencies. destroy cancels listeners/timers and removes owned DOM.

## Panel module — C2 owns implementation

mountPanel(container: HTMLElement, options:{onRescan:()=>void, onDismiss:()=>void}) => {
  update(assessment: Assessment|null, phase:'idle'|'checking'|'complete'|'error'):void,
  setOpen(open:boolean):void,
  destroy():void
}

Render supplied strings with textContent or equivalent escaping. Group findings, sources and not-checked items. Do not invent reasons, scores or sources. Include visible demo disclosure and a concise 'not a guarantee' explanation. Treat arbitrary remote links as untrusted; allow only validated http(s), with no opener access. A keyboard user can open/close the panel and return to the trigger. No focus trap unless explicitly implemented as a modal by CORE.

## Popup module — C3 owns implementation

mountPopup(container, {onAction:(action)=>Promise<RuntimeReply>}) => {update(state:PopupState):void,destroy():void}

Action: {type:'SCAN_ACTIVE_TAB'} | {type:'REQUEST_SITE_ACCESS'} | {type:'REMOVE_SITE_ACCESS'} | {type:'SET_MOTION', value:'system'|'reduced'}.

PopupState: {supported:boolean, originLabel:string, siteAccess:'manual'|'granted', motion:'system'|'reduced', busy:boolean, error:string|null}.

RuntimeReply: {ok:boolean, state:PopupState, message:string|null}.

CORE supplies permissions, settings persistence, messaging, HTML entrypoints and bundles; C3 supplies presentation. Permission rejection is visible. Optional automatic-site controls must be hidden/disabled if CORE does not implement their actions. Never imply activeTab grants background access to every site.

## Demo and fixtures — C1 and S1

Scenario ID values are fixed above. Synthetic scenario data lives in fixtures/scenarios.json. Each record has id, displayName, claimedBrand, simulatedHostname, product:{name,price,currency,advertisedDiscountPercent}, visibleClaims, links, syntheticIdentityEvidence and expected:{verdict,identityStatus,reasonKinds}. Product descriptions and history are made up.

C1 owns demo behaviour and imports the fixture schema; S1 owns canonical fixtures. If fixtures are not ready, C1 can use a temporary local placeholder under demo/ with the identical shape, then delete it at integration. Do not make the store the authority for expected test outcomes.

The demo has product and checkout routes, scenario switcher and simulation-only payment control. It publishes only a checkout-changed notification; CORE observes route/DOM and rechecks it. A page message is a hint, not a trusted finding. On a real site the extension never replays or auto-clicks a payment action. The demo's simulated completion stays separate from the scanner.

## Runtime — CORE

One mount per document, one current scan ID. Every scan cancels older work and confirms scanId and pageKey before rendering. Navigation invalidates old findings. Service-worker calls carry request IDs and validated sender/tab context. Extraction excludes user form values and avoids mailbox/private-app pages. Optional observers debounce and ignore the extension root. Dismissal survives mutations on the same checkout; manual rescan or a genuinely new checkout can reopen it.

Minimum permission baseline: activeTab and scripting. Any storage or optional per-site host permissions are added by CORE for implemented features only. Automatic scanning of arbitrary sites is not claimed unless the user grants the matching origin and the lifecycle is tested. Cross-origin/unsupported frames produce an explicit limitation.
