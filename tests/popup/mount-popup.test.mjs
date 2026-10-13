import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mountPopup } from '../../src/popup/index.js';
import * as copy from '../../src/popup/copy.js';
import { createFakeDocument, textOf } from './fake-dom.mjs';

function setup(onAction) {
  const document = createFakeDocument();
  const container = document.createElement('div');
  const ui = mountPopup(container, { onAction });
  const root = container.querySelector('[data-bp-popup="root"]');
  return { document, container, ui, root };
}

const ready = {
  supported: true,
  originLabel: 'unfamiliar-shoes.example',
  siteAccess: 'manual',
  motion: 'system',
  busy: false,
  error: null
};

test('mountPopup renders origin, this-tab access, scan, and motion from PopupState', () => {
  const { ui, root } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update(ready);
  assert.equal(textOf(root.querySelector('.bp-popup-origin')), 'unfamiliar-shoes.example');
  assert.match(textOf(root.querySelector('.bp-popup-access')), /this tab only/i);
  assert.equal(textOf(root.querySelector('.bp-popup-chip')), copy.CHIP_TAB_ONLY);
  assert.equal(root.querySelector('.bp-popup-chip').dataset.on, 'false');
  const scan = root.querySelector('[data-action="SCAN_ACTIVE_TAB"]');
  assert.equal(scan.hidden, false);
  assert.equal(textOf(scan), copy.SCAN);
  assert.equal(root.querySelector('[data-action="REQUEST_SITE_ACCESS"]').hidden, false);
  assert.equal(root.querySelector('[data-action="REMOVE_SITE_ACCESS"]').hidden, true);
  assert.equal(root.querySelector('input[value="system"]').checked, true);
});

test('granted access is the only enabled automatic-check appearance', () => {
  const { ui, root } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update({ ...ready, siteAccess: 'granted' });
  assert.equal(root.querySelector('.bp-popup-chip').dataset.on, 'true');
  assert.equal(textOf(root.querySelector('.bp-popup-chip')), copy.CHIP_AUTO_ON);
  assert.equal(root.querySelector('[data-action="REQUEST_SITE_ACCESS"]').hidden, true);
  assert.equal(root.querySelector('[data-action="REMOVE_SITE_ACCESS"]').hidden, false);
});

test('unsupported state hides Check this store and shows a limitation banner', () => {
  const { ui, root } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update({
    supported: false,
    originLabel: 'Page not supported',
    siteAccess: 'manual',
    motion: 'system',
    busy: false,
    error: null
  });
  assert.equal(root.querySelector('[data-action="SCAN_ACTIVE_TAB"]').hidden, true);
  const banner = root.querySelector('.bp-popup-banner');
  assert.equal(banner.hidden, false);
  assert.equal(banner.dataset.kind, 'unsupported');
  assert.match(textOf(banner), /cannot be inspected/i);
});

test('Check this store dispatches SCAN_ACTIVE_TAB and applies RuntimeReply state', async () => {
  const actions = [];
  const { ui, root } = setup(async (action) => {
    actions.push(action);
    return {
      ok: true,
      state: { ...ready, busy: false },
      message: 'Pip opened on the current page.'
    };
  });
  ui.update(ready);
  root.querySelector('[data-action="SCAN_ACTIVE_TAB"]').click();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(actions, [{ type: 'SCAN_ACTIVE_TAB' }]);
  const banner = root.querySelector('.bp-popup-banner');
  assert.equal(banner.hidden, false);
  assert.equal(banner.dataset.kind, 'info');
  assert.match(textOf(banner), /Pip opened/);
});

test('permission rejection is visible and does not mark automatic checks as on', async () => {
  const denied = {
    ...ready,
    error: 'Site access was declined. Manual checking remains available.'
  };
  const { ui, root } = setup(async () => ({
    ok: false,
    state: denied,
    message: denied.error
  }));
  ui.update(ready);
  root.querySelector('[data-action="REQUEST_SITE_ACCESS"]').click();
  await Promise.resolve();
  await Promise.resolve();
  const banner = root.querySelector('.bp-popup-banner');
  assert.equal(banner.dataset.kind, 'error');
  assert.match(textOf(banner), /declined/);
  assert.equal(root.querySelector('.bp-popup-chip').dataset.on, 'false');
  assert.equal(root.querySelector('[data-action="REMOVE_SITE_ACCESS"]').hidden, true);
});

test('SET_MOTION radios dispatch the contract action', async () => {
  const actions = [];
  const { ui, root } = setup(async (action) => {
    actions.push(action);
    return { ok: true, state: { ...ready, motion: action.value }, message: null };
  });
  ui.update(ready);
  const reduced = root.querySelector('input[value="reduced"]');
  reduced.checked = true;
  reduced.dispatchEvent({ type: 'change' });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(actions, [{ type: 'SET_MOTION', value: 'reduced' }]);
  assert.equal(root.dataset.motion, 'reduced');
  assert.equal(reduced.checked, true);
});

test('busy state disables scan while checking', () => {
  const { ui, root } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update({ ...ready, busy: true });
  const scan = root.querySelector('[data-action="SCAN_ACTIVE_TAB"]');
  assert.equal(scan.disabled, true);
  assert.equal(textOf(scan), copy.SCANNING);
});

test('originLabel HTML stays inert text', () => {
  const { ui, root } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update({ ...ready, originLabel: '<img src=x onerror=alert(1)>' });
  assert.equal(textOf(root.querySelector('.bp-popup-origin')), '<img src=x onerror=alert(1)>');
  assert.equal(root.querySelector('img'), null);
});

test('destroy removes owned nodes', () => {
  const { ui, container } = setup(async () => ({ ok: true, state: ready, message: null }));
  ui.update(ready);
  ui.destroy();
  assert.equal(container.childNodes.length, 0);
});
