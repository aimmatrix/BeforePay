/**
 * Local copies of the frozen popup contract (planning/CONTRACTS.md v1).
 * C3 must not write into src/contracts/.
 *
 * @typedef {'manual'|'granted'} SiteAccess
 * @typedef {'system'|'reduced'} MotionPreference
 *
 * @typedef {object} PopupState
 * @property {boolean} supported
 * @property {string} originLabel
 * @property {SiteAccess} siteAccess
 * @property {MotionPreference} motion
 * @property {boolean} busy
 * @property {string|null} error
 *
 * @typedef {object} PopupAction
 * @property {'SCAN_ACTIVE_TAB'|'REQUEST_SITE_ACCESS'|'REMOVE_SITE_ACCESS'|'SET_MOTION'} type
 * @property {MotionPreference} [value]
 *
 * @typedef {object} RuntimeReply
 * @property {boolean} ok
 * @property {PopupState} state
 * @property {string|null} message
 *
 * @typedef {object} PopupOptions
 * @property {(action: PopupAction) => Promise<RuntimeReply>} onAction
 *
 * @typedef {object} PopupController
 * @property {(state: PopupState) => void} update
 * @property {() => void} destroy
 *
 * @typedef {'unsupported'|'error'|'info'|'loading'} BannerKind
 *
 * @typedef {object} PopupBanner
 * @property {BannerKind} kind
 * @property {string} title
 * @property {string} body
 *
 * @typedef {object} PopupView
 * @property {string} originText
 * @property {string} accessCaption
 * @property {SiteAccess} siteAccess
 * @property {boolean} autoChecksEnabled
 * @property {string} accessChip
 * @property {boolean} showScan
 * @property {boolean} scanDisabled
 * @property {string} scanLabel
 * @property {boolean} showRequestAccess
 * @property {boolean} requestDisabled
 * @property {boolean} showRemoveAccess
 * @property {boolean} removeDisabled
 * @property {MotionPreference} motion
 * @property {boolean} motionDisabled
 * @property {boolean} loading
 * @property {PopupBanner|null} banner
 */

export {};
