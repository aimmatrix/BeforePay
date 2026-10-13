/**
 * Local copies of the frozen Assessment contract (planning/CONTRACTS.md v1).
 * If CORE publishes src/contracts/, consumers should switch imports there.
 * C2 must not write into src/contracts/.
 *
 * @typedef {'identity'|'reputation'|'domain'|'transport'|'contact'|'returns'|'offer'|'payment'} EvidenceKind
 * @typedef {'observed'|'matched'|'mismatch'|'not_checked'|'unavailable'|'error'|'stale'} EvidenceStatus
 * @typedef {'page'|'independent'|'synthetic'} EvidenceSourceType
 *
 * @typedef {object} Evidence
 * @property {string} id
 * @property {EvidenceKind} kind
 * @property {EvidenceStatus} status
 * @property {EvidenceSourceType} sourceType
 * @property {string} sourceLabel
 * @property {string|null} sourceUrl
 * @property {string|null} checkedAt
 * @property {string} summary
 * @property {string} detail
 *
 * @typedef {object} AssessmentReason
 * @property {string} id
 * @property {'warning'|'info'|'unknown'} severity
 * @property {string} title
 * @property {string} detail
 * @property {string[]} evidenceIds
 *
 * @typedef {object} Assessment
 * @property {1} schemaVersion
 * @property {string} scanId
 * @property {string} pageKey
 * @property {string} createdAt
 * @property {'demo'|'live'} mode
 * @property {'warning'|'uncertain'|'no_flags'|'error'} verdict
 * @property {'verified'|'unverified'|'mismatch'|'demo_match'} identityStatus
 * @property {string} headline
 * @property {string} summary
 * @property {AssessmentReason[]} reasons
 * @property {Evidence[]} evidence
 * @property {string[]} nextSteps
 * @property {string[]} limitations
 *
 * @typedef {'idle'|'checking'|'complete'|'error'} PanelPhase
 * @typedef {'closed'|'idle'|'checking'|'warning'|'uncertain'|'demo-match'|'no-flags'|'error'} PanelView
 *
 * @typedef {object} PanelOptions
 * @property {() => void} onRescan
 * @property {() => void} onDismiss
 *
 * @typedef {object} PanelController
 * @property {(assessment: Assessment|null, phase: PanelPhase) => void} update
 * @property {(open: boolean) => void} setOpen
 * @property {() => void} destroy
 */

export {};
