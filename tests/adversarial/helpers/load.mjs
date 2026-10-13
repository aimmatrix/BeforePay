import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export function projectRoot() {
  return ROOT;
}

async function importIfExists(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return { ok: false, path: relPath, mod: null };
  const mod = await import(pathToFileURL(abs).href);
  return { ok: true, path: relPath, mod };
}

export async function loadEvaluator() {
  const risk = await importIfExists('src/risk/index.js');
  if (risk.ok && typeof risk.mod.evaluate === 'function') {
    return {
      owner: 'RISK',
      source: 'src/risk/index.js',
      evaluate: risk.mod.evaluate,
      collectEvidence: risk.mod.collectEvidence,
    };
  }
  const fallback = await importIfExists('src/runtime/fallback.js');
  if (!fallback.ok || typeof fallback.mod.evaluate !== 'function') {
    throw new Error('No evaluate() export. RISK must publish src/risk/index.js.');
  }
  return {
    owner: 'CORE',
    source: 'src/runtime/fallback.js (RISK module missing)',
    evaluate: fallback.mod.evaluate,
    collectEvidence: fallback.mod.collectEvidence,
  };
}

export async function loadPanel() {
  const panel = await importIfExists('src/panel/index.js');
  if (panel.ok && typeof panel.mod.mountPanel === 'function') {
    return {
      owner: 'C2',
      source: 'src/panel/index.js',
      mountPanel: panel.mod.mountPanel,
      sanitizeUrl: panel.mod.sanitizeUrl,
    };
  }
  throw new Error('C2 must export mountPanel from src/panel/index.js.');
}

export async function loadPip() {
  const pip = await importIfExists('src/pip/index.js');
  if (pip.ok && typeof pip.mod.mountPip === 'function') {
    return { owner: 'PIP', source: 'src/pip/index.js', mountPip: pip.mod.mountPip };
  }
  const fallback = await importIfExists('src/runtime/fallback.js');
  if (fallback.ok && typeof fallback.mod.mountPip === 'function') {
    return {
      owner: 'CORE',
      source: 'src/runtime/fallback.js (PIP module missing)',
      mountPip: fallback.mod.mountPip,
    };
  }
  throw new Error('PIP must export mountPip from src/pip/index.js.');
}

export async function loadRuntime() {
  const scan = await importIfExists('src/runtime/scan-controller.js');
  const observation = await importIfExists('src/runtime/observation.js');
  const contracts = await importIfExists('src/contracts/index.js');
  return {
    createScanController: scan.mod?.createScanController,
    collectObservation: observation.mod?.collectObservation,
    demoScenario: observation.mod?.demoScenario,
    supportedUrl: observation.mod?.supportedUrl,
    pipState: contracts.mod?.pipState,
    isAssessment: contracts.mod?.isAssessment,
    CONTRACT_VERSION: contracts.mod?.CONTRACT_VERSION,
  };
}
