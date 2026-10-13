import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendSafeLink, sanitizeUrl, setText } from '../../src/panel/safe.js';
import { createTestDocument } from './dom-shim.js';

describe('sanitizeUrl', () => {
  it('allows http and https', () => {
    assert.equal(sanitizeUrl('https://directory.example/solehouse'), 'https://directory.example/solehouse');
    assert.equal(sanitizeUrl('http://localhost:4173/demo'), 'http://localhost:4173/demo');
  });

  it('rejects javascript, data, blob, and relative values', () => {
    assert.equal(sanitizeUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeUrl('data:text/html,phishing'), null);
    assert.equal(sanitizeUrl('blob:https://example/uuid'), null);
    assert.equal(sanitizeUrl('/checkout'), null);
    assert.equal(sanitizeUrl(''), null);
    assert.equal(sanitizeUrl(null), null);
  });

  it('rejects credentials in the URL', () => {
    assert.equal(sanitizeUrl('https://user:pass@evil.example/'), null);
  });
});

describe('setText', () => {
  it('writes markup as text, not nodes', () => {
    const { document } = createTestDocument();
    const p = document.createElement('p');
    setText(p, '<script>alert(1)</script>');
    assert.equal(p.textContent, '<script>alert(1)</script>');
    assert.equal(p.querySelector('script'), null);
  });
});

describe('appendSafeLink', () => {
  it('creates an http(s) link with noopener', () => {
    const { document, container } = createTestDocument();
    const node = appendSafeLink(document, container, 'https://directory.example/x', 'Open source');
    assert.equal(node.tagName, 'A');
    assert.equal(node.getAttribute('href'), 'https://directory.example/x');
    assert.equal(node.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(node.getAttribute('target'), '_blank');
    assert.equal(node.textContent, 'Open source');
  });

  it('renders javascript URLs as inert text', () => {
    const { document, container } = createTestDocument();
    const node = appendSafeLink(document, container, 'javascript:alert(1)', 'Open source');
    assert.equal(node.tagName, 'SPAN');
    assert.equal(node.getAttribute('href'), null);
    assert.equal(node.textContent, 'Open source');
  });
});
