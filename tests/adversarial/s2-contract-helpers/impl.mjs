/**
 * Optional-module loader. Prefers real owner modules (src/risk, src/pip, src/panel) when they
 * exist and export the contract names; otherwise falls back to the CORE fallback adapters.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const srcUrl = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

export async function tryImport(rel) {
  const file = path.join(ROOT, rel);
  if (!existsSync(file)) return null;
  return import(pathToFileURL(file).href);
}

async function firstWith(candidates, names) {
  for (const rel of candidates) {
    const mod = await tryImport(rel);
    if (mod && names.every((n) => typeof mod[n] === 'function')) return { mod, rel };
  }
  return null;
}

export const fallback = await import(srcUrl('src/runtime/fallback.js'));
export const observation = await import(srcUrl('src/runtime/observation.js'));
export const scanController = await import(srcUrl('src/runtime/scan-controller.js'));
export const contracts = await import(srcUrl('src/contracts/index.js'));
export const panelSafe = await import(srcUrl('src/panel/safe.js'));
export const panelView = await import(srcUrl('src/panel/view.js'));
export const panelCopy = await import(srcUrl('src/panel/copy.js'));

const riskFound = await firstWith(['src/risk/index.js', 'src/risk/engine.js'], ['evaluate']);
const evidenceFound = await firstWith(['src/evidence/index.js', 'src/risk/index.js'], ['collectEvidence']);
const panelFound = await firstWith(['src/panel/index.js'], ['mountPanel']);
const pipFound = await firstWith(['src/pip/index.js'], ['mountPip']);

/** Evaluator implementations to run every contract test against. */
export const evaluators = [
  { name: 'core-fallback', collectEvidence: fallback.collectEvidence, evaluate: fallback.evaluate, supportsProviders: true }
];
if (riskFound) {
  evaluators.push({
    name: `risk(${riskFound.rel})`,
    collectEvidence: (evidenceFound?.mod ?? riskFound.mod).collectEvidence ?? fallback.collectEvidence,
    evaluate: riskFound.mod.evaluate,
    supportsProviders: typeof (evidenceFound?.mod ?? riskFound.mod).collectEvidence === 'function'
  });
}

export const mountPanel = panelFound?.mod.mountPanel ?? fallback.mountPanel;
export const mountPip = pipFound?.mod.mountPip ?? fallback.mountPip;
export const implementationNotes = {
  evaluators: evaluators.map((e) => e.name),
  panel: panelFound ? panelFound.rel : 'src/runtime/fallback.js',
  pip: pipFound ? pipFound.rel : 'src/runtime/fallback.js'
};
