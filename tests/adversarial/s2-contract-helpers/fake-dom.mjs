/**
 * Minimal, dependency-free DOM used only by the adversarial tests.
 *
 * It is deliberately *truthful* about what matters for these tests:
 *  - `innerHTML` is parsed into real element nodes (so a hostile string that reaches
 *    innerHTML shows up as <script>/<img onerror> nodes the tests can detect);
 *  - `textContent` setters replace children with ONE text node and never create elements;
 *  - nothing is ever executed.
 * Selector support: comma lists of compounds made of tag, #id, .class, [attr], [attr=value].
 */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style']);

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

class TextNode {
  constructor(data, doc) {
    this.nodeType = 3;
    this.data = String(data);
    this.parentNode = null;
    this.ownerDocument = doc;
  }
  get textContent() { return this.data; }
  set textContent(value) { this.data = String(value); }
  cloneNode() { return new TextNode(this.data, this.ownerDocument); }
}

function parseSelector(selector) {
  return selector.split(',').map((part) => {
    const text = part.trim();
    if (!text || /[\s>+~]/.test(text.replace(/\[[^\]]*\]/g, ''))) {
      throw new Error(`fake-dom: unsupported selector "${selector}"`);
    }
    const compound = { tag: null, id: null, classes: [], attrs: [] };
    let rest = text;
    const tagMatch = /^(?:[a-zA-Z][\w-]*|\*)/.exec(rest);
    if (tagMatch) { compound.tag = tagMatch[0] === '*' ? null : tagMatch[0].toLowerCase(); rest = rest.slice(tagMatch[0].length); }
    const re = /#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/y;
    while (rest) {
      re.lastIndex = 0;
      const m = re.exec(rest);
      if (!m || m.index !== 0) throw new Error(`fake-dom: unsupported selector "${selector}"`);
      if (m[1]) compound.id = m[1];
      else if (m[2]) compound.classes.push(m[2]);
      else compound.attrs.push({ name: m[3].toLowerCase(), value: m[4] ?? m[5] ?? m[6] ?? null });
      rest = rest.slice(m[0].length);
    }
    return compound;
  });
}

class Element {
  constructor(tagName, doc, namespace = null) {
    this.nodeType = 1;
    this.tagName = namespace ? tagName : tagName.toUpperCase();
    this.localName = tagName.toLowerCase();
    this.namespaceURI = namespace;
    this.ownerDocument = doc;
    this.parentNode = null;
    this.childNodes = [];
    this._attrs = new Map();
    this._listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.onclick = null;
    this.rel = '';
    this.style = { cssText: '' };
    this.dataset = {};
  }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] ?? null; }
  get className() { return this._attrs.get('class') ?? ''; }
  set className(v) { this._attrs.set('class', String(v)); }
  get id() { return this._attrs.get('id') ?? ''; }
  set id(v) { this._attrs.set('id', String(v)); }
  get attributes() { return [...this._attrs].map(([name, value]) => ({ name, value })); }
  setAttribute(name, value) { this._attrs.set(String(name).toLowerCase(), String(value)); }
  getAttribute(name) { const n = String(name).toLowerCase(); return this._attrs.has(n) ? this._attrs.get(n) : null; }
  hasAttribute(name) { return this._attrs.has(String(name).toLowerCase()); }
  removeAttribute(name) { this._attrs.delete(String(name).toLowerCase()); }
  _detach(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
  }
  appendChild(node) {
    if (node && node.nodeType === 11) { for (const child of [...node.childNodes]) this.appendChild(child); return node; }
    this._detach(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  append(...nodes) {
    for (const node of nodes) this.appendChild(typeof node === 'string' ? new TextNode(node, this.ownerDocument) : node);
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) { this.childNodes.splice(i, 1); node.parentNode = null; }
    return node;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceChildren(...nodes) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    this.append(...nodes);
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(value) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    const text = value == null ? '' : String(value);
    if (text) this.appendChild(new TextNode(text, this.ownerDocument));
  }
  get innerHTML() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.data : `<${c.localName}>`)).join(''); }
  set innerHTML(html) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    this.ownerDocument?._innerHTMLWrites.push({ target: this.localName, html: String(html) });
    parseHTMLInto(String(html), this, this.ownerDocument);
  }
  cloneNode(deep = false) {
    const copy = new Element(this.localName, this.ownerDocument, this.namespaceURI);
    for (const [k, v] of this._attrs) copy._attrs.set(k, v);
    copy.hidden = this.hidden;
    copy.style = { ...this.style };
    if (deep) for (const child of this.childNodes) copy.appendChild(child.cloneNode(true));
    return copy;
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
  dispatch(type, event = {}) {
    for (const fn of [...(this._listeners.get(type) ?? [])]) fn({ type, target: this, ...event });
    if (type === 'click' && typeof this.onclick === 'function') this.onclick({ type, target: this });
  }
  click() { this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  getClientRects() {
    const css = String(this.style?.cssText ?? this.getAttribute('style') ?? '') + String(this.getAttribute('style') ?? '');
    if (this.hidden || this.hasAttribute('hidden') || /display\s*:\s*none/i.test(css)) return [];
    return [{}];
  }
  matches(selector) {
    return parseSelector(selector).some((c) => {
      if (c.tag && c.tag !== this.localName) return false;
      if (c.id && this.id !== c.id) return false;
      if (c.classes.some((cl) => !this.className.split(/\s+/).includes(cl))) return false;
      return c.attrs.every((a) => this.hasAttribute(a.name) && (a.value === null || this.getAttribute(a.name) === a.value));
    });
  }
  querySelectorAll(selector) {
    parseSelector(selector);
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType !== 1) continue;
        if (child.matches(selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  attachShadow() {
    this.shadowRoot = new Element('#shadow-root', this.ownerDocument);
    this.shadowRoot.nodeType = 11;
    return this.shadowRoot;
  }
}

class DocumentFragmentLike extends Element {
  constructor(doc) { super('#fragment', doc); this.nodeType = 11; }
}

export function parseHTMLInto(html, parent, doc) {
  const stack = [parent];
  const top = () => stack[stack.length - 1];
  const tagRe = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  let last = 0;
  let m;
  const pushText = (text) => { if (text) top().appendChild(new TextNode(decodeEntities(text), doc)); };
  while ((m = tagRe.exec(html))) {
    pushText(html.slice(last, m.index));
    last = tagRe.lastIndex;
    if (m[0].startsWith('<!')) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].localName === name) { stack.length = i; break; }
      continue;
    }
    const name = m[2].toLowerCase();
    const el = doc.createElement(name);
    const attrRe = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let a;
    while ((a = attrRe.exec(m[3] || ''))) el.setAttribute(a[1], decodeEntities(a[2] ?? a[3] ?? a[4] ?? ''));
    if (el.hasAttribute('hidden')) el.hidden = true;
    top().appendChild(el);
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'i');
      const rest = html.slice(last);
      const end = close.exec(rest);
      const body = end ? rest.slice(0, end.index) : rest;
      if (body) el.appendChild(new TextNode(body, doc));
      last += end ? end.index + end[0].length : rest.length;
      tagRe.lastIndex = last;
    } else if (!VOID.has(name) && !m[4]) {
      stack.push(el);
    }
  }
  pushText(html.slice(last));
}

export function createDocument() {
  const doc = new Element('#document', null);
  doc.nodeType = 9;
  doc.ownerDocument = doc;
  doc._innerHTMLWrites = [];
  doc.createElement = (name) => new Element(name, doc);
  doc.createElementNS = (ns, name) => new Element(name, doc, ns);
  doc.createTextNode = (text) => new TextNode(text, doc);
  doc.createDocumentFragment = () => new DocumentFragmentLike(doc);
  doc.documentElement = doc.createElement('html');
  doc.head = doc.createElement('head');
  doc.body = doc.createElement('body');
  doc.documentElement.append(doc.head, doc.body);
  doc.appendChild(doc.documentElement);
  doc.getElementById = (id) => doc.documentElement.querySelectorAll(`#${id}`)[0] ?? null;
  return doc;
}

/** Build a document whose <body> is parsed from `html`. */
export function documentFromHTML(html) {
  const doc = createDocument();
  parseHTMLInto(html, doc.body, doc);
  return doc;
}

/** Depth-first list of every element at or under `root`. */
export function allElements(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes ?? []) {
      if (child.nodeType !== 1) continue;
      out.push(child);
      walk(child);
    }
  };
  if (root.nodeType === 1) out.push(root);
  walk(root);
  return out;
}

/**
 * Install page-like globals for content-entry.js. Intervals are NOT really scheduled:
 * tests drive route polling with env.tickIntervals(), and leaks are visible via env.activeIntervals().
 */
export function installPageEnvironment(initialUrl, html = '<main>Shoes</main>') {
  const saved = {};
  const names = ['document', 'window', 'location', 'matchMedia', 'MutationObserver', 'getComputedStyle', 'setInterval', 'clearInterval', 'BeforePayGuardian', 'innerWidth', 'innerHeight'];
  for (const n of names) saved[n] = Object.getOwnPropertyDescriptor(globalThis, n);

  const document = documentFromHTML(html);
  const windowListeners = new Map();
  const windowObj = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { windowListeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(windowListeners.get(event.type) ?? [])]) fn(event); return true; }
  };
  const location = {};
  const setURL = (href) => {
    const u = new URL(href);
    Object.assign(location, { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash, hostname: u.hostname, protocol: u.protocol });
  };
  setURL(initialUrl);

  const intervals = new Map();
  let intervalId = 1;
  const observers = [];
  class FakeMutationObserver {
    constructor(cb) { this.cb = cb; this.connected = false; observers.push(this); }
    observe() { this.connected = true; }
    disconnect() { this.connected = false; }
  }

  const define = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  define('document', document);
  define('window', windowObj);
  define('location', location);
  define('matchMedia', () => ({ matches: false }));
  define('MutationObserver', FakeMutationObserver);
  define('getComputedStyle', (el) => ({ visibility: /visibility\s*:\s*hidden/i.test(String(el.getAttribute?.('style') ?? '')) ? 'hidden' : 'visible' }));
  define('setInterval', (fn) => { const id = intervalId++; intervals.set(id, fn); return id; });
  define('clearInterval', (id) => { intervals.delete(id); });
  define('innerWidth', 1280);
  define('innerHeight', 800);
  delete globalThis.BeforePayGuardian;

  return {
    document,
    window: windowObj,
    location,
    setURL,
    /** Navigate like an SPA and fire the listener the real browser would. */
    navigate(href, eventType = 'hashchange') { setURL(href); windowObj.dispatchEvent({ type: eventType }); },
    fire(type) { windowObj.dispatchEvent({ type }); },
    tickIntervals() { for (const fn of [...intervals.values()]) fn(); },
    activeIntervals: () => intervals.size,
    activeObservers: () => observers.filter((o) => o.connected).length,
    windowListenerCount: () => [...windowListeners.values()].reduce((n, s) => n + s.size, 0),
    restore() {
      globalThis.BeforePayGuardian?.destroy?.();
      for (const n of names) {
        if (saved[n]) Object.defineProperty(globalThis, n, saved[n]);
        else delete globalThis[n];
      }
    }
  };
}
