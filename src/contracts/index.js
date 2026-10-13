import {isDemoObservation} from '../evidence/demo-directory.js';
/** Contract v1: runtime boundary validators; see planning/CONTRACTS.md. */
export const CONTRACT_VERSION = 1;
export const VERDICTS = Object.freeze(['warning', 'uncertain', 'no_flags', 'error']);
export const IDENTITIES = Object.freeze(['verified', 'unverified', 'mismatch', 'demo_match']);
export function isAssessment(value) {
  return Boolean(value && value.schemaVersion === 1 && typeof value.scanId === 'string' && typeof value.pageKey === 'string' && VERDICTS.includes(value.verdict) && IDENTITIES.includes(value.identityStatus) && typeof value.headline === 'string' && typeof value.summary === 'string' && Array.isArray(value.evidence) && Array.isArray(value.reasons) && Array.isArray(value.limitations) && Array.isArray(value.nextSteps));
}
export function pipState(assessment) {
  if (assessment.verdict === 'warning') return 'warning';
  if (assessment.verdict === 'error') return 'error';
  if (assessment.verdict === 'uncertain') return 'uncertain';
  return ['verified','demo_match'].includes(assessment.identityStatus) ? 'identity_matched' : 'uncertain';
}

export function assessmentPolicyError(value, observation) {
  if(!isAssessment(value)) return 'The evaluator returned an incomplete response.';
  if(value.scanId!==observation.scanId || value.pageKey!==observation.pageKey) return 'The response belongs to a different page or scan.';
  if(!isDemoObservation(observation) && (value.mode==='demo' || value.identityStatus==='demo_match' || value.evidence.some(e=>e.sourceType==='synthetic'))) return 'Sample evidence cannot verify this real webpage.';
  if(value.identityStatus==='verified' && !value.evidence.some(e=>e.kind==='identity' && e.status==='matched' && e.sourceType==='independent')) return 'Independent identity evidence is required.';
  return null;
}
