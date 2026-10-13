import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installDom } from './helpers/dom.mjs';
import { assessment } from './helpers/factories.mjs';
import { loadPanel, loadPip } from './helpers/load.mjs';

const panel = await loadPanel();
const pip = await loadPip();

describe(`dismiss and navigation [${panel.source}]`, () => {
  it('ADV-LIFE-002 panel dismiss callback fires and destroy removes owned DOM', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    let dismissed = 0;
    const ui = panel.mountPanel(root, {
      onRescan() {},
      onDismiss() {
        dismissed += 1;
      },
    });
    ui.setOpen(true);
    ui.update(assessment({ headline: 'Finding' }), 'complete');
    const buttons = root.querySelectorAll('button');
    const dismissBtn = buttons.find
      ? buttons.find((b) => /dismiss|close/i.test(b.textContent))
      : [...buttons].find((b) => /dismiss|close/i.test(b.textContent));
    assert.ok(dismissBtn, 'panel must expose a dismiss control');
    dismissBtn.dispatchEvent({ type: 'click' });
    if (typeof dismissBtn.onclick === 'function') dismissBtn.onclick({ type: 'click' });
    assert.ok(dismissed >= 1, 'onDismiss must run');
    ui.destroy();
    assert.equal(root.children.length, 0, 'destroy must remove owned panel DOM');
  });

  it('ADV-LIFE-003 rescan callback fires', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    let rescans = 0;
    const ui = panel.mountPanel(root, {
      onRescan() {
        rescans += 1;
      },
      onDismiss() {},
    });
    ui.setOpen(true);
    ui.update(assessment(), 'complete');
    const buttons = [...root.querySelectorAll('button')];
    const rescanBtn = buttons.find((b) => /rescan|check again|scan/i.test(b.textContent));
    assert.ok(rescanBtn, 'panel must expose a rescan control');
    rescanBtn.dispatchEvent({ type: 'click' });
    if (typeof rescanBtn.onclick === 'function') rescanBtn.onclick({ type: 'click' });
    assert.equal(rescans, 1);
    ui.destroy();
  });

  it('ADV-LIFE-007 Escape closes the open panel without requiring a focus trap', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    let dismissed = 0;
    const ui = panel.mountPanel(root, {
      onRescan() {},
      onDismiss() {
        dismissed += 1;
      },
    });
    ui.setOpen(true);
    ui.update(assessment(), 'complete');
    doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(dismissed, 1);
    ui.destroy();
  });
});

describe(`Pip dismiss [${pip.source}]`, () => {
  it('ADV-LIFE-001 dismissed view hides Pip', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    const ui = pip.mountPip(root, { onOpen() {}, onDismiss() {}, reducedMotion: true });
    ui.update({ state: 'warning', label: 'Pause', message: 'Check this store', expanded: false });
    ui.update({ state: 'dismissed', label: '', message: '', expanded: false });
    const visible = [...root.querySelectorAll('button, [role="button"], .core-pip')].filter(
      (el) => !el.hidden && el.style.display !== 'none'
    );
    assert.ok(
      visible.length === 0 || root.textContent.trim() === '' || [...root.children].every((el) => el.hidden),
      'dismissed Pip must not remain an active popup'
    );
    ui.destroy();
  });
});
