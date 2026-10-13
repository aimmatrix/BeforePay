/**
 * Runs evidence providers in parallel with per-provider time limits and normalises their
 * output. Failures become typed evidence (error/unavailable), never favourable findings.
 * Aborting the outer signal (a newer scan) rejects with an AbortError so callers discard it.
 */
import {createPageProvider} from './page.js';
import {createDemoDirectoryProvider, isDemoObservation} from './demo-directory.js';
import {createNoIndependentSourceProvider} from './independent-none.js';

export const KINDS = Object.freeze(['identity', 'reputation', 'domain', 'transport', 'contact', 'returns', 'offer', 'payment']);
export const STATUSES = Object.freeze(['observed', 'matched', 'mismatch', 'not_checked', 'unavailable', 'error', 'stale']);
const SOURCE_TYPES = ['page', 'independent', 'synthetic'];
const DAY = 86400000;

export function defaultProviders() {
  return [
    createPageProvider(),
    createDemoDirectoryProvider(),
    createNoIndependentSourceProvider({appliesToIdentity: o => !isDemoObservation(o)}),
  ];
}

const clip = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function validIso(value) {
  if (typeof value !== 'string') return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function abortError() {
  try { return new DOMException('The scan was superseded.', 'AbortError'); }
  catch { const e = new Error('The scan was superseded.'); e.name = 'AbortError'; return e; }
}

/** Coerces one provider item into contract Evidence. sourceType is fixed by the provider, never by the item. */
export function normaliseEvidence(item, provider, {now, maxAgeMs, demo}) {
  if (!item || typeof item !== 'object') return null;
  const sourceType = SOURCE_TYPES.includes(provider.sourceType) ? provider.sourceType : 'page';
  if (sourceType === 'synthetic' && !demo) return null;
  const kind = item.kind;
  if (!KINDS.includes(kind) || (Array.isArray(provider.supportedKinds) && !provider.supportedKinds.includes(kind))) return null;
  let status = STATUSES.includes(item.status) ? item.status : 'error';
  const checkedAt = validIso(item.checkedAt);
  if (['observed', 'matched', 'mismatch'].includes(status) && sourceType !== 'page' && checkedAt && now - Date.parse(checkedAt) > maxAgeMs) status = 'stale';
  return {
    id: `${provider.name}:${clip(String(item.id ?? kind), 60) || kind}`,
    kind, status, sourceType,
    sourceLabel: clip(item.sourceLabel, 80) || clip(provider.label, 80) || provider.name,
    sourceUrl: safeUrl(item.sourceUrl),
    checkedAt,
    summary: clip(item.summary, 160) || `${kind} check`,
    detail: clip(item.detail, 600),
  };
}

function failureEvidence(provider, reason) {
  const label = clip(provider.label, 80) || provider.name;
  const timeout = reason === 'timeout';
  return (provider.supportedKinds || ['identity']).filter(k => KINDS.includes(k)).map(kind => ({
    id: `${provider.name}:${kind}:${timeout ? 'timeout' : 'error'}`,
    kind, status: timeout ? 'unavailable' : 'error',
    sourceType: SOURCE_TYPES.includes(provider.sourceType) ? provider.sourceType : 'page',
    sourceLabel: label, sourceUrl: null, checkedAt: null,
    summary: timeout ? `${label} did not respond in time` : `${label} check failed`,
    detail: 'This check could not be completed, so it does not count as a favourable finding.',
  }));
}

function runProvider(provider, observation, outer, timeoutMs) {
  const local = new AbortController();
  let timer, onAbort;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => { local.abort(); resolve({failed: 'timeout'}); }, timeoutMs);
    onAbort = () => { local.abort(); resolve({failed: 'timeout'}); };
    outer?.addEventListener?.('abort', onAbort, {once: true});
  });
  const work = Promise.resolve()
    .then(() => provider.lookup(observation, {signal: local.signal}))
    .then(items => ({items: Array.isArray(items) ? items : []}), () => ({failed: 'error'}));
  return Promise.race([work, timeout]).finally(() => { clearTimeout(timer); outer?.removeEventListener?.('abort', onAbort); });
}

/** A signal aborted by a time limit (AbortSignal.timeout) is not a superseded scan. */
const superseded = signal => Boolean(signal?.aborted && signal.reason?.name !== 'TimeoutError');

/**
 * collectEvidence(observation, {signal, providers, timeoutMs, now, maxAgeMs}) => Promise<Evidence[]>
 * The built-in adapters (page, gated demo directory, "no independent source") always run;
 * `providers` adds external sources. If `signal` times out, unfinished providers become
 * typed `unavailable` evidence; if it is aborted for any other reason the promise rejects.
 */
export async function collectEvidence(observation, {signal, providers = [], timeoutMs = 2500, now = Date.now(), maxAgeMs = 7 * DAY} = {}) {
  if (superseded(signal)) throw abortError();
  if (!observation || typeof observation !== 'object') return [];
  const demo = isDemoObservation(observation);
  const all = [...defaultProviders(), ...(Array.isArray(providers) ? providers : [])];
  const results = await Promise.all(all.map(p => runProvider(p, observation, signal, timeoutMs)));
  if (superseded(signal)) throw abortError();
  const evidence = [];
  const seen = new Set();
  results.forEach((result, i) => {
    const provider = all[i];
    const items = result.failed ? failureEvidence(provider, result.failed) : result.items.map(item => normaliseEvidence(item, provider, {now, maxAgeMs, demo})).filter(Boolean);
    for (const e of items) {
      let id = e.id, n = 2;
      while (seen.has(id)) id = `${e.id}-${n++}`;
      seen.add(id);
      evidence.push({...e, id});
    }
  });
  return evidence.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
}
