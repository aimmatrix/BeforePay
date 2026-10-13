// Explicitly marks the no-install preview; actual extension tests run without this shim.
globalThis.BeforePayPreviewShim=true;
import('./content-entry.js');
