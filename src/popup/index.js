/**
 * BeforePay extension popup. Presentation only; CORE owns Chrome, persistence, and HTML.
 */

import * as copy from './copy.js';
import { POPUP_CSS } from './styles.js';
import { derivePopupView, normalizePopupState } from './view.js';

/**
 * @param {HTMLElement} parent
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @returns {HTMLElement}
 */
function add(parent, tag, attrs = {}) {
  const doc = parent.ownerDocument || globalThis.document;
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  parent.appendChild(node);
  return node;
}

/**
 * @param {HTMLElement} node
 * @param {boolean} hidden
 */
function setHidden(node, hidden) {
  node.hidden = hidden;
  if (hidden) node.setAttribute('hidden', '');
  else node.removeAttribute('hidden');
}

/**
 * @param {HTMLElement} container
 * @param {import('./types.js').PopupOptions} [options]
 * @returns {import('./types.js').PopupController}
 */
export function mountPopup(container, options = {}) {
  if (!container) throw new Error('mountPopup requires a container');
  const doc = container.ownerDocument || globalThis.document;
  const onAction =
    typeof options.onAction === 'function'
      ? options.onAction
      : async () => ({
          ok: false,
          state: current,
          message: copy.MISSING_HANDLER
        });

  let current = normalizePopupState({
    supported: false,
    originLabel: 'Loading current tab…',
    siteAccess: 'manual',
    motion: 'system',
    busy: false,
    error: null
  });
  let actionMessage = null;
  let inflight = false;
  let destroyed = false;

  const style = doc.createElement('style');
  style.setAttribute('data-bp-popup', 'styles');
  style.textContent = POPUP_CSS;

  const root = doc.createElement('div');
  root.className = 'bp-popup';
  root.setAttribute('data-bp-popup', 'root');

  const header = add(root, 'header', { className: 'bp-popup-header' });
  add(header, 'h1', { className: 'bp-popup-title', text: copy.TITLE });
  add(header, 'p', { className: 'bp-popup-tagline', text: copy.TAGLINE });

  const site = add(root, 'section', {
    className: 'bp-popup-site',
    'aria-labelledby': 'bp-popup-site-heading'
  });
  add(site, 'h2', {
    id: 'bp-popup-site-heading',
    className: 'bp-popup-kicker',
    text: copy.SITE_HEADING
  });
  const originEl = add(site, 'p', { className: 'bp-popup-origin' });
  const accessEl = add(site, 'p', { className: 'bp-popup-access' });
  const chipEl = add(site, 'span', { className: 'bp-popup-chip' });

  const bannerEl = add(root, 'div', {
    className: 'bp-popup-banner',
    role: 'status'
  });
  const bannerTitle = add(bannerEl, 'p', { className: 'bp-popup-banner-title' });
  const bannerBody = add(bannerEl, 'p', { className: 'bp-popup-banner-body' });

  const actions = add(root, 'div', { className: 'bp-popup-actions' });
  const scanBtn = add(actions, 'button', {
    className: 'bp-popup-scan',
    type: 'button',
    'data-action': 'SCAN_ACTIVE_TAB'
  });
  const requestBtn = add(actions, 'button', {
    className: 'bp-popup-secondary',
    type: 'button',
    'data-action': 'REQUEST_SITE_ACCESS',
    text: copy.REQUEST_ACCESS
  });
  const removeBtn = add(actions, 'button', {
    className: 'bp-popup-secondary',
    type: 'button',
    'data-action': 'REMOVE_SITE_ACCESS',
    text: copy.REMOVE_ACCESS
  });

  const motion = add(root, 'fieldset', { className: 'bp-popup-motion' });
  add(motion, 'legend', { text: copy.MOTION_LEGEND });
  const motionRow = add(motion, 'div', { className: 'bp-popup-motion-row' });

  const systemLabel = add(motionRow, 'label', { 'data-motion': 'system' });
  const systemRadio = add(systemLabel, 'input', {
    type: 'radio',
    name: 'bp-motion',
    value: 'system'
  });
  add(systemLabel, 'span', { text: copy.MOTION_SYSTEM });

  const reducedLabel = add(motionRow, 'label', { 'data-motion': 'reduced' });
  const reducedRadio = add(reducedLabel, 'input', {
    type: 'radio',
    name: 'bp-motion',
    value: 'reduced'
  });
  add(reducedLabel, 'span', { text: copy.MOTION_REDUCED });

  container.appendChild(style);
  container.appendChild(root);

  function paint() {
    const view = derivePopupView(current, {
      actionMessage,
      busyLock: inflight
    });
    root.dataset.motion = view.motion;
    root.dataset.access = view.siteAccess;
    originEl.textContent = view.originText;
    accessEl.textContent = view.accessCaption;
    chipEl.textContent = view.accessChip;
    chipEl.dataset.on = view.autoChecksEnabled ? 'true' : 'false';

    if (view.banner) {
      setHidden(bannerEl, false);
      bannerEl.dataset.kind = view.banner.kind;
      bannerEl.setAttribute('role', view.banner.kind === 'error' ? 'alert' : 'status');
      bannerTitle.textContent = view.banner.title;
      setHidden(bannerTitle, !view.banner.title);
      bannerBody.textContent = view.banner.body;
    } else {
      setHidden(bannerEl, true);
      bannerEl.removeAttribute('data-kind');
      bannerTitle.textContent = '';
      bannerBody.textContent = '';
    }

    scanBtn.textContent = view.scanLabel;
    scanBtn.disabled = view.scanDisabled;
    setHidden(scanBtn, !view.showScan);

    requestBtn.disabled = view.requestDisabled;
    setHidden(requestBtn, !view.showRequestAccess);

    removeBtn.disabled = view.removeDisabled;
    setHidden(removeBtn, !view.showRemoveAccess);

    systemRadio.checked = view.motion === 'system';
    reducedRadio.checked = view.motion === 'reduced';
    systemRadio.disabled = view.motionDisabled;
    reducedRadio.disabled = view.motionDisabled;
    systemLabel.dataset.active = view.motion === 'system' ? 'true' : 'false';
    reducedLabel.dataset.active = view.motion === 'reduced' ? 'true' : 'false';
    systemLabel.dataset.disabled = view.motionDisabled ? 'true' : 'false';
    reducedLabel.dataset.disabled = view.motionDisabled ? 'true' : 'false';
  }

  /**
   * @param {unknown} reply
   */
  function applyReply(reply) {
    if (!reply || typeof reply !== 'object') {
      actionMessage = copy.ACTION_FAILED;
      return;
    }
    const value = /** @type {Record<string, unknown>} */ (reply);
    if (value.state) current = normalizePopupState(value.state);
    const msg = typeof value.message === 'string' && value.message.trim() ? value.message.trim() : null;
    if (current.error && msg && msg === current.error) {
      actionMessage = null;
      return;
    }
    actionMessage = msg;
  }

  /**
   * @param {import('./types.js').PopupAction} action
   */
  async function dispatch(action) {
    if (destroyed || inflight) return;
    inflight = true;
    paint();
    try {
      const reply = await onAction(action);
      if (destroyed) return;
      applyReply(reply);
    } catch {
      if (destroyed) return;
      actionMessage = copy.ACTION_FAILED;
    } finally {
      inflight = false;
      if (!destroyed) paint();
    }
  }

  scanBtn.addEventListener('click', () => {
    dispatch({ type: 'SCAN_ACTIVE_TAB' });
  });
  requestBtn.addEventListener('click', () => {
    dispatch({ type: 'REQUEST_SITE_ACCESS' });
  });
  removeBtn.addEventListener('click', () => {
    dispatch({ type: 'REMOVE_SITE_ACCESS' });
  });
  systemRadio.addEventListener('change', () => {
    if (systemRadio.checked) dispatch({ type: 'SET_MOTION', value: 'system' });
  });
  reducedRadio.addEventListener('change', () => {
    if (reducedRadio.checked) dispatch({ type: 'SET_MOTION', value: 'reduced' });
  });

  /**
   * @param {import('./types.js').PopupState} state
   */
  function update(state) {
    if (destroyed) return;
    current = normalizePopupState(state);
    actionMessage = null;
    paint();
  }

  function destroy() {
    destroyed = true;
    inflight = false;
    if (style.parentNode) style.parentNode.removeChild(style);
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  paint();
  return { update, destroy };
}
