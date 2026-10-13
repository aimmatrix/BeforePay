/** Minimal DOM for mountPopup tests. Not a browser. */

function tokenize(selector) {
  const tokens = [];
  const re = /(\.|#)?([A-Za-z0-9_-]+)|\[([A-Za-z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?\]/g;
  let match;
  while ((match = re.exec(selector))) {
    if (match[3]) tokens.push({ type: 'attr', name: match[3], value: match[4] });
    else if (match[1] === '.') tokens.push({ type: 'class', value: match[2] });
    else if (match[1] === '#') tokens.push({ type: 'id', value: match[2] });
    else tokens.push({ type: 'tag', value: match[2].toUpperCase() });
  }
  return tokens;
}

function matches(node, selector) {
  if (node.nodeType !== 1) return false;
  const tokens = tokenize(selector);
  if (!tokens.length) return false;
  return tokens.every((token) => {
    if (token.type === 'tag') return node.tagName === token.value;
    if (token.type === 'class') return node.className.split(/\s+/).includes(token.value);
    if (token.type === 'id') return node.id === token.value;
    if (token.type === 'attr') {
      const actual = node.getAttribute(token.name);
      if (token.value == null) return actual != null || node[token.name] === true;
      return actual === token.value || String(node[token.name] ?? '') === token.value;
    }
    return false;
  });
}

function walk(node, out = []) {
  out.push(node);
  for (const child of node.childNodes) walk(child, out);
  return out;
}

export function createFakeDocument() {
  const document = {
    nodeType: 9,
    createElement(tag) {
      return createElement(tag, document);
    }
  };

  function createElement(tag, ownerDocument) {
    const attrs = Object.create(null);
    const node = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      childNodes: [],
      parentNode: null,
      ownerDocument,
      className: '',
      id: '',
      type: '',
      name: '',
      value: '',
      hidden: false,
      disabled: false,
      checked: false,
      _text: '',
      _listeners: Object.create(null),
      style: {},
      dataset: Object.create(null)
    };

    Object.defineProperty(node, 'textContent', {
      get() {
        if (node.childNodes.length) return node.childNodes.map((child) => child.textContent).join('');
        return node._text;
      },
      set(value) {
        node._text = String(value);
        node.childNodes = [];
      }
    });

    node.appendChild = (child) => {
      child.parentNode = node;
      node.childNodes.push(child);
      return child;
    };
    node.removeChild = (child) => {
      node.childNodes = node.childNodes.filter((item) => item !== child);
      child.parentNode = null;
      return child;
    };
    node.setAttribute = (name, value) => {
      const key = String(name);
      const text = String(value);
      attrs[key] = text;
      if (key === 'class') node.className = text;
      if (key === 'id') node.id = text;
      if (key === 'type') node.type = text;
      if (key === 'name') node.name = text;
      if (key === 'value') node.value = text;
      if (key === 'hidden') node.hidden = true;
      if (key.startsWith('data-')) {
        const prop = key
          .slice(5)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        node.dataset[prop] = text;
      }
    };
    node.getAttribute = (name) => {
      const key = String(name);
      if (key === 'hidden') return node.hidden ? '' : null;
      if (Object.prototype.hasOwnProperty.call(attrs, key)) return attrs[key];
      if (key === 'class') return node.className || null;
      if (key === 'id') return node.id || null;
      if (key === 'type') return node.type || null;
      if (key === 'name') return node.name || null;
      if (key === 'value') return node.value || null;
      return null;
    };
    node.removeAttribute = (name) => {
      const key = String(name);
      delete attrs[key];
      if (key === 'hidden') node.hidden = false;
      if (key === 'class') node.className = '';
    };
    node.addEventListener = (type, fn) => {
      (node._listeners[type] ||= []).push(fn);
    };
    node.dispatchEvent = (event) => {
      const payload = { target: node, currentTarget: node, preventDefault() {}, ...event };
      for (const fn of node._listeners[event.type] || []) fn(payload);
      return true;
    };
    node.click = () => node.dispatchEvent({ type: 'click' });
    node.querySelector = (selector) => node.querySelectorAll(selector)[0] || null;
    node.querySelectorAll = (selector) =>
      walk(node).filter((item) => item !== node && matches(item, selector));

    return node;
  }

  return document;
}

export function textOf(node) {
  return node ? String(node.textContent || '') : '';
}
