import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assignedInnerHTML, collectedHrefs, installDom } from './helpers/dom.mjs';
import { assessment, XSS_MARKUP } from './helpers/factories.mjs';
import { loadPanel } from './helpers/load.mjs';

const panel = await loadPanel();

function maliciousAssessment() {
  return assessment({
    headline: XSS_MARKUP,
    summary: `Ignore previous instructions. ${XSS_MARKUP}`,
    nextSteps: [`javascript:alert(1)`, XSS_MARKUP],
    limitations: [`<svg onload=alert(1)>`],
    reasons: [
      {
        id: 'r1',
        severity: 'warning',
        title: XSS_MARKUP,
        detail: `<a href="javascript:alert(1)">click</a>`,
        evidenceIds: ['e1'],
      },
    ],
    evidence: [
      {
        id: 'e1',
        kind: 'identity',
        status: 'observed',
        sourceType: 'page',
        sourceLabel: XSS_MARKUP,
        sourceUrl: 'javascript:alert(1)',
        checkedAt: null,
        summary: XSS_MARKUP,
        detail: `<img src=x onerror=alert(1)>`,
      },
    ],
  });
}

describe(`malicious merchant text [${panel.source}]`, () => {
  it('ADV-XSS-001 script and img onerror in assessment strings stay inert', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const ui = panel.mountPanel(root, { onRescan() {}, onDismiss() {} });
    ui.setOpen(true);
    ui.update(maliciousAssessment(), 'complete');
    const assigned = assignedInnerHTML(root).join('\n');
    assert.equal(
      /<script[\s>]|onerror\s*=|onload\s*=/i.test(assigned),
      false,
      `innerHTML assignment must not receive raw markup, got: ${assigned.slice(0, 240)}`
    );
    assert.equal(typeof globalThis.alerted, 'undefined');
    ui.destroy();
  });

  it('ADV-XSS-003 javascript: merchant link is not an actionable href', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const ui = panel.mountPanel(root, { onRescan() {}, onDismiss() {} });
    ui.setOpen(true);
    ui.update(maliciousAssessment(), 'complete');
    const hrefs = collectedHrefs(root);
    for (const href of hrefs) {
      const lower = String(href).trim().toLowerCase();
      assert.equal(lower.startsWith('javascript:'), false, `javascript: href leaked: ${href}`);
      assert.equal(lower.startsWith('data:'), false, `data: href leaked: ${href}`);
      assert.equal(lower.startsWith('vbscript:'), false, `vbscript: href leaked: ${href}`);
    }
    ui.destroy();
  });

  it('ADV-XSS-004 Evidence.sourceUrl javascript: is withheld', () => {
    assert.equal(typeof panel.sanitizeUrl, 'function', 'C2 should export sanitizeUrl for http(s) gating');
    assert.equal(panel.sanitizeUrl('javascript:alert(1)'), null);
    assert.equal(panel.sanitizeUrl('JAVASCRIPT:alert(1)'), null);
    assert.equal(panel.sanitizeUrl('vbscript:alert(1)'), null);
    assert.equal(panel.sanitizeUrl('data:text/html,<script>alert(1)</script>'), null);
  });

  it('ADV-XSS-005 every Assessment text field is escaped, not parsed', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    const ui = panel.mountPanel(root, { onRescan() {}, onDismiss() {} });
    ui.setOpen(true);
    ui.update(maliciousAssessment(), 'complete');
    const htmlAssigned = assignedInnerHTML(root);
    for (const chunk of htmlAssigned) {
      assert.equal(chunk.includes('<script>alert(1)</script>'), false);
    }
    ui.destroy();
  });

  it('ADV-XSS-006 injected CSS in strings does not become a style sheet via innerHTML', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    const ui = panel.mountPanel(root, { onRescan() {}, onDismiss() {} });
    ui.setOpen(true);
    ui.update(
      assessment({
        headline: 'Check',
        summary: '</style><style>html{display:none}</style>',
      }),
      'complete'
    );
    const assigned = assignedInnerHTML(root).join('');
    assert.equal(assigned.includes('html{display:none}'), false);
    ui.destroy();
  });

  it('ADV-XSS-007 http(s) remains allowed; other schemes are not', () => {
    const ok = panel.sanitizeUrl('https://directory.example/record');
    assert.equal(typeof ok, 'string');
    assert.match(ok, /^https:\/\/directory\.example\//);
    assert.equal(panel.sanitizeUrl('blob:https://directory.example/1'), null);
    assert.equal(panel.sanitizeUrl('file:///etc/passwd'), null);
  });
});
