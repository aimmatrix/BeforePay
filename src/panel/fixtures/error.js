/** Contract-shaped evaluator error fixture. */

export const errorAssessment = {
  schemaVersion: 1,
  scanId: 'scan-error-1',
  pageKey: 'https://solehouse-outlet.example/checkout',
  createdAt: '2026-10-13T18:15:00.000Z',
  mode: 'demo',
  verdict: 'error',
  identityStatus: 'unverified',
  headline: 'The store check stopped before it finished.',
  summary:
    'Evidence collection did not complete. Partial or missing results cannot be shown as a clean finding.',
  reasons: [
    {
      id: 'provider-error',
      severity: 'unknown',
      title: 'Evidence provider returned an error',
      detail: 'The sample adapter failed while collecting identity evidence for this page snapshot.',
      evidenceIds: ['ev-identity-error']
    }
  ],
  evidence: [
    {
      id: 'ev-identity-error',
      kind: 'identity',
      status: 'error',
      sourceType: 'synthetic',
      sourceLabel: 'Sample identity adapter',
      sourceUrl: null,
      checkedAt: '2026-10-13T18:15:00.000Z',
      summary: 'Identity lookup failed.',
      detail: 'Typed error evidence is shown instead of a favourable finding.'
    },
    {
      id: 'ev-transport',
      kind: 'transport',
      status: 'observed',
      sourceType: 'page',
      sourceLabel: 'Page connection',
      sourceUrl: 'https://solehouse-outlet.example/checkout',
      checkedAt: '2026-10-13T18:15:00.000Z',
      summary: 'Connection uses HTTPS.',
      detail: 'Observed transport does not complete the interrupted identity check.'
    }
  ],
  nextSteps: [
    'Try the check again.',
    'If the error repeats, do not treat the missing result as clearance to pay.'
  ],
  limitations: [
    'An error is not a warning about the store, and it is not a clean result.'
  ]
};
