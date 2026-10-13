/**
 * Minimal DOM for mountPanel tests. Not a browser.
 */

class AttrMap {
  constructor() {
    this._map = new Map();
  }
  set(name, value) {
    this._map.set(String(name), String(value));
  }
  get(name) {
    return this._map.has(String(name)) ? this._map.get(String(name)) : null;
  }
  has(name) {
    return this._map.has(String(name));
  }
  delete(name) {
    this._map.delete(String(name));
  }
  entries() {
    return this._map.entries();
  }
}

class ClassList {
  constructor(el) {
    this._el = el;
    this._set = new Set();
  }
  _sync() {
    this._el._className = [...this._set].join(' ');
  }
  add(...names) {
    for (const name of names) if (name) this._set.add(name);
    this._sync();
  }
  remove(...names) {
    for (const name of names) this._set.delete(name);
    this._sync();
  }
  contains(name) {
    return this._set.has(name);
  }
  toString() {
    return [...this._set].join(' ');
  }
}

function parseSelector(selector) {
  const parts = [];
  const re = /([.#][\w-]+)|\[([^\]]+)\]|(\w+)/g;
  let match;
  while ((match = re.exec(selector))) {
    if (match[1]) {
      if (match[1][0] === '.') parts.push({ type: 'class', value: match[1].slice(1) });
      else parts.push({ type: 'id', value: match[1].slice(1) });
    } else if (match[2]) {
      const attr = match[2];
      const eq = attr.indexOf('=');
      if (eq === -1) parts.push({ type: 'attr', name: attr, value: null });
      else {
        const name = attr.slice(0, eq);
        const raw = attr.slice(eq + 1).replace(/^["']|["']$/g, '');
        parts.push({ type: 'attr', name, value: raw });
      }
    } else if (match[3]) {
      parts.push({ type: 'tag', value: match[3].toLowerCase() });
    }
  }
  return parts;
}

function matches(el, selector) {
  const simple = selector.trim();
  if (simple.includes(' ')) {
    return false;
  }
  const parts = parseSelector(simple);
  if (!parts.length) return false;
  for (const part of parts) {
    if (part.type === 'tag' && el.tagName.toLowerCase() !== part.value) return false;
    if (part.type === 'class' && !el.classList.contains(part.value)) return false;
    if (part.type === 'id' && el.id !== part.value) return false;
    if (part.type === 'attr') {
      const actual = el.getAttribute(part.name);
      if (part.value == null) {
        if (actual == null) return false;
      } else if (actual !== part.value) return false;
    }
  }
  return true;
}

class ShimNode {
  constructor() {
    this.childNodes = [];
    this.parentNode = null;
    this.nodeType = 1;
    this.ownerDocument = null;
  }
  get firstChild() {
    return this.childNodes[0] || null;
  }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    node.ownerDocument = this.ownerDocument;
    this.childNodes.push(node);
    return node;
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) {
      this.childNodes.splice(i, 1);
      node.parentNode = null;
    }
    return node;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
}

class ShimText extends ShimNode {
  constructor(text) {
    super();
    this.nodeType = 3;
    this._text = String(text);
  }
  get textContent() {
    return this._text;
  }
  set textContent(value) {
    this._text = String(value);
  }
}

class ShimElement extends ShimNode {
  constructor(tag, ns) {
    super();
    this.tagName = String(tag).toUpperCase();
    this.namespaceURI = ns || 'http://www.w3.org/1999/xhtml';
    this.attributes = new AttrMap();
    this.classList = new ClassList(this);
    this._className = '';
    this._listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = -1;
    this.style = {};
    this.dataset = {};
    this._focused = false;
    const self = this;
    this.dataset = new Proxy(
      {},
      {
        set(_, prop, value) {
          const attr = 'data-' + String(prop).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
          self.setAttribute(attr, value);
          return true;
        },
        get(_, prop) {
          const attr = 'data-' + String(prop).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
          return self.getAttribute(attr);
        }
      }
    );
  }
  get className() {
    return this._className;
  }
  set className(value) {
    this._className = String(value);
    this.classList._set = new Set(String(value).split(/\s+/).filter(Boolean));
    this.setAttribute('class', this._className);
  }
  get id() {
    return this.getAttribute('id') || '';
  }
  set id(value) {
    this.setAttribute('id', value);
  }
  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }
  set textContent(value) {
    this.childNodes = [];
    const text = new ShimText(value == null ? '' : String(value));
    text.ownerDocument = this.ownerDocument;
    text.parentNode = this;
    this.childNodes.push(text);
  }
  get innerHTML() {
    if (this._rawHtml) return this._rawHtml;
    return this.textContent;
  }
  set innerHTML(value) {
    this._rawHtml = String(value);
    this.textContent = value;
  }
  setAttribute(name, value) {
    const key = String(name);
    this.attributes.set(key, value);
    if (key === 'class') {
      this._className = String(value);
      this.classList._set = new Set(String(value).split(/\s+/).filter(Boolean));
    }
    if (key === 'hidden') this.hidden = true;
    if (key === 'disabled') this.disabled = true;
    if (key.startsWith('data-')) {
      const prop = key
        .slice(5)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      // dataset proxy reads attributes; no extra store required
      void prop;
    }
  }
  getAttribute(name) {
    if (String(name) === 'class') return this._className || null;
    return this.attributes.get(name);
  }
  hasAttribute(name) {
    if (String(name) === 'class') return Boolean(this._className);
    return this.attributes.has(name);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (String(name) === 'hidden') this.hidden = false;
    if (String(name) === 'disabled') this.disabled = false;
  }
  addEventListener(type, fn) {
    const list = this._listeners.get(type) || [];
    list.push(fn);
    this._listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    const list = this._listeners.get(type) || [];
    this._listeners.set(
      type,
      list.filter((item) => item !== fn)
    );
  }
  dispatchEvent(event) {
    const list = this._listeners.get(event.type) || [];
    for (const fn of list) fn(event);
    return true;
  }
  click() {
    if (this.disabled) return;
    this.dispatchEvent({ type: 'click', target: this, key: undefined });
  }
  focus() {
    this._focused = true;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.childNodes || []) {
        if (child.nodeType !== 1) continue;
        if (matchesSimple(child, selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
}

function matchesSimple(el, selector) {
  const chain = selector
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (chain.length === 1) return matches(el, chain[0]);
  // descendant: last token must match el, ancestors must match earlier tokens in order
  if (!matches(el, chain[chain.length - 1])) return false;
  let current = el.parentNode;
  let tokenIndex = chain.length - 2;
  while (current && current.nodeType === 1 && tokenIndex >= 0) {
    if (matches(current, chain[tokenIndex])) tokenIndex -= 1;
    current = current.parentNode;
  }
  return tokenIndex < 0;
}

export function createTestDocument() {
  const listeners = new Map();
  const document = {
    activeElement: null,
    createElement(tag) {
      const el = new ShimElement(tag);
      el.ownerDocument = document;
      return el;
    },
    createElementNS(ns, tag) {
      const el = new ShimElement(tag, ns);
      el.ownerDocument = document;
      return el;
    },
    createTextNode(text) {
      const node = new ShimText(text);
      node.ownerDocument = document;
      return node;
    },
    addEventListener(type, fn) {
      const list = listeners.get(type) || [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(
        type,
        list.filter((item) => item !== fn)
      );
    },
    dispatchEvent(event) {
      const list = listeners.get(event.type) || [];
      for (const fn of list) fn(event);
      return true;
    }
  };
  const body = document.createElement('body');
  document.body = body;
  const container = document.createElement('div');
  body.appendChild(container);
  return { document, container };
}

export { ShimElement };
