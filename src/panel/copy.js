/** Panel-owned chrome. Findings always come from the supplied Assessment. */

export const NOT_A_GUARANTEE =
  'This is not a guarantee of identity, delivery, authenticity, or a worthwhile purchase.';

export const DEMO_DISCLOSURE = 'Sample demonstration. Not a real store check.';

export const CHECKING_HEADLINE = 'Checking this store';
export const CHECKING_SUMMARY =
  'Looking at publicly visible details. This is not a final result.';

export const IDLE_HEADLINE = 'No check yet';
export const IDLE_SUMMARY =
  'Run a check to see evidence about this seller, offer, and payment request.';

export const ERROR_HEADLINE = 'Check could not finish';
export const ERROR_SUMMARY =
  'The store check did not complete. You can try again. A missing result is not a clean finding.';

export const SECTION_REASONS = 'Why it matters';
export const SECTION_SOURCES = 'Sources';
export const SECTION_MISSING = 'Not checked';
export const SECTION_STEPS = 'Next steps';
export const SECTION_LIMITS = 'Limits';

export const LABEL_RESCAN = 'Rescan';
export const LABEL_DISMISS = 'Dismiss';
export const LABEL_CLOSE = 'Dismiss panel';
export const LABEL_LINK_WITHHELD = 'link withheld';
export const LABEL_OPEN_SOURCE = 'Open source';

export const VIEW_LABELS = {
  idle: 'Idle',
  checking: 'Checking',
  warning: 'Warning',
  uncertain: 'Uncertain',
  'demo-match': 'Sample match',
  'no-flags': 'No flags in completed checks',
  error: 'Check failed'
};

export const IDENTITY_LABELS = {
  verified: 'Identity verified',
  unverified: 'Identity unverified',
  mismatch: 'Identity mismatch',
  demo_match: 'Demo sample match'
};

export const KIND_LABELS = {
  identity: 'Identity',
  reputation: 'Reputation',
  domain: 'Domain',
  transport: 'Connection',
  contact: 'Contact',
  returns: 'Returns',
  offer: 'Offer',
  payment: 'Payment'
};

export const SOURCE_TYPE_LABELS = {
  page: 'Page',
  independent: 'Independent',
  synthetic: 'Sample'
};

export const EVIDENCE_STATUS_LABELS = {
  observed: 'Observed',
  matched: 'Matched',
  mismatch: 'Mismatch',
  not_checked: 'Not checked',
  unavailable: 'Unavailable',
  error: 'Error',
  stale: 'Stale'
};
