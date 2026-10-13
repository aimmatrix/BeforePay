/** Contract-shaped uncertain fixture for an unknown store. Synthetic sample data only. */

export const uncertainAssessment = {
  schemaVersion: 1,
  scanId: 'scan-unknown-shoes-1',
  pageKey: 'https://unknown-runners.example/checkout',
  createdAt: '2026-10-13T18:05:00.000Z',
  mode: 'live',
  verdict: 'uncertain',
  identityStatus: 'unverified',
  headline: 'This store is unverified.',
  summary:
    'Completed checks did not establish who operates this checkout. HTTPS and a professional layout are not identity evidence. Missing checks stay visible and cannot become a clean result.',
  reasons: [
    {
      id: 'identity-missing',
      severity: 'unknown',
      title: 'No independent identity record for this host',
      detail:
        'There is no matching directory entry for unknown-runners.example. The site remains unverified.',
      evidenceIds: ['ev-identity-unverified']
    },
    {
      id: 'https-only',
      severity: 'info',
      title: 'Encrypted connection is not a store check',
      detail: 'The page uses HTTPS. That protects the connection; it does not identify the seller.',
      evidenceIds: ['ev-transport']
    }
  ],
  evidence: [
    {
      id: 'ev-identity-unverified',
      kind: 'identity',
      status: 'not_checked',
      sourceType: 'independent',
      sourceLabel: 'Independent identity directory',
      sourceUrl: null,
      checkedAt: null,
      summary: 'Identity was not verified.',
      detail: 'No independent identity evidence is available for this host.'
    },
    {
      id: 'ev-transport',
      kind: 'transport',
      status: 'observed',
      sourceType: 'page',
      sourceLabel: 'Page connection',
      sourceUrl: 'https://unknown-runners.example/checkout',
      checkedAt: '2026-10-13T18:05:00.000Z',
      summary: 'Connection uses HTTPS.',
      detail: 'Transport encryption is an observation, not a reputation or identity match.'
    },
    {
      id: 'ev-reputation',
      kind: 'reputation',
      status: 'unavailable',
      sourceType: 'independent',
      sourceLabel: 'Independent reputation',
      sourceUrl: null,
      checkedAt: null,
      summary: 'Reputation lookup was unavailable.',
      detail: 'Unavailable access returns a typed gap, not a favourable finding.'
    },
    {
      id: 'ev-contact',
      kind: 'contact',
      status: 'not_checked',
      sourceType: 'independent',
      sourceLabel: 'Independent contact record',
      sourceUrl: null,
      checkedAt: null,
      summary: 'Contact details were not independently checked.',
      detail: 'Addresses and emails printed on the shop page are claims from the page.'
    }
  ],
  nextSteps: [
    'Use a contact method you already trust, not a number or email printed only on this checkout.',
    'If you cannot establish who you are paying, pause before paying.'
  ],
  limitations: [
    'Unverified does not mean the store is a scam, and it does not mean it is safe.',
    'No fraud-probability percentage is provided.'
  ]
};
