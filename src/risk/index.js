/** RISK public entry: contract v1 collectEvidence + evaluate, plus provider factories. */
export {evaluate} from './evaluate.js';
export {collectEvidence, defaultProviders, normaliseEvidence} from '../evidence/collect.js';
export {createPageProvider} from '../evidence/page.js';
export {createDemoDirectoryProvider, isDemoObservation, DEMO_ORIGINS, DEFAULT_DEMO_DIRECTORY} from '../evidence/demo-directory.js';
export {createNoIndependentSourceProvider} from '../evidence/independent-none.js';
export {exactHostMatch, lookalikeReasons, normalizeHost} from '../evidence/hostname.js';
