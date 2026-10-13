/**
 * Page-observation adapter. Everything here is what the store's own page shows, so every
 * item is sourceType 'page': an observation, never independent proof. Page text is matched
 * against fixed patterns only; it is never interpreted, executed or copied into findings.
 */
import {hasInternationalLabel} from './hostname.js';
import {isDemoObservation} from './demo-directory.js';

const PAYMENT_PATTERNS = [
  ['bank-transfer', 'Bank transfer only', /bank\s+transfer\s+only|(?:only|exclusively)\s+(?:accept|take|pay|payment|payments)\w*\s+(?:by|via)?\s*bank\s+transfer/i],
  ['wire', 'Wire or money-transfer service', /wire\s+transfer\s+only|western\s+union|moneygram/i],
  ['crypto', 'Cryptocurrency payment', /pay(?:ment)?\s+(?:with|in|via|using|by)\s+(?:bitcoin|btc|crypto\w*|usdt|ethereum)|(?:bitcoin|crypto\w*|usdt)\s+(?:only|payments?\s+only)/i],
  ['gift-card', 'Gift card payment', /pay(?:ment)?\s+(?:with|via|using|by|in)\s+gift\s*cards?|gift\s*cards?\s+(?:only|accepted|as\s+payment)/i],
  ['friends-family', 'Friends-and-family payment', /friends\s*(?:and|&)\s*family/i],
  ['details-after-order', 'Payment details sent after order', /(?:payment|bank)\s+details\s+(?:will\s+be\s+)?sent\s+after/i],
];
const SELF_VERIFIED = /\b(?:verified\s+(?:store|seller|shop|official)|100%\s+verified|official\s+\w+\s+partner|verified\s+by\s+\w+|identity\s+confirmed|trusted\s+store)\b/i;
const SELF_REVIEWS = /\b(?:\d(?:\.\d)?\s*stars?|[\d,]+\s+(?:five[- ]star\s+|5[- ]star\s+)?reviews|trusted\s+by\s+(?:shoppers|customers))\b/i;
const CONTACT = /contact|support|help|customer\s+service/i;
const RETURNS = /return|refund/i;

const text = value => (typeof value === 'string' ? value : '');

export function createPageProvider() {
  return {
    name: 'page',
    label: 'Visible page observation',
    sourceType: 'page',
    supportedKinds: ['transport', 'contact', 'returns', 'offer', 'payment', 'identity', 'reputation', 'domain'],
    async lookup(observation) {
      return pageEvidence(observation);
    },
  };
}

export function pageEvidence(observation) {
  const at = observation.capturedAt || null;
  const out = [];
  const add = (id, kind, status, summary, detail) => out.push({id, kind, status, sourceType: 'page', sourceLabel: 'Visible page observation', sourceUrl: null, checkedAt: at, summary, detail});
  const body = [text(observation.visibleTextExcerpt), ...(observation.paymentClaims || []).map(text)].join(' \n ');
  const links = Array.isArray(observation.links) ? observation.links : [];
  const demo = isDemoObservation(observation);

  if (demo) add('transport', 'transport', 'not_checked', 'Connection not assessed on the local demo', 'The demo runs on a local test server, so the connection type says nothing about the fictional store.');
  else if (observation.protocol === 'https:') add('transport', 'transport', 'observed', 'Page uses HTTPS', 'HTTPS encrypts the connection. It does not show who runs the store or whether they are trustworthy.');
  else add('transport', 'transport', 'observed', 'Page does not use HTTPS', 'Information entered on this page may travel without encryption. Do not enter payment details here.');

  const hasLink = re => links.some(l => re.test(`${text(l.label)} ${text(l.pathname)}`));
  add('contact', 'contact', hasLink(CONTACT) ? 'observed' : 'unavailable',
    hasLink(CONTACT) ? 'Contact link found' : 'No contact link found',
    hasLink(CONTACT) ? 'A contact link is visible. The contact details have not been independently checked.' : 'No visible contact link was found in this scan. It may be elsewhere; missing information is not proof of fraud.');
  add('returns', 'returns', hasLink(RETURNS) ? 'observed' : 'unavailable',
    hasLink(RETURNS) ? 'Returns link found' : 'No returns or refunds link found',
    hasLink(RETURNS) ? 'A returns or refunds link is visible. Whether the policy is honoured has not been checked.' : 'No visible returns or refunds link was found in this scan. Check the policy before paying.');

  const pct = observation.advertisedDiscountPercent;
  if (Number.isFinite(pct) && pct > 0 && pct <= 100) {
    add('offer', 'offer', 'observed', `${Math.round(pct)}% discount advertised`, pct >= 70
      ? 'An unusually large reduction is a common pressure tactic. The real market price has not been checked.'
      : 'A discount is advertised. The real market price has not been checked.');
  }

  for (const [id, label, re] of PAYMENT_PATTERNS) {
    if (re.test(body)) add(`payment-${id}`, 'payment', 'observed', `${label} requested`, 'Payment methods like this are hard to reverse if something goes wrong. Prefer a method with buyer protection.');
  }

  if (SELF_VERIFIED.test(body)) add('identity-self-claim', 'identity', 'observed', 'The store describes itself as verified or official', "This is the store's own claim. A website cannot verify itself, so it is not counted as identity evidence.");
  if (SELF_REVIEWS.test(body)) add('reputation-self-reviews', 'reputation', 'observed', "Reviews shown on the store's own page", 'Ratings printed by the store itself are not independent reviews.');
  if (!demo && hasInternationalLabel(observation.hostname)) add('domain-idn', 'domain', 'observed', 'Address uses internationalised characters', 'Such addresses are often legitimate but can imitate familiar names. Check the address carefully.');
  return out;
}
