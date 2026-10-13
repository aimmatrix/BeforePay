/** Contract-shaped demo-match fixture. Sample-only; never “safe to buy”. */

export const demoMatchAssessment = {
  schemaVersion: 1,
  scanId: 'scan-matching-shoes-1',
  pageKey: 'https://solehouse.example/checkout',
  createdAt: '2026-10-13T18:10:00.000Z',
  mode: 'demo',
  verdict: 'no_flags',
  identityStatus: 'demo_match',
  headline: 'This host matches the sample Solehouse directory.',
  summary:
    'No warning signs appeared in the completed sample checks. A directory match in this demonstration is not a guarantee of legitimacy, delivery, or product authenticity.',
  reasons: [
    {
      id: 'sample-identity',
      severity: 'info',
      title: 'Sample directory match for this host',
      detail:
        'solehouse.example matches the synthetic Solehouse directory entry used in this demonstration.',
      evidenceIds: ['ev-identity-match']
    }
  ],
  evidence: [
    {
      id: 'ev-identity-match',
      kind: 'identity',
      status: 'matched',
      sourceType: 'synthetic',
      sourceLabel: 'Sample Solehouse directory',
      sourceUrl: 'https://directory.example/solehouse',
      checkedAt: '2026-10-13T18:10:00.000Z',
      summary: 'Hostname matches the synthetic Solehouse directory entry.',
      detail: 'Demo evidence can yield only a demo_match, never a live verified identity.'
    },
    {
      id: 'ev-offer',
      kind: 'offer',
      status: 'observed',
      sourceType: 'page',
      sourceLabel: 'Product page text',
      sourceUrl: 'https://solehouse.example/checkout',
      checkedAt: '2026-10-13T18:10:00.000Z',
      summary: 'No unusual discount claim on this sample checkout.',
      detail: 'Advertised discount is absent in this scenario.'
    },
    {
      id: 'ev-reputation',
      kind: 'reputation',
      status: 'not_checked',
      sourceType: 'independent',
      sourceLabel: 'Independent reputation',
      sourceUrl: null,
      checkedAt: null,
      summary: 'Reputation was not checked.',
      detail: 'Missing checks remain visible on a sample match.'
    }
  ],
  nextSteps: [
    'Treat this as a demonstration of a matching sample record, not permission to pay.',
    'Read the limits below before relying on any completed check.'
  ],
  limitations: [
    'Sample demonstration. Not a real store check.',
    'No flags in completed checks is not a guarantee of legitimacy.'
  ]
};
