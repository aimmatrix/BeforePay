import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { showDemoDisclosure, viewFrom } from '../../src/panel/view.js';

describe('viewFrom', () => {
  it('uses checking phase even when a leftover warning assessment is present', () => {
    assert.equal(viewFrom({ verdict: 'warning', identityStatus: 'mismatch' }, 'checking'), 'checking');
  });

  it('uses error phase over assessment body', () => {
    assert.equal(viewFrom({ verdict: 'no_flags' }, 'error'), 'error');
  });

  it('returns idle when complete is missing an assessment', () => {
    assert.equal(viewFrom(null, 'complete'), 'idle');
    assert.equal(viewFrom(null, 'idle'), 'idle');
  });

  it('lets warning chrome win over demo_match', () => {
    assert.equal(
      viewFrom({ verdict: 'warning', identityStatus: 'demo_match' }, 'complete'),
      'warning'
    );
  });

  it('maps demo_match without warnings to demo-match', () => {
    assert.equal(
      viewFrom({ verdict: 'no_flags', identityStatus: 'demo_match' }, 'complete'),
      'demo-match'
    );
  });

  it('maps remaining complete verdicts', () => {
    assert.equal(viewFrom({ verdict: 'uncertain', identityStatus: 'unverified' }, 'complete'), 'uncertain');
    assert.equal(viewFrom({ verdict: 'no_flags', identityStatus: 'verified' }, 'complete'), 'no-flags');
    assert.equal(viewFrom({ verdict: 'error', identityStatus: 'unverified' }, 'complete'), 'error');
  });
});

describe('showDemoDisclosure', () => {
  it('shows for demo mode and demo_match, not for checking', () => {
    assert.equal(showDemoDisclosure({ mode: 'demo', identityStatus: 'mismatch' }, 'warning'), true);
    assert.equal(showDemoDisclosure({ mode: 'live', identityStatus: 'demo_match' }, 'demo-match'), true);
    assert.equal(showDemoDisclosure({ mode: 'demo' }, 'checking'), false);
    assert.equal(showDemoDisclosure({ mode: 'live', identityStatus: 'verified' }, 'no-flags'), false);
  });
});
