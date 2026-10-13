import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as copy from '../../src/popup/copy.js';
import { derivePopupView, normalizePopupState } from '../../src/popup/view.js';

const shop = {
  supported: true,
  originLabel: 'unfamiliar-shoes.example',
  siteAccess: 'manual',
  motion: 'system',
  busy: false,
  error: null
};

test('manual access never appears as automatic checks enabled', () => {
  const view = derivePopupView(shop);
  assert.equal(view.autoChecksEnabled, false);
  assert.equal(view.accessChip, copy.CHIP_TAB_ONLY);
  assert.equal(view.showScan, true);
  assert.equal(view.showRequestAccess, true);
  assert.equal(view.showRemoveAccess, false);
  assert.equal(view.scanLabel, copy.SCAN);
});

test('automatic checks appear enabled only when runtime siteAccess is granted', () => {
  const view = derivePopupView({ ...shop, siteAccess: 'granted' });
  assert.equal(view.autoChecksEnabled, true);
  assert.equal(view.accessChip, copy.CHIP_AUTO_ON);
  assert.equal(view.accessCaption, copy.ACCESS_GRANTED);
  assert.equal(view.showRequestAccess, false);
  assert.equal(view.showRemoveAccess, true);
});

test('unsupported pages hide Check this store and show a limitation, not a failed scan', () => {
  const view = derivePopupView({
    ...shop,
    supported: false,
    originLabel: 'Page not supported'
  });
  assert.equal(view.showScan, false);
  assert.equal(view.loading, false);
  assert.equal(view.banner?.kind, 'unsupported');
  assert.equal(view.banner?.title, copy.UNSUPPORTED_TITLE);
  assert.equal(view.showRequestAccess, false);
});

test('loading origin does not use the unsupported banner', () => {
  const view = derivePopupView({
    supported: false,
    originLabel: 'Loading current tab…',
    siteAccess: 'manual',
    motion: 'system',
    busy: false,
    error: null
  });
  assert.equal(view.loading, true);
  assert.equal(view.banner?.kind, 'loading');
  assert.equal(view.showScan, false);
});

test('busy disables scan and host-access controls and relabels the primary action', () => {
  const view = derivePopupView({ ...shop, busy: true });
  assert.equal(view.scanDisabled, true);
  assert.equal(view.scanLabel, copy.SCANNING);
  assert.equal(view.requestDisabled, true);
  assert.equal(view.motionDisabled, true);
});

test('runtime error text is shown as an error banner, never a clean result', () => {
  const view = derivePopupView({
    ...shop,
    error: 'Site access was declined. Manual checking remains available.'
  });
  assert.equal(view.banner?.kind, 'error');
  assert.equal(view.banner?.body, 'Site access was declined. Manual checking remains available.');
  assert.equal(view.showScan, true);
});

test('host-access actions hide when CORE has not implemented them', () => {
  const manual = derivePopupView(shop, { hostAccessImplemented: false });
  const granted = derivePopupView({ ...shop, siteAccess: 'granted' }, { hostAccessImplemented: false });
  assert.equal(manual.showRequestAccess, false);
  assert.equal(granted.showRemoveAccess, false);
  assert.equal(granted.autoChecksEnabled, true);
});

test('busyLock from an in-flight action disables controls even if state.busy is false', () => {
  const view = derivePopupView(shop, { busyLock: true });
  assert.equal(view.scanDisabled, true);
  assert.equal(view.scanLabel, copy.SCANNING);
});

test('unknown siteAccess and motion values collapse to the safe contract defaults', () => {
  const state = normalizePopupState({
    supported: 'yes',
    originLabel: 12,
    siteAccess: 'always',
    motion: 'off',
    busy: 1,
    error: '  need a closer look  '
  });
  assert.deepEqual(state, {
    supported: true,
    originLabel: '',
    siteAccess: 'manual',
    motion: 'system',
    busy: true,
    error: 'need a closer look'
  });
});

test('blank origin uses fallback copy instead of inventing a hostname', () => {
  const view = derivePopupView({ ...shop, originLabel: '   ' });
  assert.equal(view.originText, copy.ORIGIN_FALLBACK);
});
