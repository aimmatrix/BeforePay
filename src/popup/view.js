/**
 * Pure mapping from PopupState to labels, visibility, and banners.
 * Automatic checks appear enabled only when siteAccess is granted.
 */

import * as copy from './copy.js';

/**
 * @returns {import('./types.js').PopupState}
 */
export function defaultPopupState() {
  return {
    supported: false,
    originLabel: '',
    siteAccess: 'manual',
    motion: 'system',
    busy: false,
    error: null
  };
}

/**
 * @param {unknown} state
 * @returns {import('./types.js').PopupState}
 */
export function normalizePopupState(state) {
  const base = defaultPopupState();
  if (!state || typeof state !== 'object') return base;
  const value = /** @type {Record<string, unknown>} */ (state);
  const error = typeof value.error === 'string' && value.error.trim() ? value.error.trim() : null;
  return {
    supported: Boolean(value.supported),
    originLabel: typeof value.originLabel === 'string' ? value.originLabel : '',
    siteAccess: value.siteAccess === 'granted' ? 'granted' : 'manual',
    motion: value.motion === 'reduced' ? 'reduced' : 'system',
    busy: Boolean(value.busy),
    error
  };
}

/**
 * @param {unknown} state
 * @param {{ actionMessage?: string|null, busyLock?: boolean, hostAccessImplemented?: boolean }} [extras]
 * @returns {import('./types.js').PopupView}
 */
export function derivePopupView(state, extras = {}) {
  const normalized = normalizePopupState(state);
  const originRaw = normalized.originLabel.trim();
  const originText = originRaw || copy.ORIGIN_FALLBACK;
  const error = normalized.error;
  const loading =
    !normalized.supported &&
    !error &&
    (!originRaw || /loading/i.test(originRaw));
  const busy = normalized.busy || Boolean(extras.busyLock);
  const hostAccessImplemented = extras.hostAccessImplemented !== false;
  const autoChecksEnabled = normalized.siteAccess === 'granted';
  const actionMessage =
    typeof extras.actionMessage === 'string' && extras.actionMessage.trim()
      ? extras.actionMessage.trim()
      : null;

  /** @type {import('./types.js').PopupBanner|null} */
  let banner = null;
  if (loading) {
    banner = { kind: 'loading', title: copy.LOADING_TITLE, body: copy.LOADING_BODY };
  } else if (!normalized.supported) {
    banner = { kind: 'unsupported', title: copy.UNSUPPORTED_TITLE, body: copy.UNSUPPORTED_BODY };
  } else if (error) {
    banner = { kind: 'error', title: copy.ERROR_TITLE, body: error };
  } else if (actionMessage) {
    banner = { kind: 'info', title: '', body: actionMessage };
  }

  return {
    originText,
    accessCaption: autoChecksEnabled ? copy.ACCESS_GRANTED : copy.ACCESS_MANUAL,
    siteAccess: normalized.siteAccess,
    autoChecksEnabled,
    accessChip: autoChecksEnabled ? copy.CHIP_AUTO_ON : copy.CHIP_TAB_ONLY,
    showScan: normalized.supported,
    scanDisabled: busy || !normalized.supported,
    scanLabel: busy && normalized.supported ? copy.SCANNING : copy.SCAN,
    showRequestAccess:
      hostAccessImplemented && normalized.supported && normalized.siteAccess === 'manual',
    requestDisabled: busy,
    showRemoveAccess: hostAccessImplemented && normalized.siteAccess === 'granted',
    removeDisabled: busy,
    motion: normalized.motion,
    motionDisabled: busy,
    loading,
    banner
  };
}
