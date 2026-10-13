import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mountPanel } from '../../src/panel/index.js';
import { warningAssessment } from '../../src/panel/fixtures/warning.js';
import { demoMatchAssessment } from '../../src/panel/fixtures/demoMatch.js';
import { errorAssessment } from '../../src/panel/fixtures/error.js';
import { uncertainAssessment } from '../../src/panel/fixtures/uncertain.js';
import { NOT_A_GUARANTEE } from '../../src/panel/copy.js';
import { createTestDocument } from './dom-shim.js';

function setup() {
  const { document, container } = createTestDocument();
  const events = [];
  const panel = mountPanel(container, {
    onRescan: () => events.push('rescan'),
    onDismiss: () => events.push('dismiss')
  });
  return { document, container, panel, events };
}

describe('mountPanel', () => {
  it('exposes update, setOpen, and destroy', () => {
    const { panel } = setup();
    assert.equal(typeof panel.update, 'function');
    assert.equal(typeof panel.setOpen, 'function');
    assert.equal(typeof panel.destroy, 'function');
  });

  it('stays closed until setOpen(true)', () => {
    const { container, panel } = setup();
    const root = container.querySelector('.bp-panel');
    assert.equal(root.hidden, true);
    panel.setOpen(true);
    assert.equal(root.hidden, false);
    assert.equal(root.getAttribute('data-open'), 'true');
    panel.setOpen(false);
    assert.equal(root.hidden, true);
  });

  it('does not show a leftover warning verdict while checking', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(warningAssessment, 'complete');
    panel.update(warningAssessment, 'checking');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'checking');
    assert.equal(root.querySelector('.bp-headline').textContent, 'Checking this store');
    assert.equal(root.querySelector('[data-section="reasons"]'), null);
    assert.equal(root.querySelector('.bp-button-primary').disabled, true);
  });

  it('renders warning reasons, sources, missing checks, and next steps', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(warningAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'warning');
    const reasons = root.querySelector('[data-section="reasons"]');
    assert.ok(reasons);
    assert.ok(reasons.textContent.includes('Store address does not match the claimed brand'));
    assert.ok(root.querySelector('[data-section="sources"]'));
    assert.ok(root.querySelector('[data-section="missing"]'));
    assert.ok(root.querySelector('[data-section="missing"]').textContent.includes('Reputation was not checked'));
    assert.ok(root.querySelector('[data-section="steps"]').textContent.includes('Do not follow payment instructions'));
    assert.ok(root.textContent.includes(NOT_A_GUARANTEE));
    assert.ok(root.querySelector('[data-section="demo"]'));
    assert.equal(root.querySelector('[data-section="demo"]').hidden, false);
  });

  it('keeps merchant HTML and javascript URLs inert', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(warningAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.querySelector('script'), null);
    assert.equal(root.querySelector('img'), null);
    assert.ok(root.textContent.includes('<script>alert("xss")</script>'));
    assert.ok(root.textContent.includes('javascript:alert(1)'));
    const hrefs = root.querySelectorAll('a').map((a) => a.getAttribute('href'));
    assert.equal(hrefs.some((href) => href && href.startsWith('javascript:')), false);
    assert.equal(hrefs.some((href) => href && href.startsWith('data:')), false);
  });

  it('shows the sample ribbon on demo-match and never says safe to buy', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(demoMatchAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'demo-match');
    assert.equal(root.querySelector('[data-section="demo"]').hidden, false);
    assert.ok(root.textContent.includes('Sample demonstration'));
    assert.equal(/safe to buy|ok to pay|verified store/i.test(root.querySelector('.bp-headline').textContent), false);
    assert.equal(/safe to buy|ok to pay/i.test(root.querySelector('.bp-summary').textContent), false);
    assert.ok(root.querySelector('[data-section="missing"]'));
  });

  it('renders uncertain missing identity as first-class', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(uncertainAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'uncertain');
    assert.ok(root.textContent.includes('Identity unverified'));
    assert.ok(root.querySelector('[data-section="missing"]').textContent.includes('Identity was not verified'));
  });

  it('renders error copy and keeps Rescan enabled', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(errorAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'error');
    assert.ok(root.textContent.includes('The store check stopped before it finished.'));
    assert.equal(root.querySelector('.bp-button-primary').disabled, false);
  });

  it('uses generic error copy when phase is error and assessment is null', () => {
    const { container, panel } = setup();
    panel.setOpen(true);
    panel.update(null, 'error');
    const root = container.querySelector('.bp-panel');
    assert.equal(root.getAttribute('data-view'), 'error');
    assert.equal(root.querySelector('.bp-headline').textContent, 'Check could not finish');
  });

  it('fires rescan and dismiss callbacks', () => {
    const { container, panel, events } = setup();
    panel.setOpen(true);
    panel.update(warningAssessment, 'complete');
    const root = container.querySelector('.bp-panel');
    const buttons = root.querySelectorAll('button');
    const rescan = buttons.find((b) => b.textContent === 'Rescan');
    const dismiss = buttons.find((b) => b.textContent === 'Dismiss');
    rescan.click();
    dismiss.click();
    root.querySelector('.bp-close').click();
    assert.deepEqual(events, ['rescan', 'dismiss', 'dismiss']);
  });

  it('calls onDismiss on Escape only while open', () => {
    const { document, panel, events } = setup();
    document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.deepEqual(events, []);
    panel.setOpen(true);
    document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.deepEqual(events, ['dismiss']);
  });

  it('destroy removes owned nodes and listeners', () => {
    const { document, container, panel, events } = setup();
    panel.setOpen(true);
    panel.destroy();
    assert.equal(container.querySelector('.bp-panel'), null);
    document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.deepEqual(events, []);
    panel.update(warningAssessment, 'complete');
    assert.equal(container.querySelector('.bp-panel'), null);
  });
});
