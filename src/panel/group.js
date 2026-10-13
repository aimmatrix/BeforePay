const SUPPORTING = new Set(['observed', 'matched', 'mismatch']);
const MISSING = new Set(['not_checked', 'unavailable', 'error', 'stale']);

/**
 * @param {Array<{id?: string, status?: string}>|null|undefined} evidence
 * @returns {{supporting: object[], missing: object[]}}
 */
export function groupEvidence(evidence) {
  const supporting = [];
  const missing = [];
  if (!Array.isArray(evidence)) return { supporting, missing };
  for (const item of evidence) {
    if (!item || typeof item !== 'object') continue;
    if (SUPPORTING.has(item.status)) supporting.push(item);
    else if (MISSING.has(item.status)) missing.push(item);
  }
  return { supporting, missing };
}

/**
 * @param {Array<{id?: string}>|null|undefined} evidence
 * @returns {Map<string, object>}
 */
export function evidenceById(evidence) {
  const map = new Map();
  if (!Array.isArray(evidence)) return map;
  for (const item of evidence) {
    if (item && typeof item.id === 'string') map.set(item.id, item);
  }
  return map;
}

/**
 * Labels for a reason's linked evidence, in given id order.
 * @param {string[]|null|undefined} evidenceIds
 * @param {Map<string, {sourceLabel?: string}>} byId
 * @returns {string[]}
 */
export function linkedSourceLabels(evidenceIds, byId) {
  if (!Array.isArray(evidenceIds)) return [];
  const labels = [];
  for (const id of evidenceIds) {
    const item = byId.get(id);
    if (item && item.sourceLabel) labels.push(String(item.sourceLabel));
  }
  return labels;
}
