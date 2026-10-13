/**
 * Pip, BeforePay's animated checkout companion. PIP owns this module.
 * Renders a supplied PipView (contract v1). Pip reads no page content, uses no
 * Chrome APIs and never decides whether a store is trustworthy: CORE maps the
 * Assessment to a state, label and message, and Pip shows exactly that.
 */

import { buildBadgeIcon, buildFigure } from './figure.js';
import { PIP_CSS } from './styles.js';
import { PIP_STATES, resolveState } from './states.js';

export { PIP_STATES };

function el(doc, tag, attrs = {}) {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** Text-only setter that skips no-op writes (keeps update() idempotent). */
function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function setAttr(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function setHidden(node, hidden) {
  if (Boolean(node.hidden) !== hidden) node.hidden = hidden;
}

/**
 * @param {HTMLElement} container
 * @param {{onOpen?: () => void, onDismiss?: () => void, reducedMotion?: boolean}} [options]
 * @returns {{update(view: {state: string, label: string, message: string, expanded: boolean}): void, destroy(): void}}
 */
export function mountPip(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('mountPip requires a container element');
  }
  const doc = container.ownerDocument || globalThis.document;
  const onOpen = typeof options.onOpen === 'function' ? options.onOpen : () => {};
  const onDismiss = typeof options.onDismiss === 'function' ? options.onDismiss : () => {};

  const style = el(doc, 'style', { 'data-bp-pip': 'css' });
  style.textContent = PIP_CSS;

  const root = el(doc, 'div', {
    class: 'bp-pip',
    'data-state': 'idle',
    'data-still': options.reducedMotion === true ? 'true' : 'false'
  });

  const figure = el(doc, 'button', {
    type: 'button',
    class: 'bp-pip__figure',
    'aria-label': 'Pip',
    'aria-expanded': 'false'
  });
  figure.appendChild(buildFigure(doc));

  const bubble = el(doc, 'div', { class: 'bp-pip__bubble' });
  const head = el(doc, 'div', { class: 'bp-pip__head' });
  const label = el(doc, 'p', { class: 'bp-pip__label' });
  head.appendChild(buildBadgeIcon(doc));
  head.appendChild(label);
  const message = el(doc, 'p', { class: 'bp-pip__message' });
  const actions = el(doc, 'div', { class: 'bp-pip__actions' });
  const hide = el(doc, 'button', { type: 'button', class: 'bp-pip__hide', 'aria-label': 'Hide Pip' });
  hide.textContent = 'Hide';
  actions.appendChild(hide);
  bubble.appendChild(head);
  bubble.appendChild(message);
  bubble.appendChild(actions);
  bubble.hidden = true;
  hide.hidden = true;

  const live = el(doc, 'span', { class: 'bp-pip__live', 'aria-live': 'polite' });

  // Figure first in DOM order so it is the first focus stop; row-reverse
  // places the bubble visually to its left.
  root.appendChild(figure);
  root.appendChild(bubble);
  root.appendChild(live);
  container.appendChild(style);
  container.appendChild(root);

  let destroyed = false;
  let warned = false;
  /** @type {{state: string, label: string, message: string, expanded: boolean} | null} */
  let last = null;

  const handleOpen = () => {
    if (!destroyed) onOpen();
  };
  const handleHide = () => {
    if (!destroyed) onDismiss();
  };
  const handleKeydown = (event) => {
    if (destroyed || !event || (event.key !== 'Escape' && event.key !== 'Esc')) return;
    // Only while the bubble is showing; when the panel is open it owns Escape.
    if (!bubble.hidden) onDismiss();
  };
  figure.addEventListener('click', handleOpen);
  hide.addEventListener('click', handleHide);
  root.addEventListener('keydown', handleKeydown);

  function update(view) {
    if (destroyed || !view || typeof view !== 'object') return;
    const resolved = resolveState(view.state);
    if (!resolved.known && !warned) {
      warned = true;
      globalThis.console?.warn?.(`[Pip] Unknown PipView state ${JSON.stringify(view.state)}; showing the error pose.`);
    }
    const next = {
      state: resolved.state,
      label: typeof view.label === 'string' ? view.label : '',
      message: typeof view.message === 'string' ? view.message : '',
      expanded: view.expanded === true
    };
    if (
      last &&
      last.state === next.state &&
      last.label === next.label &&
      last.message === next.message &&
      last.expanded === next.expanded
    ) {
      return;
    }
    const stateChanged = !last || last.state !== next.state;
    const dismissed = next.state === 'dismissed';

    setAttr(root, 'data-state', next.state);
    setHidden(root, dismissed);
    setHidden(figure, dismissed);

    setText(label, next.label);
    setText(message, next.message);
    setHidden(message, next.message === '');
    setAttr(figure, 'aria-label', next.label ? `Pip: ${next.label}` : 'Pip');
    setAttr(figure, 'aria-expanded', next.expanded ? 'true' : 'false');

    // The bubble is the collapsed summary; once CORE opens the panel
    // (expanded) the panel carries the detail, so the bubble steps aside.
    const showBubble = !dismissed && !next.expanded && (next.label !== '' || next.message !== '');
    setHidden(bubble, !showBubble);
    setHidden(hide, !showBubble);

    if (stateChanged && last) setText(live, dismissed || !next.label ? '' : next.label);
    last = next;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    figure.removeEventListener('click', handleOpen);
    hide.removeEventListener('click', handleHide);
    root.removeEventListener('keydown', handleKeydown);
    root.remove();
    style.remove();
  }

  return { update, destroy };
}
