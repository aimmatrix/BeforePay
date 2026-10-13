/**
 * Stand-in for the bundler alias `beforepay-components` used by src/runtime/content-entry.js.
 * Delegates to real owner modules when present (see impl.mjs) but lets a test inject slow, hanging
 * or throwing evidence collection and records every UI call so lifecycle leaks are observable.
 */
import { evaluators, mountPanel as realMountPanel, mountPip as realMountPip } from './impl.mjs';

const impl = evaluators[evaluators.length - 1];

function hooks() {
  return (globalThis.__bpTest ??= { calls: [], uiLog: [] });
}

export async function collectEvidence(observation, options) {
  const h = hooks();
  h.calls.push({ observation, signal: options?.signal });
  if (typeof h.collectEvidence === 'function') return h.collectEvidence(observation, options, impl.collectEvidence);
  return impl.collectEvidence(observation, options);
}

export function evaluate(observation, evidence) {
  const h = hooks();
  if (typeof h.evaluate === 'function') return h.evaluate(observation, evidence, impl.evaluate);
  return impl.evaluate(observation, evidence);
}

export function mountPip(container, options) {
  const h = hooks();
  h.pipOptions = options;
  const inst = realMountPip(container, options);
  return {
    update(view) { h.uiLog.push({ ui: 'pip.update', view }); return inst.update(view); },
    destroy() { h.uiLog.push({ ui: 'pip.destroy' }); h.pipDestroyed = true; return inst.destroy(); }
  };
}

export function mountPanel(container, options) {
  const h = hooks();
  h.panelOptions = options;
  const inst = realMountPanel(container, options);
  return {
    update(assessment, phase) { h.uiLog.push({ ui: 'panel.update', assessment, phase }); return inst.update(assessment, phase); },
    setOpen(open) { h.uiLog.push({ ui: 'panel.setOpen', open }); return inst.setOpen(open); },
    destroy() { h.uiLog.push({ ui: 'panel.destroy' }); h.panelDestroyed = true; return inst.destroy(); }
  };
}
