/**
 * Pip state table. PIP owns this module.
 * The only place the eight PipView states are listed. Pip renders a state;
 * it never derives one from page content or an Assessment (CORE does that).
 */

/** @typedef {'idle'|'noticing'|'checking'|'warning'|'uncertain'|'identity_matched'|'error'|'dismissed'} PipState */

/** @type {readonly PipState[]} */
export const PIP_STATES = Object.freeze([
  'idle',
  'noticing',
  'checking',
  'warning',
  'uncertain',
  'identity_matched',
  'error',
  'dismissed'
]);

/**
 * Colour tone per state. Colour is never the only signal: each tone pairs
 * with a badge glyph and the supplied label text.
 */
export const TONES = Object.freeze({
  sage: { rim: '#6F8F6B', arm: '#4E6B52', badge: '#4E6B52' },
  match: { rim: '#6F8F6B', arm: '#4E6B52', badge: '#3F6A47' },
  rust: { rim: '#B4502C', arm: '#8A3517', badge: '#9E3F1F' },
  amber: { rim: '#D39A2C', arm: '#93650F', badge: '#93650F' },
  mist: { rim: '#7A7480', arm: '#5E5964', badge: '#5E5964' },
  rest: { rim: '#9DB39A', arm: '#7C9479', badge: '#7C9479' }
});

/** state → tone */
export const STATE_TONE = Object.freeze({
  idle: 'sage',
  noticing: 'sage',
  checking: 'sage',
  warning: 'rust',
  uncertain: 'amber',
  identity_matched: 'match',
  error: 'mist',
  dismissed: 'rest'
});

/**
 * Map an incoming value to a known state. An unknown value renders the error
 * pose rather than a calm one, so a contract mismatch never looks reassuring.
 * @param {unknown} value
 * @returns {{state: PipState, known: boolean}}
 */
export function resolveState(value) {
  if (typeof value === 'string' && PIP_STATES.includes(/** @type {PipState} */ (value))) {
    return { state: /** @type {PipState} */ (value), known: true };
  }
  return { state: 'error', known: false };
}
