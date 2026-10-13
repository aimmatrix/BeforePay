import {isDemoObservation} from '../evidence/demo-directory.js';
/**
 * evaluate(observation, evidence, {now}?) => Assessment
 * Pure and deterministic: no DOM, network, randomness or clock (createdAt comes from
 * `now` or observation.capturedAt). Identity status and risk verdict are decided separately.
 *
 * Identity rules:
 *  - verified   : UNREACHABLE in contract v1. Evidence has no structured field binding a record
 *                 to an exact host, and free text can't be trusted to do so, so independent
 *                 `matched` records are shown as unconfirmed and identity stays unverified.
 *                 (Proposed v2: Evidence.subjectHost compared with exactHostMatch.)
 *  - mismatch   : any independent or synthetic identity evidence says mismatch.
 *  - demo_match : synthetic `matched` on a demo observation. Never upgraded to verified.
 *  - unverified : everything else. Page-sourced identity claims are never counted.
 *  (Matched records from two different sources are a conflict and count as mismatch.)
 * Verdict rules:
 *  - error     : the observation is unusable, or every identity source errored (and no warnings).
 *  - warning   : at least one warning-severity reason.
 *  - no_flags  : no warnings, identity verified/demo_match, and no check in error/stale.
 *  - uncertain : everything else (missing, failed or stale checks stay visible here).
 */

const DEGRADED = ['not_checked', 'unavailable', 'error', 'stale'];
const KIND_ORDER = ['identity', 'domain', 'payment', 'offer', 'transport', 'returns', 'contact', 'reputation'];
const SEVERITY_ORDER = {warning: 0, unknown: 1, info: 2};
const OFFER_WARNING_PERCENT = 70;

const BASE_LIMITATIONS = [
  'This is a second opinion, not a guarantee. It cannot confirm product authenticity, delivery or whether the purchase is worthwhile.',
  "Text, badges and reviews on the store's own page are treated as claims, not proof.",
  'No fraud probability is given: there is no validated data to support one.',
];

function isValidObservation(o) {
  return Boolean(o && typeof o === 'object' && o.schemaVersion === 1 && typeof o.scanId === 'string' && typeof o.pageKey === 'string');
}

function isEvidence(e) {
  return Boolean(e && typeof e === 'object' && typeof e.id === 'string' && typeof e.kind === 'string' && typeof e.status === 'string');
}

function discountOf(e, observation) {
  if (Number.isFinite(observation.advertisedDiscountPercent)) return observation.advertisedDiscountPercent;
  const m = /(\d{1,3})\s*%/.exec(e.summary || '');
  return m ? Number(m[1]) : null;
}

function severityOf(e, observation) {
  if (DEGRADED.includes(e.status)) return 'unknown';
  if (e.sourceType === 'page' && e.kind === 'identity') return 'info';
  switch (e.kind) {
    case 'identity': return e.status === 'mismatch' ? 'warning' : e.status === 'matched' && e.sourceType === 'independent' ? 'unknown' : 'info';
    case 'domain': return e.status === 'mismatch' ? 'warning' : 'info';
    case 'payment': return e.status === 'observed' || e.status === 'mismatch' ? 'warning' : 'info';
    case 'offer': return e.status === 'mismatch' || (e.status === 'observed' && discountOf(e, observation) >= OFFER_WARNING_PERCENT) ? 'warning' : 'info';
    case 'transport': return e.status === 'mismatch' || (e.status === 'observed' && e.sourceType === 'page' && observation.protocol === 'http:') ? 'warning' : 'info';
    default: return e.status === 'mismatch' ? 'warning' : 'info';
  }
}

/** Matched records from more than one distinct source are treated as a conflict, not a match. */
function identityConflict(evidence) {
  const matched = evidence.filter(e => e.kind === 'identity' && e.sourceType !== 'page' && e.status === 'matched');
  return new Set(matched.map(e => `${e.sourceType}|${e.sourceLabel}`)).size > 1 ? matched : null;
}

function identityOf(evidence, demo) {
  const ids = evidence.filter(e => e.kind === 'identity' && e.sourceType !== 'page');
  if (ids.some(e => e.status === 'mismatch') || identityConflict(evidence)) return 'mismatch';
  if (demo && ids.some(e => e.sourceType === 'synthetic' && e.status === 'matched')) return 'demo_match';
  return 'unverified';
}

/**
 * Reason ids are `<reasonKind>:<evidenceId>`, where reasonKind uses the S1 fixture
 * vocabulary (fixtures/scenarios.json reasonKindVocabulary) wherever a term exists.
 */
function reasonKindOf(e, severity, demo) {
  if (e.status === 'error') return 'provider-error';
  if (e.status === 'stale') return 'provider-stale';
  if (e.status === 'not_checked') return `missing-${e.kind}`;
  if (e.status === 'unavailable') return ['contact', 'returns'].includes(e.kind) ? `missing-${e.kind}` : 'provider-unavailable';
  switch (e.kind) {
    case 'identity':
      if (e.sourceType === 'page') return 'self-claimed-verification';
      if (e.status === 'mismatch') return 'identity-mismatch';
      if (e.sourceType === 'synthetic') return demo ? 'identity-demo-match' : 'sample-record-ignored';
      return 'identity-unbound-match';
    case 'domain': return e.status === 'mismatch' ? 'deceptive-suffix' : 'domain-note';
    case 'transport': return severity === 'warning' ? 'insecure-transport' : 'https-not-identity';
    case 'payment': return 'unusual-payment';
    case 'offer': return severity === 'warning' ? 'urgent-offer' : 'advertised-offer';
    case 'reputation': return e.sourceType === 'page' ? 'self-asserted-reviews' : 'reputation-record';
    default: return `${e.kind}-found`;
  }
}

function titleFor(e, severity) {
  if (e.sourceType === 'page' && e.kind === 'identity') return `${e.summary} (the store's own claim)`;
  if (e.sourceType === 'synthetic') return `Sample data: ${e.summary}`;
  if (e.kind === 'identity' && e.status === 'matched' && e.sourceType === 'independent') return `Not tied to this exact address: ${e.summary}`;
  if (severity === 'unknown' && e.status === 'error') return `Check failed: ${e.summary}`;
  if (severity === 'unknown' && e.status === 'stale') return `Out of date: ${e.summary}`;
  return e.summary;
}

function errorAssessment(observation, createdAt, why) {
  return {
    schemaVersion: 1,
    scanId: typeof observation?.scanId === 'string' ? observation.scanId : '',
    pageKey: typeof observation?.pageKey === 'string' ? observation.pageKey : '',
    createdAt, mode: 'live', verdict: 'error', identityStatus: 'unverified',
    headline: "This check couldn't run",
    summary: `${why} No conclusion has been drawn about this store.`,
    reasons: [], evidence: [],
    nextSteps: ['Try checking again. If it keeps failing, verify the seller yourself before paying.'],
    limitations: BASE_LIMITATIONS.slice(),
  };
}

export function evaluate(observation, evidence, {now} = {}) {
  const createdAt = typeof now === 'string' ? now : typeof observation?.capturedAt === 'string' ? observation.capturedAt : new Date(0).toISOString();
  if (!isValidObservation(observation)) return errorAssessment(observation, createdAt, 'The page information was incomplete.');
  if (!Array.isArray(evidence)) return errorAssessment(observation, createdAt, 'No evidence list was supplied.');

  const allowedDemo = isDemoObservation(observation);
  const items = evidence.filter(isEvidence).filter(e => e.sourceType !== 'synthetic' || allowedDemo);
  const demo = allowedDemo && items.some(e => e.sourceType === 'synthetic');
  const identityStatus = identityOf(items, demo);

  const reasons = items.map(e => {
    const severity = severityOf(e, observation);
    return {id: `${reasonKindOf(e, severity, demo)}:${e.id}`, severity, title: titleFor(e, severity), detail: e.detail || '', evidenceIds: [e.id], _kind: e.kind};
  });
  const conflict = identityConflict(items);
  if (conflict) {
    reasons.push({id: 'identity-mismatch:conflict', severity: 'warning', title: 'Identity records disagree',
      detail: 'Different sources name different organisations for this address, so neither can be trusted as a match.',
      evidenceIds: conflict.map(e => e.id), _kind: 'identity'});
    for (const r of reasons) if (conflict.some(e => r.evidenceIds[0] === e.id && r.evidenceIds.length === 1)) r.severity = 'unknown';
  }
  const identityItems = items.filter(e => e.kind === 'identity' && e.sourceType !== 'page');
  if (identityStatus === 'unverified') {
    reasons.push({id: 'identity-unverified:summary', severity: 'unknown', title: "Seller's identity is not verified",
      detail: "Nothing independent confirms who runs this store. HTTPS, badges and the store's own reviews cannot do that.",
      evidenceIds: identityItems.map(e => e.id), _kind: 'identity'});
    if (!reasons.some(r => r.id.startsWith('missing-identity:'))) {
      reasons.push({id: 'missing-identity:summary', severity: 'unknown', title: 'No completed identity check',
        detail: 'No identity source returned a usable result for this address.',
        evidenceIds: identityItems.filter(e => DEGRADED.includes(e.status)).map(e => e.id), _kind: 'identity'});
    }
  }
  if (demo) {
    reasons.push({id: 'sample-only', severity: 'info', title: 'Fictional demo store and sample records',
      detail: 'This scenario uses made-up data to show how BeforePay works. Nothing here verifies a real retailer.',
      evidenceIds: items.filter(e => e.sourceType === 'synthetic').map(e => e.id), _kind: 'identity'});
  }
  reasons.sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    || (KIND_ORDER.indexOf(a._kind) - KIND_ORDER.indexOf(b._kind)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const r of reasons) delete r._kind;

  const warnings = reasons.filter(r => r.severity === 'warning');
  const failed = items.some(e => e.status === 'error' || e.status === 'stale');
  const identityErrored = identityItems.length > 0 && identityItems.every(e => e.status === 'error');
  const verdict = warnings.length ? 'warning'
    : identityErrored ? 'error'
    : (identityStatus === 'verified' || identityStatus === 'demo_match') && !failed ? 'no_flags'
    : 'uncertain';

  const has = (kind, sev = 'warning') => items.some(e => e.kind === kind && severityOf(e, observation) === sev);
  const nextSteps = [];
  if (identityStatus === 'mismatch' || has('domain')) nextSteps.push("Go to the brand's website by typing its address yourself, not through links on this page.");
  if (has('payment')) nextSteps.push('Prefer a payment method with buyer protection, such as a credit card. Avoid bank transfers, crypto or gift cards to unfamiliar sellers.');
  if (has('offer')) nextSteps.push('Compare the price with retailers you already know.');
  if (has('transport')) nextSteps.push('Do not enter payment details on a page without HTTPS.');
  if (identityStatus === 'unverified') nextSteps.push('Look the seller up on an independent source you already trust before paying.');
  if (has('returns', 'unknown') || has('contact', 'unknown')) nextSteps.push('Find the returns policy and a way to contact the seller before you pay.');
  if (failed) nextSteps.push('Some checks did not finish. Try checking again.');
  if (!nextSteps.length) nextSteps.push('Keep your receipt and pay with a method that offers buyer protection.');

  let headline, summary;
  const n = warnings.length;
  if (verdict === 'warning') {
    headline = 'Pause before you pay';
    summary = `${n} thing${n === 1 ? '' : 's'} on this checkout deserve${n === 1 ? 's' : ''} a closer look before you pay.`
      + (identityStatus === 'mismatch' ? " The address doesn't match the store it claims to be." : '');
  } else if (verdict === 'no_flags') {
    headline = identityStatus === 'demo_match' ? 'Sample record matched, no warning signs' : 'Identity matched, no warning signs';
    summary = (identityStatus === 'demo_match' ? 'This fictional store matches the sample directory' : 'This store matches an independent record')
      + ' and the completed checks found no warning signs. That is not a guarantee of authenticity, delivery or value.';
  } else if (verdict === 'error') {
    headline = "The identity check didn't work";
    summary = 'The identity source returned an error, so there is no result for this store. Nothing here should be read as reassurance.';
  } else {
    headline = failed ? "Some checks couldn't finish" : "This seller isn't verified";
    summary = failed
      ? 'Not every check completed, so there is no clean result. The missing checks are listed below.'
      : "No warning signs were found, but nothing independent confirms who runs this store. HTTPS, badges and on-page reviews can't do that.";
  }

  const limitations = BASE_LIMITATIONS.slice();
  if (demo) limitations.unshift('Demo mode: the store, the directory and every identity record here are fictional sample data.');
  else limitations.push('No independent store directory, review source or domain-records source is connected in this build.');

  return {
    schemaVersion: 1, scanId: observation.scanId, pageKey: observation.pageKey, createdAt,
    mode: demo ? 'demo' : 'live', verdict, identityStatus, headline, summary,
    reasons, evidence: items, nextSteps, limitations,
  };
}
