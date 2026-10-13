/**
 * BeforePay evidence panel. C2 owns this module.
 * Renders a supplied Assessment; does not decide risk or talk to Chrome.
 */

import { createPanelDom, renderPanel } from './render.js';
import { PANEL_CSS } from './styles.js';
import { el } from './safe.js';

/**
 * @param {HTMLElement} container
 * @param {{onRescan?: () => void, onDismiss?: () => void}} [options]
 * @returns {{update: Function, setOpen: Function, destroy: Function}}
 */
export function mountPanel(container, options = {}) {
  if (!container) throw new Error('mountPanel requires a container element');
  const doc = container.ownerDocument || globalThis.document;
  const onRescan = typeof options.onRescan === 'function' ? options.onRescan : () => {};
  const onDismiss = typeof options.onDismiss === 'function' ? options.onDismiss : () => {};

  const style = el(doc, 'style', { 'data-bp-panel': 'css' });
  style.textContent = PANEL_CSS;
  container.appendChild(style);

  const dom = createPanelDom(
    doc,
    () => onRescan(),
    () => onDismiss()
  );
  container.appendChild(dom.root);

  let open = false;
  /** @type {object|null} */
  let assessment = null;
  /** @type {string} */
  let phase = 'idle';
  let destroyed = false;

  function handleKeydown(event) {
    if (destroyed || !open) return;
    if (event.key === 'Escape' || event.key === 'Esc') {
      onDismiss();
    }
  }

  doc.addEventListener('keydown', handleKeydown);

  function paint() {
    if (destroyed) return;
    renderPanel(dom, assessment, phase);
  }

  paint();

  return {
    /**
     * @param {object|null} nextAssessment
     * @param {'idle'|'checking'|'complete'|'error'} nextPhase
     */
    update(nextAssessment, nextPhase) {
      if (destroyed) return;
      assessment = nextAssessment;
      phase = nextPhase || 'idle';
      paint();
    },
    /**
     * @param {boolean} nextOpen
     */
    setOpen(nextOpen) {
      if (destroyed) return;
      open = Boolean(nextOpen);
      dom.root.dataset.open = open ? 'true' : 'false';
      dom.root.setAttribute('data-open', open ? 'true' : 'false');
      dom.root.hidden = !open;
      dom.root.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        const heading = dom.root.querySelector('.bp-headline');
        if (heading) {
          heading.tabIndex = -1;
          if (typeof heading.focus === 'function') heading.focus();
        }
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doc.removeEventListener('keydown', handleKeydown);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (dom.root.parentNode) dom.root.parentNode.removeChild(dom.root);
    }
  };
}

export { viewFrom } from './view.js';
export { groupEvidence } from './group.js';
export { sanitizeUrl, setText } from './safe.js';
export default mountPanel;
