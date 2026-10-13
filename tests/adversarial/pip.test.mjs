import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { installDom } from './helpers/dom.mjs';
import { loadPip, loadRuntime, projectRoot } from './helpers/load.mjs';

const pip = await loadPip();
const runtime = await loadRuntime();

function packedExtensionDir() {
  return join(projectRoot(), 'dist/extension');
}

function assertPackedFile(dir, rel, why) {
  const abs = join(dir, rel);
  assert.equal(existsSync(abs), true, `${why}: missing ${rel} under dist/extension`);
  assert.ok(statSync(abs).size > 0, `${why}: ${rel} is empty`);
}

describe(`duplicate Pip [${pip.source}]`, () => {
  it('ADV-PIP-001 mounting twice into one container still destroys cleanly', () => {
    const doc = installDom(globalThis);
    const root = doc.createElement('div');
    const first = pip.mountPip(root, { onOpen() {}, onDismiss() {}, reducedMotion: true });
    const second = pip.mountPip(root, { onOpen() {}, onDismiss() {}, reducedMotion: true });
    first.destroy();
    second.destroy();
    assert.equal(root.children.length, 0);
  });

  it('ADV-PIP-002 scan controller does not emit two results for overlapping checks', async () => {
    const events = [];
    const controller = runtime.createScanController({
      timeoutMs: 800,
      collect(id) {
        return { scanId: String(id), pageKey: 'https://demo.example/checkout' };
      },
      currentKey() {
        return 'https://demo.example/checkout';
      },
      onChecking() {
        events.push('checking');
      },
      onResult() {
        events.push('result');
      },
      onError() {
        events.push('error');
      },
      async assess(obs) {
        await new Promise((r) => setTimeout(r, 20));
        return { scanId: obs.scanId, pageKey: obs.pageKey, verdict: 'uncertain' };
      },
    });
    await Promise.all([controller.scan(), controller.scan(), controller.scan()]);
    const results = events.filter((e) => e === 'result');
    assert.equal(results.length, 1, 'overlapping scans must not render a popup loop of results');
  });
});

describe('duplicate Pip [packed extension]', () => {
  it('ADV-PIP-001b dist/extension manifest lists scripts that exist on disk', () => {
    const dir = packedExtensionDir();
    const manifestPath = join(dir, 'manifest.json');
    assert.equal(
      existsSync(manifestPath),
      true,
      'CORE: dist/extension/manifest.json is missing; run npm run build'
    );
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const listed = [];
    for (const entry of manifest.content_scripts || []) {
      for (const js of entry.js || []) listed.push(js);
    }
    if (manifest.background?.service_worker) listed.push(manifest.background.service_worker);
    if (manifest.action?.default_popup) listed.push(manifest.action.default_popup);
    assert.ok(listed.includes('content.js'), 'packed manifest must list content.js for checkout appearance');
    for (const rel of listed) {
      assertPackedFile(dir, rel, 'ADV-PIP-001b');
    }
  });
});
