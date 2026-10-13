/**
 * SYNTHETIC demo identity directory. Runs only for the exact local demo origin and path,
 * and only for a known scenario ID. Facts (claimed brand, simulated host) come from this
 * local table, never from the page. Its matches yield `demo_match`, never `verified`.
 */
import {exactHostMatch, lookalikeReasons} from './hostname.js';

export const DEMO_ORIGINS = Object.freeze(['http://127.0.0.1:4173', 'http://localhost:4173']);
export const DEMO_PATHS = Object.freeze(['/demo/index.html', '/']);

/** Mirrors fixtures/scenarios.json (S1). Tests assert they stay in sync. */
export const DEFAULT_DEMO_DIRECTORY = Object.freeze({
  label: 'Sample Solehouse directory',
  sourceUrl: 'https://sample-directory.example/solehouse',
  brands: [{name: 'Solehouse', hosts: ['shop.solehouse.example']}],
  scenarios: {
    'suspicious-shoes': {claimedBrand: 'Solehouse', simulatedHostname: 'solehouse-outlet.example'},
    'matching-shoes': {claimedBrand: 'Solehouse', simulatedHostname: 'shop.solehouse.example'},
    'unknown-shoes': {claimedBrand: 'North Quay Footwear', simulatedHostname: 'north-quay-footwear.example'},
  },
});

export function isDemoObservation(observation, origins = DEMO_ORIGINS, directory = DEFAULT_DEMO_DIRECTORY) {
  const id = observation?.demoScenarioId;
  if (typeof id !== 'string' || !Object.hasOwn(directory.scenarios, id)) return false;
  try {
    const url = new URL(observation.pageKey);
    return origins.includes(url.origin) && DEMO_PATHS.includes(url.pathname);
  } catch { return false; }
}

export function createDemoDirectoryProvider({allowedOrigins = DEMO_ORIGINS, directory = DEFAULT_DEMO_DIRECTORY} = {}) {
  return {
    name: 'demo-directory',
    label: directory.label,
    sourceType: 'synthetic',
    supportedKinds: ['identity', 'domain'],
    appliesTo: observation => isDemoObservation(observation, allowedOrigins, directory),
    async lookup(observation) {
      if (!isDemoObservation(observation, allowedOrigins, directory)) return [];
      const scenario = directory.scenarios[observation.demoScenarioId];
      const host = scenario.simulatedHostname;
      const brand = directory.brands.find(b => b.name.toLowerCase() === String(scenario.claimedBrand).toLowerCase());
      const base = {sourceType: 'synthetic', sourceLabel: directory.label, sourceUrl: directory.sourceUrl, checkedAt: observation.capturedAt || null};
      const sample = ' Sample data for a fictional store, not a real retailer record.';
      if (!brand) {
        return [{...base, id: 'identity', kind: 'identity', status: 'unavailable',
          summary: `${scenario.claimedBrand} is not in the sample directory`,
          detail: `No directory record exists for ${host}, so the seller's identity cannot be confirmed.${sample}`}];
      }
      if (exactHostMatch(host, brand.hosts)) {
        return [{...base, id: 'identity', kind: 'identity', status: 'matched',
          summary: `${host} matches the sample ${brand.name} record`,
          detail: `The sample directory lists ${brand.name} at exactly this host. This is a demo match, not independent verification, and says nothing about product authenticity, delivery or value.${sample}`}];
      }
      const out = [{...base, id: 'identity', kind: 'identity', status: 'mismatch',
        summary: `${host} is not the listed ${brand.name} host`,
        detail: `The page presents itself as ${brand.name}, but the sample directory lists ${brand.name} only at ${brand.hosts.join(', ')}.${sample}`}];
      const why = lookalikeReasons(host, brand.hosts, brand.name);
      if (why.length) out.push({...base, id: 'domain-lookalike', kind: 'domain', status: 'mismatch',
        summary: `Address resembles ${brand.name}`, detail: `${why.join(' ')}${sample}`});
      return out;
    },
  };
}
