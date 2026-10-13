import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evidenceById, groupEvidence, linkedSourceLabels } from '../../src/panel/group.js';

describe('groupEvidence', () => {
  it('splits supporting observations from missing checks', () => {
    const { supporting, missing } = groupEvidence([
      { id: 'a', status: 'observed' },
      { id: 'b', status: 'matched' },
      { id: 'c', status: 'mismatch' },
      { id: 'd', status: 'not_checked' },
      { id: 'e', status: 'unavailable' },
      { id: 'f', status: 'error' },
      { id: 'g', status: 'stale' }
    ]);
    assert.deepEqual(
      supporting.map((item) => item.id),
      ['a', 'b', 'c']
    );
    assert.deepEqual(
      missing.map((item) => item.id),
      ['d', 'e', 'f', 'g']
    );
  });

  it('does not treat error or stale as supporting sources', () => {
    const { supporting, missing } = groupEvidence([
      { id: 'err', status: 'error' },
      { id: 'old', status: 'stale' }
    ]);
    assert.equal(supporting.length, 0);
    assert.equal(missing.length, 2);
  });

  it('tolerates missing arrays', () => {
    assert.deepEqual(groupEvidence(null), { supporting: [], missing: [] });
  });
});

describe('linkedSourceLabels', () => {
  it('resolves labels in evidence id order', () => {
    const byId = evidenceById([
      { id: 'two', sourceLabel: 'Second' },
      { id: 'one', sourceLabel: 'First' }
    ]);
    assert.deepEqual(linkedSourceLabels(['one', 'two', 'missing'], byId), ['First', 'Second']);
  });
});
