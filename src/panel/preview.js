import { mountPanel } from './index.js';
import {
  demoMatchAssessment,
  errorAssessment,
  uncertainAssessment,
  warningAssessment
} from './fixtures/index.js';

const liveNoFlagsAssessment = {
  schemaVersion: 1,
  scanId: 'scan-live-no-flags-1',
  pageKey: 'https://shop.example/checkout',
  createdAt: '2026-10-13T18:20:00.000Z',
  mode: 'live',
  verdict: 'no_flags',
  identityStatus: 'verified',
  headline: 'No warning signs in completed checks.',
  summary:
    'Completed checks did not raise a warning. That is not a guarantee that the store, product, or delivery are legitimate.',
  reasons: [
    {
      id: 'identity-ok',
      severity: 'info',
      title: 'Independent identity record matches this host',
      detail: 'A documented identity rule matched shop.example. Identity is separate from purchase value.',
      evidenceIds: ['ev-identity']
    }
  ],
  evidence: [
    {
      id: 'ev-identity',
      kind: 'identity',
      status: 'matched',
      sourceType: 'independent',
      sourceLabel: 'Independent identity directory',
      sourceUrl: 'https://directory.example/shop',
      checkedAt: '2026-10-13T18:20:00.000Z',
      summary: 'Host matches an independent identity record.',
      detail: 'Verified identity never guarantees product authenticity or delivery.'
    }
  ],
  nextSteps: [
    'Read the limits before paying.',
    'Verified identity is not the same as a worthwhile purchase.'
  ],
  limitations: [
    'No flags means no warning signs in completed checks, never a guarantee.'
  ]
};

const host = document.getElementById('panel-host');
const log = document.getElementById('event-log');
const stateLabel = document.getElementById('state-label');

function note(message) {
  const time = new Date().toISOString().slice(11, 19);
  log.append(`${time} ${message}\n`);
}

const panel = mountPanel(host, {
  onRescan() {
    note('onRescan');
    panel.update(null, 'checking');
    stateLabel.textContent = 'checking (after rescan)';
  },
  onDismiss() {
    note('onDismiss');
    panel.setOpen(false);
    stateLabel.textContent = 'closed';
  }
});

panel.setOpen(true);
panel.update(warningAssessment, 'complete');
stateLabel.textContent = 'warning';

const views = {
  closed: () => {
    panel.setOpen(false);
    stateLabel.textContent = 'closed';
  },
  idle: () => {
    panel.setOpen(true);
    panel.update(null, 'idle');
    stateLabel.textContent = 'idle';
  },
  checking: () => {
    panel.setOpen(true);
    panel.update(warningAssessment, 'checking');
    stateLabel.textContent = 'checking (stale assessment ignored)';
  },
  warning: () => {
    panel.setOpen(true);
    panel.update(warningAssessment, 'complete');
    stateLabel.textContent = 'warning';
  },
  uncertain: () => {
    panel.setOpen(true);
    panel.update(uncertainAssessment, 'complete');
    stateLabel.textContent = 'uncertain';
  },
  'demo-match': () => {
    panel.setOpen(true);
    panel.update(demoMatchAssessment, 'complete');
    stateLabel.textContent = 'demo-match';
  },
  'no-flags': () => {
    panel.setOpen(true);
    panel.update(liveNoFlagsAssessment, 'complete');
    stateLabel.textContent = 'no-flags (live)';
  },
  error: () => {
    panel.setOpen(true);
    panel.update(errorAssessment, 'complete');
    stateLabel.textContent = 'error';
  },
  'phase-error': () => {
    panel.setOpen(true);
    panel.update(null, 'error');
    stateLabel.textContent = 'phase error, no assessment';
  }
};

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.getAttribute('data-view');
    const apply = views[id];
    if (apply) apply();
    document.querySelectorAll('[data-view]').forEach((node) => {
      node.setAttribute('aria-pressed', String(node === button));
    });
  });
});
