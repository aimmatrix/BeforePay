import assert from 'node:assert/strict';
import { observation, contracts } from './impl.mjs';
import { documentFromHTML } from './fake-dom.mjs';

export function ensureComputedStyle() {
  if (typeof globalThis.getComputedStyle !== 'function') {
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: (el) => ({ visibility: /visibility\s*:\s*hidden/i.test(String(el.getAttribute?.('style') ?? '')) ? 'hidden' : 'visible' })
    });
  }
}

/** Run the real collectObservation against merchant HTML parsed by the fake DOM. */
export function observe(html, url = 'https://shop.example/checkout', scanId = 't1') {
  ensureComputedStyle();
  return observation.collectObservation(documentFromHTML(html), url, scanId);
}

export function newSignal() {
  return new AbortController().signal;
}

/** collectEvidence → evaluate through one evaluator implementation. */
export async function assess(impl, obs, providers) {
  // `providers` omitted -> the implementation's own defaults (an explicit [] means "no providers at all" for src/risk).
  const options = providers === undefined ? { signal: newSignal() } : { signal: newSignal(), providers };
  const evidence = await impl.collectEvidence(obs, options);
  return impl.evaluate(obs, evidence);
}

export function assertContractShape(a) {
  assert.equal(contracts.isAssessment(a), true, 'evaluator must return a contract-valid Assessment');
}

/** Every string anywhere inside a value (keys excluded). */
export function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

/** Phrases that must never be emitted by product copy (see CONTRACTS.md: no safety/fraud claims). */
export const BANNED_PHRASES = [
  /verified safe/i,
  /\bcertified\b/i,
  /\bguaranteed\b/i,
  /fraud confirmed/i,
  /confirmed (fraud|scam)/i,
  /\bsafe to buy\b/i,
  /\b100% safe\b/i,
  /\bscammer\b/i
];
/** Kept separate: bare "scam" is on the user's banned list but appears in "not checked" copy. */
export const SCAM_WORD = /\bscam\b/i;

export function evidenceItem(overrides = {}) {
  return {
    id: 'identity',
    kind: 'identity',
    status: 'not_checked',
    sourceType: 'independent',
    sourceLabel: 'Test provider',
    sourceUrl: null,
    checkedAt: new Date().toISOString(),
    summary: 'test evidence',
    detail: 'test evidence detail',
    ...overrides
  };
}

export const HTTPS_STORE_HTML = '<main><h1>Plain Shoes</h1><p>Nice running shoes. Free delivery over 50.</p></main>';
