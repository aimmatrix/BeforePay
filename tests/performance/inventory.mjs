#!/usr/bin/env node
/**
 * Static dependency and network-origin inventory for BeforePay.
 * Zero extra packages. Does not load the extension or claim runtime timing.
 *
 * Usage (from assigned worktree):
 *   node tests/performance/inventory.mjs
 *   node tests/performance/inventory.mjs --json > tests/performance/results/inventory.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const allowlist = JSON.parse(
  fs.readFileSync(path.join(root, 'tests/performance/allowlist.json'), 'utf8')
);

const PRODUCT_TOP = new Set([
  'src',
  'extension',
  'demo',
  'assets',
  'server',
  'scripts',
  'dist',
  'package.json',
  'server.cjs'
]);

const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.json', '.html', '.css', '.svg', '.md'
]);

const URL_RE = /https?:\/\/[^\s"'`<>)\\]+/gi;
const FETCH_RE = /\bfetch\s*\(/;
const XHR_RE = /\bXMLHttpRequest\b/;
const BEACON_RE = /\bsendBeacon\s*\(/;
const WS_RE = /\bWebSocket\b/;
const IMPORT_URL_RE = /\bimport\s*\(\s*['"]https?:/;
const SCRIPT_SRC_RE = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
const LINK_HREF_RE = /<link[^>]+href\s*=\s*["']([^"']+)["']/gi;
const CSS_IMPORT_RE = /@import\s+(?:url\()?['"]([^'"]+)['"]/gi;

function isProductPath(rel) {
  const top = rel.split(path.sep)[0];
  return PRODUCT_TOP.has(rel) || PRODUCT_TOP.has(top);
}

function shouldSkip(rel) {
  const parts = rel.split(path.sep);
  if (parts.includes('node_modules') || parts.includes('.git')) return true;
  if (!isProductPath(rel) && parts.length > 0 && !PRODUCT_TOP.has(parts[0])) return true;
  return !isProductPath(rel);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs);
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (TEXT_EXT.has(path.extname(entry.name))) out.push(rel);
  }
  return out;
}

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function collectMatches(text, re) {
  const found = [];
  const clone = new RegExp(re.source, re.flags);
  let m;
  while ((m = clone.exec(text))) found.push(m[1] || m[0]);
  return found;
}

function isRemote(url) {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome-extension:')) return false;
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return false;
  return /^https?:\/\//i.test(url);
}

const files = walk(root);
const urls = [];
const scriptSrc = [];
const linkHref = [];
const cssImport = [];
const apiUse = { fetch: [], xhr: [], beacon: [], websocket: [], dynamicHttpImport: [] };

for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const url of collectMatches(text, URL_RE)) {
    urls.push({ file: rel, url });
  }
  for (const src of collectMatches(text, SCRIPT_SRC_RE)) {
    scriptSrc.push({ file: rel, src, remote: isRemote(src) });
  }
  for (const href of collectMatches(text, LINK_HREF_RE)) {
    linkHref.push({ file: rel, href, remote: isRemote(href) });
  }
  for (const href of collectMatches(text, CSS_IMPORT_RE)) {
    cssImport.push({ file: rel, href, remote: isRemote(href) });
  }
  if (FETCH_RE.test(text)) apiUse.fetch.push(rel);
  if (XHR_RE.test(text)) apiUse.xhr.push(rel);
  if (BEACON_RE.test(text)) apiUse.beacon.push(rel);
  if (WS_RE.test(text)) apiUse.websocket.push(rel);
  if (IMPORT_URL_RE.test(text)) apiUse.dynamicHttpImport.push(rel);
}

const pkg = readJson('package.json') || { dependencies: {}, devDependencies: {} };
const manifest = readJson('extension/manifest.json');
const lockExists = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].filter((f) =>
  fs.existsSync(path.join(root, f))
);

const deps = Object.keys(pkg.dependencies || {});
const devDeps = Object.keys(pkg.devDependencies || {});
const extraDeps = deps.filter((d) => !allowlist.allowedNpmPackages.includes(d));
const extraDevDeps = devDeps.filter((d) => !allowlist.allowedDevNpmPackages.includes(d));

function classifyUrl(raw) {
  if (!raw) return 'empty';
  if ((allowlist.ignoredExactUrls || []).includes(raw)) return 'ignored';
  if (raw.includes('*')) return 'match-pattern';
  try {
    const u = new URL(raw);
    if (u.hostname.endsWith('.example')) return 'synthetic';
    if (allowlist.demoHttpOrigins.includes(u.origin)) return 'demo';
    if ((allowlist.remoteEvidenceOrigins || []).includes(u.origin)) return 'approved-provider';
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return 'local-unlisted-port';
    return 'remote';
  } catch {
    return 'unparsed';
  }
}

const classified = urls.map((row) => ({ ...row, class: classifyUrl(row.url) }));
const remoteUrls = classified.filter((row) => row.class === 'remote' || row.class === 'unparsed');

const forbiddenHits = classified.filter(
  (row) =>
    (row.class === 'remote' || row.class === 'unparsed') &&
    allowlist.forbiddenSubstrings.some((s) => row.url.toLowerCase().includes(s))
);
const localUnlisted = classified.filter((row) => row.class === 'local-unlisted-port');

const hostPermissions = manifest?.host_permissions || [];
const optionalHostPermissions = manifest?.optional_host_permissions || [];
const contentMatches = (manifest?.content_scripts || []).flatMap((cs) => cs.matches || []);

const findings = [];
if (extraDeps.length) {
  findings.push({
    severity: 'warning',
    owner: 'CORE',
    id: 'unexpected-runtime-dependency',
    detail: `package.json dependencies not on S4 allowlist: ${extraDeps.join(', ')}`
  });
}
if (extraDevDeps.length) {
  findings.push({
    severity: 'info',
    owner: 'CORE',
    id: 'unexpected-dev-dependency',
    detail: `package.json devDependencies not on S4 allowlist: ${extraDevDeps.join(', ')}`
  });
}
if (forbiddenHits.length) {
  findings.push({
    severity: 'warning',
    owner: 'CORE',
    id: 'forbidden-origin-string',
    detail: forbiddenHits
      .slice(0, 12)
      .map((h) => `${h.file}: ${h.url}`)
      .join('; ')
  });
}
if (remoteUrls.length) {
  findings.push({
    severity: 'warning',
    owner: 'CORE',
    id: 'remote-url-string',
    detail: remoteUrls
      .slice(0, 12)
      .map((h) => `${h.file}: ${h.url}`)
      .join('; ')
  });
}
if (localUnlisted.length) {
  findings.push({
    severity: 'info',
    owner: 'CORE',
    id: 'local-origin-not-on-demo-allowlist',
    detail: localUnlisted
      .slice(0, 8)
      .map((h) => `${h.file}: ${h.url}`)
      .join('; ')
  });
}
const remoteScripts = scriptSrc.filter((s) => s.remote);
if (remoteScripts.length) {
  findings.push({
    severity: 'warning',
    owner: 'CORE',
    id: 'remote-script',
    detail: remoteScripts.map((s) => `${s.file}: ${s.src}`).join('; ')
  });
}
const remoteLinks = [...linkHref, ...cssImport].filter((s) => s.remote);
if (remoteLinks.length) {
  findings.push({
    severity: 'warning',
    owner: 'PIP or CORE',
    id: 'remote-stylesheet-or-font',
    detail: remoteLinks.map((s) => `${s.file}: ${s.href}`).join('; ')
  });
}

const report = {
  schemaVersion: 1,
  kind: 'static-inventory',
  measured: true,
  runtimeTimingMeasured: false,
  root,
  generatedAt: new Date().toISOString(),
  package: {
    name: pkg.name || null,
    version: pkg.version || null,
    dependencies: deps,
    devDependencies: devDeps,
    lockfiles: lockExists
  },
  manifest: manifest
    ? {
        manifest_version: manifest.manifest_version,
        permissions: manifest.permissions || [],
        host_permissions: hostPermissions,
        optional_host_permissions: optionalHostPermissions,
        content_scripts_matches: contentMatches,
        web_accessible_resources: manifest.web_accessible_resources || []
      }
    : null,
  networkStrings: {
    httpUrls: classified.slice(0, 80),
    remoteHttpUrlsOutsideAllowlist: remoteUrls,
    localUnlistedPorts: localUnlisted,
    forbiddenHits,
    scriptSrc,
    linkHref,
    cssImport,
    apiUse
  },
  findings
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log('BeforePay S4 static inventory');
  console.log(`root: ${root}`);
  console.log(`files scanned: ${files.length}`);
  console.log(`runtime deps: ${deps.length ? deps.join(', ') : '(none)'}`);
  console.log(`dev deps: ${devDeps.length ? devDeps.join(', ') : '(none)'}`);
  console.log(`lockfiles: ${lockExists.length ? lockExists.join(', ') : '(none)'}`);
  console.log(`manifest permissions: ${(manifest?.permissions || []).join(', ') || '(none)'}`);
  console.log(`host_permissions: ${hostPermissions.join(', ') || '(none)'}`);
  console.log(`content_scripts matches: ${contentMatches.join(', ') || '(none)'}`);
  console.log(`remote URLs outside allowlist: ${remoteUrls.length}`);
  console.log(`forbidden origin hits: ${forbiddenHits.length}`);
  console.log(`findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`- [${f.severity}] ${f.id} → ${f.owner}: ${f.detail}`);
  }
  if (!findings.length) console.log('- no static allowlist findings in scanned files');
  console.log('This is not a scan-timing result. Runtime probes wait for GO.');
}
