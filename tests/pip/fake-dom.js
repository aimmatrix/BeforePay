/**
 * Minimal DOM for Pip tests. Not a browser: no layout, no CSS, no parsing.
 * Counts mutations and focus() calls, and throws on innerHTML so tests can
 * prove Pip only uses text and DOM calls.
 */

class FakeText {
  constructor(doc, data) {
    this.ownerDocument = doc;
    this.nodeType = 3;
    this.data = String(data);
    this.parentNode = null;
  }
  get textContent() {
    return this.data;
  }
}

export class FakeElement {
  constructor(doc, tag, ns = null) {
    this.ownerDocument = doc;
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.localName = String(tag).toLowerCase();
    this.namespaceURI = ns;
    this.childNodes = [];
    this.parentNode = null;
    this._attrs = new Map();
    this._listeners = new Map();
    this._hidden = false;
  }
  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }
  get hidden() {
    return this._hidden;
  }
  set hidden(value) {
    this._hidden = Boolean(value);
    this.ownerDocument.mutations++;
  }
  get className() {
    return this.getAttribute('class') || '';
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }
  set textContent(value) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = value === '' || value == null ? [] : [new FakeText(this.ownerDocument, value)];
    this.childNodes.forEach((n) => (n.parentNode = this));
    this.ownerDocument.mutations++;
  }
  set innerHTML(_value) {
    throw new Error('innerHTML is not allowed in Pip');
  }
  get innerHTML() {
    throw new Error('innerHTML is not allowed in Pip');
  }
  setAttribute(name, value) {
    this._attrs.set(String(name), String(value));
    this.ownerDocument.mutations++;
  }
  getAttribute(name) {
    return this._attrs.has(String(name)) ? this._attrs.get(String(name)) : null;
  }
  hasAttribute(name) {
    return this._attrs.has(String(name));
  }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    this.ownerDocument.mutations++;
    return node;
  }
  removeChild(node) {
    this.childNodes = this.childNodes.filter((n) => n !== node);
    node.parentNode = null;
    this.ownerDocument.mutations++;
    return node;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  addEventListener(type, fn) {
    const list = this._listeners.get(type) || [];
    list.push(fn);
    this._listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    this._listeners.set(type, (this._listeners.get(type) || []).filter((f) => f !== fn));
  }
  listenerCount() {
    let count = 0;
    for (const list of this._listeners.values()) count += list.length;
    return count;
  }
  dispatchEvent(event) {
    const ev = { bubbles: true, ...event, target: event.target || this };
    for (const fn of [...(this._listeners.get(ev.type) || [])]) fn(ev);
    if (ev.bubbles && this.parentNode && this.parentNode.dispatchEvent) this.parentNode.dispatchEvent(ev);
    return true;
  }
  click() {
    this.dispatchEvent({ type: 'click' });
  }
  focus() {
    this.ownerDocument.focusCalls++;
  }
  /** Is this element, or any ancestor, hidden? */
  isEffectivelyHidden() {
    for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (n.hidden) return true;
    return false;
  }
  matches(selector) {
    return selector.split(',').some((part) => matchCompound(this, part.trim()));
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

/** Supports tag, .class, [attr], [attr="v"], [attr~="v"] in one compound. */
function matchCompound(el, selector) {
  const re = /([a-zA-Z][\w-]*)|\.([\w-]+)|\[([\w-]+)(?:(~?=)"([^"]*)")?\]/g;
  let m;
  let consumed = '';
  while ((m = re.exec(selector))) {
    consumed += m[0];
    if (m[1] && el.localName !== m[1].toLowerCase()) return false;
    if (m[2] && !el.className.split(/\s+/).includes(m[2])) return false;
    if (m[3]) {
      const value = el.getAttribute(m[3]);
      if (value === null) return false;
      if (m[4] === '=' && value !== m[5]) return false;
      if (m[4] === '~=' && !value.split(/\s+/).includes(m[5])) return false;
    }
  }
  if (consumed !== selector) throw new Error(`Unsupported selector in fake DOM: ${selector}`);
  return true;
}

export class FakeDocument {
  constructor() {
    this.mutations = 0;
    this.focusCalls = 0;
    this.body = new FakeElement(this, 'body');
  }
  createElement(tag) {
    return new FakeElement(this, tag, 'http://www.w3.org/1999/xhtml');
  }
  createElementNS(ns, tag) {
    return new FakeElement(this, tag, ns);
  }
  createTextNode(data) {
    return new FakeText(this, data);
  }
}

export function createTestDocument() {
  const document = new FakeDocument();
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { document, container };
}
