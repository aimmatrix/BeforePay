'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const root = resolve(dirname(__filename), '../..');
const loadJson = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
const readText = (rel) => readFileSync(resolve(root, rel), 'utf8');

const scenariosFile = loadJson('fixtures/scenarios.json');
const vectorFile = loadJson('tests/fixtures/vectors.json');
const scenarios = scenariosFile.scenarios;
const vectors = vectorFile.vectors;

const SHOP_IDS = ['suspicious-shoes', 'matching-shoes', 'unknown-shoes'];
const VERDICTS = ['warning', 'uncertain', 'no_flags', 'error'];
const IDENTITIES = ['verified', 'unverified', 'mismatch', 'demo_match'];
const EVIDENCE_KINDS = ['identity', 'reputation', 'domain', 'transport', 'contact', 'returns', 'offer', 'payment'];
const EVIDENCE_STATUSES = ['observed', 'matched', 'mismatch', 'not_checked', 'unavailable', 'error', 'stale'];
const SOURCE_TYPES = ['page', 'independent', 'synthetic'];
const DEGRADED = ['not_checked', 'unavailable', 'error', 'stale'];
const REQUIRED_SCENARIO_KEYS = [
  'id',
  'displayName',
  'claimedBrand',
  'simulatedHostname',
  'product',
  'visibleClaims',
  'links',
  'syntheticIdentityEvidence',
  'expected'
];
const REASON_KIND_VOCABULARY = [
  'identity-mismatch',
  'identity-unverified',
  'identity-demo-match',
  'deceptive-suffix',
  'urgent-offer',
  'unusual-payment',
  'self-claimed-verification',
  'self-asserted-reviews',
  'https-not-identity',
  'missing-identity',
  'missing-returns',
  'missing-contact',
  'provider-unavailable',
  'provider-error',
  'provider-stale',
  'sample-only'
];
const REQUIRED_VECTOR_IDS = [
  'deceptive-suffix',
  'https-only-unknown',
  'missing-checks',
  'identity-conflict',
  'provider-timeout',
  'provider-error',
  'provider-stale'
];

const CARD_NUMBER = /\b(?:\d[ -]*?){13,19}\b/;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/;
const SORT_CODE = /\b\d{2}-\d{2}-\d{2}\b/;
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+)/g;
const URL_HOST = /\bhttps?:\/\/([^/\s'"]+)/gi;
const LIVE_PAYMENT_HOST = /(^|\.)(paypal\.com|stripe\.com|square\.com|venmo\.com|wise\.com|revolut\.com)$/i;

const isExampleHost = (host) => /^([a-z0-9-]+\.)*[a-z0-9-]+\.example$/.test(String(host).toLowerCase());

function walkStrings(value, path, out) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) walkStrings(child, `${path}.${key}`, out);
  }
  return out;
}

function assertNoSensitiveData(value, label) {
  for (const [path, text] of walkStrings(value, '$', [])) {
    assert.ok(!CARD_NUMBER.test(text), `${label} ${path}: looks like a card number`);
    assert.ok(!IBAN.test(text), `${label} ${path}: looks like an IBAN`);
    assert.ok(!SORT_CODE.test(text), `${label} ${path}: looks like a sort code`);
    for (const match of text.matchAll(EMAIL)) {
      assert.ok(isExampleHost(match[1].toLowerCase()), `${label} ${path}: non-example email domain ${match[1]}`);
    }
    for (const match of text.matchAll(URL_HOST)) {
      const host = match[1].toLowerCase();
      const localDemo = /\.observation\.pageKey$/.test(path) && ['http://127.0.0.1:4173/demo/index.html','http://localhost:4173/demo/index.html'].includes(text);
      assert.ok(isExampleHost(host) || localDemo, `${label} ${path}: non-example URL host ${host}`);
      assert.ok(!LIVE_PAYMENT_HOST.test(host), `${label} ${path}: live payment host ${host}`);
    }
  }
}

function assertLink(link, label) {
  assert.equal(typeof link.label, 'string', `${label}: label`);
  assert.ok(isExampleHost(link.hostname), `${label}: hostname ${link.hostname}`);
  assert.ok(link.pathname.startsWith('/'), `${label}: pathname`);
}

function assertEvidence(evidence, label) {
  assert.equal(typeof evidence.id, 'string', `${label}: id`);
  assert.ok(EVIDENCE_KINDS.includes(evidence.kind), `${label}: kind ${evidence.kind}`);
  assert.ok(EVIDENCE_STATUSES.includes(evidence.status), `${label}: status ${evidence.status}`);
  assert.ok(SOURCE_TYPES.includes(evidence.sourceType), `${label}: sourceType`);
  assert.equal(typeof evidence.sourceLabel, 'string', `${label}: sourceLabel`);
  assert.ok(evidence.sourceUrl === null || /^https:\/\//.test(evidence.sourceUrl), `${label}: sourceUrl`);
  if (evidence.sourceUrl) assert.ok(isExampleHost(new URL(evidence.sourceUrl).hostname), `${label}: sourceUrl host`);
  assert.ok(evidence.checkedAt === null || !Number.isNaN(Date.parse(evidence.checkedAt)), `${label}: checkedAt`);
  assert.equal(typeof evidence.summary, 'string', `${label}: summary`);
  assert.equal(typeof evidence.detail, 'string', `${label}: detail`);
  assert.ok(evidence.summary.length > 0 && evidence.detail.length > 0, `${label}: non-empty summary/detail`);
}

function assertObservation(observation, label) {
  assert.equal(observation.schemaVersion, 1, `${label}: schemaVersion`);
  for (const key of ['scanId', 'pageKey', 'capturedAt', 'hostname', 'visibleTextExcerpt']) {
    assert.equal(typeof observation[key], 'string', `${label}: ${key}`);
  }
  assert.ok(!Number.isNaN(Date.parse(observation.capturedAt)), `${label}: capturedAt`);
  assert.ok(['https:', 'http:'].includes(observation.protocol), `${label}: protocol`);
  assert.equal(typeof observation.checkoutDetected, 'boolean', `${label}: checkoutDetected`);
  assert.ok(Array.isArray(observation.checkoutSignals), `${label}: checkoutSignals`);
  assert.ok(Array.isArray(observation.paymentClaims), `${label}: paymentClaims`);
  assert.ok(observation.advertisedDiscountPercent === null || typeof observation.advertisedDiscountPercent === 'number');
  const demo = ['suspicious-shoes','matching-shoes','unknown-shoes'].includes(observation.demoScenarioId);
  if(demo) {
    assert.ok(['http://127.0.0.1:4173/demo/index.html','http://localhost:4173/demo/index.html'].includes(observation.pageKey), `${label}: synthetic observations require the exact local demo origin/path`);
    assert.equal(observation.protocol,'http:');
  } else assert.equal(observation.demoScenarioId, null, `${label}: live evaluator vectors cannot enable a demo scenario`);
  assert.ok(Array.isArray(observation.links), `${label}: links`);
  observation.links.forEach((link, i) => assertLink(link, `${label}.links[${i}]`));
  assert.ok(isExampleHost(observation.hostname) || (demo && ['127.0.0.1','localhost'].includes(observation.hostname)), `${label}: hostname`);
  assert.equal(observation.hostname, observation.hostname.toLowerCase(), `${label}: hostname normalised`);
  assert.equal(new URL(observation.pageKey).hostname, observation.hostname, `${label}: pageKey host`);
  assert.ok(!/[?#]/.test(observation.pageKey), `${label}: pageKey omits query/fragment`);
}

function assertExpected(expected, label) {
  assert.ok(VERDICTS.includes(expected.verdict), `${label}: verdict ${expected.verdict}`);
  assert.ok(IDENTITIES.includes(expected.identityStatus), `${label}: identityStatus`);
  assert.ok(Array.isArray(expected.reasonKinds) && expected.reasonKinds.length > 0, `${label}: reasonKinds`);
  for (const kind of expected.reasonKinds) {
    assert.ok(REASON_KIND_VOCABULARY.includes(kind), `${label}: unknown reasonKind ${kind}`);
  }
  for (const verdict of expected.forbiddenVerdicts ?? []) assert.ok(VERDICTS.includes(verdict), `${label}: forbidden verdict`);
  for (const status of expected.forbiddenIdentityStatuses ?? []) assert.ok(IDENTITIES.includes(status), `${label}: forbidden identity`);
  assert.ok(!(expected.forbiddenVerdicts ?? []).includes(expected.verdict), `${label}: expected verdict is forbidden`);
  assert.ok(!(expected.forbiddenIdentityStatuses ?? []).includes(expected.identityStatus), `${label}: expected identity is forbidden`);
}

test('schema tests stay independent of the evaluator implementation', () => {
  const source = readText('tests/fixtures/schema.test.cjs');
  assert.equal(/src\/runtime/.test(source), false);
  assert.equal(/src\/risk/.test(source), false);
  assert.equal(/fallback\.js/.test(source), false);
  assert.equal(/\brequire\s*\(\s*['"][^'"]*src\//.test(source), false);
});

test('fixtures/scenarios.json: shop records and vocabulary', () => {
  assert.equal(scenariosFile.schemaVersion, 1);
  assert.equal(scenariosFile.contractVersion, 1);
  assert.deepEqual(scenariosFile.reasonKindVocabulary, REASON_KIND_VOCABULARY);
  assert.ok(Array.isArray(scenarios));
  assert.deepEqual(scenarios.map((record) => record.id), SHOP_IDS);
  assert.equal(scenariosFile.directory.solehouseExactHost, 'shop.solehouse.example');
  assert.ok(isExampleHost(scenariosFile.directory.solehouseExactHost));

  for (const record of scenarios) {
    for (const key of REQUIRED_SCENARIO_KEYS) {
      assert.ok(Object.hasOwn(record, key), `${record.id}: missing ${key}`);
    }
    assert.equal(record.audience, 'shop', `${record.id}: audience`);
    assert.equal(typeof record.displayName, 'string');
    assert.equal(typeof record.claimedBrand, 'string');
    assert.ok(isExampleHost(record.simulatedHostname), `${record.id}: simulatedHostname`);
    assert.equal(record.protocol, 'https:');
    assert.equal(typeof record.product.name, 'string');
    assert.equal(typeof record.product.price, 'number');
    assert.ok(record.product.price > 0);
    assert.equal(record.product.currency, 'GBP');
    assert.ok(
      record.product.advertisedDiscountPercent === null
      || (record.product.advertisedDiscountPercent > 0 && record.product.advertisedDiscountPercent < 100)
    );
    assert.ok(Array.isArray(record.visibleClaims) && record.visibleClaims.length >= 2, `${record.id}: visibleClaims`);
    assert.ok(Array.isArray(record.paymentClaims), `${record.id}: paymentClaims`);
    assert.ok(Array.isArray(record.links));
    record.links.forEach((link, i) => {
      assertLink(link, `${record.id}.links[${i}]`);
      assert.equal(link.hostname, record.simulatedHostname, `${record.id}: link stays on simulated host`);
    });
    assert.ok(Array.isArray(record.syntheticIdentityEvidence));
    record.syntheticIdentityEvidence.forEach((evidence, i) => {
      assertEvidence(evidence, `${record.id}.syntheticIdentityEvidence[${i}]`);
      assert.equal(evidence.sourceType, 'synthetic');
    });
    assertExpected(record.expected, record.id);
  }

  const hosts = scenarios.map((record) => record.simulatedHostname);
  assert.equal(new Set(hosts).size, hosts.length, 'distinct shop hostnames');
});

test('shop scenario expected outcomes are independently specified', () => {
  const byId = Object.fromEntries(scenarios.map((record) => [record.id, record]));

  const suspicious = byId['suspicious-shoes'];
  assert.equal(suspicious.simulatedHostname, 'solehouse-outlet.example');
  assert.equal(suspicious.claimedBrand, 'Solehouse');
  assert.deepEqual(
    [suspicious.product.name, suspicious.product.price, suspicious.product.currency, suspicious.product.advertisedDiscountPercent],
    ['Studio Runner 01', 14, 'GBP', 90]
  );
  assert.match(suspicious.visibleClaims.join(' '), /bank transfer only/i);
  assert.match(suspicious.visibleClaims.join(' '), /verified store/i);
  assert.equal(suspicious.links.some((link) => /contact/i.test(`${link.label} ${link.pathname}`)), false);
  assert.equal(suspicious.links.some((link) => /return|refund/i.test(`${link.label} ${link.pathname}`)), false);
  assert.ok(suspicious.syntheticIdentityEvidence.every((evidence) => evidence.status === 'mismatch'));
  assert.equal(suspicious.expected.verdict, 'warning');
  assert.equal(suspicious.expected.identityStatus, 'mismatch');
  assert.deepEqual(suspicious.expected.reasonKinds, [
    'identity-mismatch',
    'unusual-payment',
    'urgent-offer',
    'missing-returns',
    'self-claimed-verification'
  ]);

  const matching = byId['matching-shoes'];
  assert.equal(matching.simulatedHostname, 'shop.solehouse.example');
  assert.equal(matching.claimedBrand, 'Solehouse');
  assert.deepEqual(
    [matching.product.price, matching.product.currency, matching.product.advertisedDiscountPercent],
    [140, 'GBP', null]
  );
  assert.equal(/bank transfer/i.test(matching.visibleClaims.join(' ')), false);
  assert.match(matching.visibleClaims.join(' '), /cards? accepted/i);
  assert.deepEqual(matching.links.map((link) => link.label), ['Contact', 'Returns & refunds', 'About the demo']);
  assert.equal(matching.syntheticIdentityEvidence.length, 1);
  assert.equal(matching.syntheticIdentityEvidence[0].status, 'matched');
  assert.equal(matching.expected.verdict, 'no_flags');
  assert.equal(matching.expected.identityStatus, 'demo_match');
  assert.notEqual(matching.expected.identityStatus, 'verified');
  assert.deepEqual(matching.expected.reasonKinds, ['identity-demo-match', 'sample-only']);

  const unknown = byId['unknown-shoes'];
  assert.equal(unknown.simulatedHostname, 'north-quay-footwear.example');
  assert.notEqual(unknown.claimedBrand, 'Solehouse');
  assert.equal(unknown.product.advertisedDiscountPercent, null);
  assert.deepEqual(unknown.syntheticIdentityEvidence, []);
  assert.equal(/bank transfer/i.test(unknown.visibleClaims.join(' ')), false);
  assert.match(unknown.visibleClaims.join(' '), /4\.9 stars from our customers/i);
  assert.equal(unknown.expected.verdict, 'uncertain');
  assert.equal(unknown.expected.identityStatus, 'unverified');
  assert.deepEqual(unknown.expected.reasonKinds, ['identity-unverified', 'self-asserted-reviews']);
});

test('tests/fixtures/vectors.json: evaluator cases and expected outcomes', () => {
  assert.equal(vectorFile.schemaVersion, 1);
  assert.equal(vectorFile.contractVersion, 1);
  assert.deepEqual(vectorFile.reasonKindVocabulary, REASON_KIND_VOCABULARY);
  const ids = vectors.map((vector) => vector.id);
  assert.equal(new Set(ids).size, ids.length, 'unique vector ids');
  for (const id of REQUIRED_VECTOR_IDS) assert.ok(ids.includes(id), `missing vector ${id}`);

  for (const vector of vectors) {
    assert.equal(vector.audience, 'evaluator', `${vector.id}: audience`);
    assert.equal(SHOP_IDS.includes(vector.id), false, `${vector.id}: must not reuse frozen demoScenarioId values`);
    assertObservation(vector.observation, vector.id);
    assert.ok(Array.isArray(vector.evidence) && vector.evidence.length > 0, `${vector.id}: evidence`);
    vector.evidence.forEach((evidence) => assertEvidence(evidence, `${vector.id}.${evidence.id}`));
    const evidenceIds = vector.evidence.map((evidence) => evidence.id);
    assert.equal(new Set(evidenceIds).size, evidenceIds.length, `${vector.id}: unique evidence ids`);
    assertExpected(vector.expected, vector.id);
    for (const id of vector.expected.degradedEvidenceIds ?? []) {
      const evidence = vector.evidence.find((item) => item.id === id);
      assert.ok(evidence && DEGRADED.includes(evidence.status), `${vector.id}: degraded ${id}`);
    }
  }

  const byId = Object.fromEntries(vectors.map((vector) => [vector.id, vector]));

  const suffix = byId['deceptive-suffix'];
  assert.equal(suffix.observation.hostname, 'officialsolehouse.example.attacker.example');
  assert.equal(suffix.observation.hostname.includes('solehouse'), true);
  assert.equal(suffix.observation.hostname.includes('solehouse.example'), true);
  assert.notEqual(suffix.observation.hostname, 'shop.solehouse.example');
  assert.equal(suffix.expected.verdict, 'warning');
  assert.equal(suffix.expected.identityStatus, 'mismatch');
  assert.deepEqual(suffix.expected.reasonKinds, ['deceptive-suffix', 'identity-mismatch']);

  const httpsOnly = byId['https-only-unknown'];
  assert.equal(httpsOnly.observation.hostname, 'kiln-bridge-shoes.example');
  assert.equal(httpsOnly.observation.protocol, 'https:');
  assert.equal(httpsOnly.observation.advertisedDiscountPercent, null);
  assert.deepEqual(httpsOnly.observation.paymentClaims, []);
  assert.equal(httpsOnly.expected.verdict, 'uncertain');
  assert.equal(httpsOnly.expected.identityStatus, 'unverified');
  assert.deepEqual(httpsOnly.expected.reasonKinds, ['identity-unverified', 'https-not-identity']);
  assert.ok(httpsOnly.expected.forbiddenVerdicts.includes('no_flags'));
  assert.ok(httpsOnly.evidence.some((evidence) => evidence.kind === 'transport' && evidence.status === 'observed'));
  assert.ok(httpsOnly.evidence.some((evidence) => evidence.kind === 'identity' && evidence.status === 'not_checked'));

  const missing = byId['missing-checks'];
  assert.equal(missing.expected.verdict, 'uncertain');
  assert.equal(missing.expected.identityStatus, 'unverified');
  assert.deepEqual(missing.expected.reasonKinds, ['missing-identity', 'missing-returns']);
  assert.ok(missing.evidence.every((evidence) => DEGRADED.includes(evidence.status)));

  const conflict = byId['identity-conflict'];
  assert.equal(conflict.expected.verdict, 'warning');
  assert.equal(conflict.expected.identityStatus, 'mismatch');
  assert.deepEqual(conflict.expected.reasonKinds, ['identity-mismatch']);
  assert.ok(conflict.expected.forbiddenIdentityStatuses.includes('verified'));
  assert.ok(conflict.expected.forbiddenIdentityStatuses.includes('demo_match'));
  const matchedIdentities = conflict.evidence.filter((evidence) => evidence.kind === 'identity' && evidence.status === 'matched');
  assert.equal(matchedIdentities.length, 2);
  assert.notEqual(matchedIdentities[0].sourceLabel, matchedIdentities[1].sourceLabel);

  const timeout = byId['provider-timeout'];
  assert.equal(timeout.observation.hostname, 'shop.solehouse.example');
  assert.equal(timeout.evidence[0].status, 'unavailable');
  assert.equal(timeout.expected.verdict, 'uncertain');
  assert.equal(timeout.expected.identityStatus, 'unverified');
  assert.deepEqual(timeout.expected.reasonKinds, ['provider-unavailable', 'missing-identity']);

  const providerError = byId['provider-error'];
  assert.equal(providerError.evidence[0].status, 'error');
  assert.equal(providerError.expected.verdict, 'error');
  assert.equal(providerError.expected.identityStatus, 'unverified');
  assert.deepEqual(providerError.expected.reasonKinds, ['provider-error']);

  const stale = byId['provider-stale'];
  assert.equal(stale.evidence[0].status, 'stale');
  assert.equal(stale.evidence[0].sourceType, 'synthetic');
  assert.equal(stale.expected.verdict, 'uncertain');
  assert.equal(stale.expected.identityStatus, 'unverified');
  assert.deepEqual(stale.expected.reasonKinds, ['provider-stale']);
});

test('hostname comparison is exact-host only', () => {
  for (const comparison of vectorFile.hostnameComparisonVectors) {
    assert.ok(isExampleHost(comparison.registeredHostname), `${comparison.id}: registered`);
    assert.ok(isExampleHost(comparison.observedHostname), `${comparison.id}: observed`);
    const matches = comparison.registeredHostname.toLowerCase() === comparison.observedHostname.toLowerCase();
    assert.equal(matches, comparison.mustMatch, comparison.id);
    if (!comparison.mustMatch) {
      assert.ok(
        comparison.observedHostname.toLowerCase().includes(comparison.claimedBrand.toLowerCase()),
        `${comparison.id}: contains brand so includes() would wrongly pass`
      );
    }
  }
  const deceptive = vectorFile.hostnameComparisonVectors.find((item) => item.id === 'host-officialbrand-attacker-suffix');
  assert.equal(deceptive.observedHostname, 'officialbrand.example.attacker.example');
  assert.equal(deceptive.mustMatch, false);
});

test('fixtures contain only reserved example hosts and no live payment data', () => {
  assertNoSensitiveData(scenariosFile, 'scenarios.json');
  assertNoSensitiveData(vectorFile, 'vectors.json');
});

test('C1 can import the scenarios wrapper without reading expected outcomes', () => {
  function asList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.scenarios)) return data.scenarios;
    return [];
  }
  const records = asList(scenariosFile).filter((item) => SHOP_IDS.includes(item.id));
  assert.equal(records.length, 3);
  for (const record of records) {
    assert.equal(typeof record.product.name, 'string');
    assert.ok(Array.isArray(record.visibleClaims));
    assert.ok(Array.isArray(record.links));
    assert.ok(Object.hasOwn(record, 'expected'));
    assert.ok(Object.hasOwn(record, 'syntheticIdentityEvidence'));
  }
});
