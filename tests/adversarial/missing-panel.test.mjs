import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installDom } from './helpers/dom.mjs';
import { assessment, evidence } from './helpers/factories.mjs';
import { loadPanel } from './helpers/load.mjs';

const panel = await loadPanel();

describe(`missing checks in panel [${panel.source}]`, () => {
  it('ADV-MISS-002 panel shows not-checked items and does not invent sources', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    const ui = panel.mountPanel(root, { onRescan() {}, onDismiss() {} });
    ui.setOpen(true);
    ui.update(
      assessment({
        verdict: 'uncertain',
        identityStatus: 'unverified',
        headline: 'This seller is unverified.',
        evidence: [
          evidence({
            id: 'id-miss',
            kind: 'identity',
            status: 'not_checked',
            sourceType: 'independent',
            sourceLabel: 'Independent directory',
            summary: 'Identity not checked',
          }),
          evidence({
            id: 'rep-miss',
            kind: 'reputation',
            status: 'not_checked',
            sourceType: 'independent',
            sourceLabel: 'Independent reviews',
            summary: 'Reviews not checked',
          }),
        ],
        reasons: [],
        limitations: ['Not a guarantee.'],
      }),
      'complete'
    );
    const text = root.textContent;
    assert.match(text, /not checked|not-checked|missing|unchecked/i);
    assert.equal(/invented-score|98% safe/i.test(text), false);
    assert.match(text, /not a guarantee/i);
    ui.destroy();
  });
});
