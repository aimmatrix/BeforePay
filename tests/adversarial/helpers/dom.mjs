/**
 * Minimal DOM for Node contract tests. Not a browser. Tracks innerHTML
 * assignment so XSS cases can fail without jsdom (CORE owns dependencies).
 */

function camelToData(key) {
  return `data-${String(key).replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}`;
}

function parseSelectorList(selector) {
  return String(selector)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchSimple(el, selector) {
  const raw = selector.trim();
  if (!raw || el.nodeType !== 1) return false;
  const re =
    /^([a-z][\w-]*)?(#[\w-]+)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i;
  const m = raw.match(re);
  if (!m) return false;
  const [, tag, id, classes, attrs] = m;
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  if (id && el.id !== id.slice(1)) return false;
  for (const cls of classes.match(/\.[\w-]+/g) || []) {
    if (!el.classList.contains(cls.slice(1))) return false;
  }
  for (const spec of attrs.match(/\[[^\]]+\]/g) || []) {
    const inner = spec.slice(1, -1);
    const eq = inner.match(/^([^\s=~|^$*]+)\s*=\s*(["']?)(.*)\2$/);
    if (eq) {
      const got = el.getAttribute(eq[1]);
      if (got !== eq[3]) return false;
    } else {
      const name = inner.trim();
      const attrVal = el.getAttribute(name);
      if (attrVal != null) {
        // presence selector matches an existing attribute
      } else if (name === 'hidden') {
        if (!el.hidden) return false;
      } else if (name === 'disabled') {
        if (!el.disabled) return false;
      } else {
        return false;
      }
    }
  }
  return true;
}

class TokenList {
  constructor(el) {
    this._el = el;
  }
  _parts() {
    return String(this._el.className || '')
      .split(/\s+/)
      .filter(Boolean);
  }
  contains(name) {
    return this._parts().includes(name);
  }
  add(name) {
    if (!this.contains(name)) this._el.className = [...this._parts(), name].join(' ');
  }
}

class TextNode {
  constructor(doc, data) {
    this.nodeType = 3;
    this.nodeName = '#text';
    this.ownerDocument = doc;
    this.parentNode = null;
    this.data = String(data);
  }
  get textContent() {
    return this.data;
  }
  set textContent(value) {
    this.data = String(value);
  }
  get innerHTML() {
    return this.data;
  }
  cloneNode() {
    return new TextNode(this.ownerDocument, this.data);
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
}

export class Element {
  constructor(doc, tag) {
    this.nodeType = 1;
    this.ownerDocument = doc;
    this.tagName = String(tag).toUpperCase();
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.style = {};
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.value = '';
    this._listeners = new Map();
    this.onclick = null;
    this.__innerHTMLAssigned = false;
    this.__innerHTMLValue = '';
    this.classList = new TokenList(this);
    const self = this;
    this.dataset = new Proxy(
      {},
      {
        get(_t, key) {
          if (typeof key !== 'string') return undefined;
          return self.getAttribute(camelToData(key));
        },
        set(_t, key, value) {
          if (typeof key !== 'string') return false;
          self.setAttribute(camelToData(key), String(value));
          return true;
        },
      }
    );
  }

  get id() {
    return this.getAttribute('id') || '';
  }
  set id(value) {
    this.setAttribute('id', value);
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }

  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }
  set textContent(value) {
    this.childNodes = [];
    this.__innerHTMLAssigned = false;
    this.__innerHTMLValue = '';
    const text = String(value ?? '');
    if (text) this.appendChild(new TextNode(this.ownerDocument, text));
  }

  get innerHTML() {
    if (this.__innerHTMLAssigned) return this.__innerHTMLValue;
    return this.childNodes
      .map((n) => (n.nodeType === 3 ? n.data : n.outerHTML || ''))
      .join('');
  }
  set innerHTML(value) {
    this.__innerHTMLAssigned = true;
    this.__innerHTMLValue = String(value);
    this.childNodes = [new TextNode(this.ownerDocument, String(value))];
  }

  get outerHTML() {
    return `<${this.tagName.toLowerCase()}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }

  getAttribute(name) {
    if (name === 'class') return this.className || null;
    const v = this.attributes.get(String(name).toLowerCase());
    return v == null ? null : v;
  }
  setAttribute(name, value) {
    const key = String(name).toLowerCase();
    this.attributes.set(key, String(value));
    if (key === 'class') this.className = String(value);
    if (key === 'id') this.attributes.set('id', String(value));
  }
  hasAttribute(name) {
    return this.getAttribute(name) != null;
  }
  removeAttribute(name) {
    const key = String(name).toLowerCase();
    this.attributes.delete(key);
    if (key === 'class') this.className = '';
  }
  get innerText() {
    return this.textContent;
  }
  set innerText(value) {
    this.textContent = value;
  }

  appendChild(node) {
    if (!node) return node;
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  append(...nodes) {
    for (const node of nodes) {
      if (typeof node === 'string') this.appendChild(new TextNode(this.ownerDocument, node));
      else this.appendChild(node);
    }
  }
  removeChild(node) {
    this.childNodes = this.childNodes.filter((n) => n !== node);
    node.parentNode = null;
    return node;
  }
  replaceChildren(...nodes) {
    this.childNodes = [];
    this.__innerHTMLAssigned = false;
    this.append(...nodes);
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  cloneNode(deep) {
    const copy = new Element(this.ownerDocument, this.tagName);
    copy.className = this.className;
    copy.hidden = this.hidden;
    copy.value = this.value;
    copy.tabIndex = this.tabIndex;
    for (const [k, v] of this.attributes) copy.attributes.set(k, v);
    Object.assign(copy.style, this.style);
    if (deep) {
      for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    }
    return copy;
  }
  matches(selector) {
    return parseSelectorList(selector).some((part) => matchSimple(this, part));
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes || []) {
        if (child.nodeType === 1) {
          if (child.matches(selector)) out.push(child);
          walk(child);
        }
      }
    };
    walk(this);
    return out;
  }
  addEventListener(type, fn) {
    const list = this._listeners.get(type) || [];
    list.push(fn);
    this._listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    const list = (this._listeners.get(type) || []).filter((h) => h !== fn);
    this._listeners.set(type, list);
  }
  dispatchEvent(event) {
    const ev = typeof event === 'string' ? { type: event } : event;
    for (const fn of this._listeners.get(ev.type) || []) fn(ev);
    if (ev.type === 'click' && typeof this.onclick === 'function') this.onclick(ev);
    return true;
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  getClientRects() {
    if (this.hidden || this.style.display === 'none' || this.style.visibility === 'hidden') {
      return [];
    }
    return [{ top: 0, left: 0, bottom: 10, right: 10, width: 10, height: 10 }];
  }
  click() {
    this.dispatchEvent({ type: 'click' });
  }
}

export class DocumentMock {
  constructor() {
    this.nodeType = 9;
    this._listeners = new Map();
    this.body = new Element(this, 'body');
    this.documentElement = new Element(this, 'html');
    this.documentElement.appendChild(this.body);
    this.defaultView = this;
    this.activeElement = this.body;
  }
  createElement(tag) {
    const el = new Element(this, tag);
    return el;
  }
  createElementNS(_ns, tag) {
    return this.createElement(tag);
  }
  createTextNode(data) {
    return new TextNode(this, data);
  }
  querySelector(selector) {
    return this.documentElement.querySelector(selector);
  }
  querySelectorAll(selector) {
    return this.documentElement.querySelectorAll(selector);
  }
  addEventListener(type, fn) {
    const list = this._listeners.get(type) || [];
    list.push(fn);
    this._listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    const list = (this._listeners.get(type) || []).filter((h) => h !== fn);
    this._listeners.set(type, list);
  }
  dispatchEvent(event) {
    const ev = typeof event === 'string' ? { type: event } : event;
    for (const fn of this._listeners.get(ev.type) || []) fn(ev);
    return true;
  }
}

export function installDom(target = globalThis) {
  const doc = new DocumentMock();
  target.document = doc;
  target.HTMLElement = Element;
  target.Element = Element;
  target.Node = Element;
  target.getComputedStyle = (el) => ({
    visibility: el?.style?.visibility || (el?.hidden ? 'hidden' : 'visible'),
    display: el?.style?.display || 'block',
  });
  return doc;
}

export function walkElements(root, visit) {
  visit(root);
  for (const child of root.childNodes || []) {
    if (child.nodeType === 1) walkElements(child, visit);
  }
}

export function assignedInnerHTML(root) {
  const hits = [];
  walkElements(root, (el) => {
    if (el.__innerHTMLAssigned) hits.push(el.__innerHTMLValue);
  });
  return hits;
}

export function collectedHrefs(root) {
  const hrefs = [];
  walkElements(root, (el) => {
    const href = el.getAttribute?.('href');
    if (href) hrefs.push(href);
  });
  return hrefs;
}
