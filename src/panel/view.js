/**
 * Map phase + assessment onto a panel view.
 * Phase wins over a leftover assessment body. Warning chrome wins over demo_match.
 *
 * @param {object|null|undefined} assessment
 * @param {string} phase
 * @returns {'idle'|'checking'|'warning'|'uncertain'|'demo-match'|'no-flags'|'error'}
 */
export function viewFrom(assessment, phase) {
  if (phase === 'checking') return 'checking';
  if (phase === 'error') return 'error';
  if (phase !== 'complete') return 'idle';
  if (!assessment || typeof assessment !== 'object') return 'idle';
  if (assessment.verdict === 'error') return 'error';
  if (assessment.verdict === 'warning') return 'warning';
  if (assessment.identityStatus === 'demo_match') return 'demo-match';
  if (assessment.verdict === 'uncertain') return 'uncertain';
  if (assessment.verdict === 'no_flags') return 'no-flags';
  return 'idle';
}

/**
 * Demo disclosure is chrome, not a finding.
 * @param {object|null|undefined} assessment
 * @param {string} view
 * @returns {boolean}
 */
export function showDemoDisclosure(assessment, view) {
  if (!assessment) return false;
  if (view === 'checking' || view === 'idle') return false;
  return assessment.mode === 'demo' || assessment.identityStatus === 'demo_match';
}
