/**
 * Untrusted merchant and assessment strings must never become HTML or script.
 */

/**
 * @param {Element} el
 * @param {unknown} value
 */
export function setText(el, value) {
  el.textContent = value == null ? '' : String(value);
}

/**
 * Allow only http(s) URLs. javascript:, data:, blob:, and relative junk stay inert.
 * @param {unknown} raw
 * @returns {string|null}
 */
export function sanitizeUrl(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * @param {Document} doc
 * @param {ParentNode} parent
 * @param {unknown} href
 * @param {string} label
 * @returns {HTMLAnchorElement|HTMLSpanElement}
 */
export function appendSafeLink(doc, parent, href, label) {
  const safe = sanitizeUrl(href);
  if (!safe) {
    const span = doc.createElement('span');
    setText(span, label);
    parent.appendChild(span);
    return span;
  }
  const a = doc.createElement('a');
  a.setAttribute('href', safe);
  a.setAttribute('rel', 'noopener noreferrer');
  a.setAttribute('target', '_blank');
  a.setAttribute('referrerpolicy', 'no-referrer');
  setText(a, label);
  a.addEventListener('click', () => {
    a.rel = 'noopener noreferrer';
  });
  parent.appendChild(a);
  return a;
}

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {Record<string, string|boolean|number|null|undefined>} [attrs]
 * @returns {HTMLElement}
 */
export function el(doc, tag, attrs = {}) {
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'className') node.className = String(value);
    else if (key === 'text') setText(node, value);
    else if (key === 'hidden') node.hidden = Boolean(value);
    else if (key === 'disabled' && 'disabled' in node) node.disabled = Boolean(value);
    else if (key === 'tabIndex') node.tabIndex = Number(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  return node;
}

/**
 * @param {Element} node
 */
export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
