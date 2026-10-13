/**
 * Hostname comparison for identity checks.
 * Rule: identity matches only on exact, normalised host equality against an explicit
 * allow-list. No substring, prefix, suffix or "registrable domain" shortcuts.
 */

export function normalizeHost(value) {
  if (typeof value !== 'string') return '';
  let host = value.trim().toLowerCase();
  while (host.endsWith('.')) host = host.slice(0, -1);
  if (!/^[a-z0-9.-]+$/.test(host) && !/[^\x00-\x7f]/.test(host)) return '';
  return host;
}

/** True only when `observed` equals one of `allowedHosts` exactly after normalisation. */
export function exactHostMatch(observed, allowedHosts) {
  const host = normalizeHost(observed);
  if (!host || !Array.isArray(allowedHosts)) return false;
  return allowedHosts.some(allowed => normalizeHost(allowed) === host);
}

export function hasInternationalLabel(host) {
  const h = normalizeHost(host);
  return /[^\x00-\x7f]/.test(h) || h.split('.').some(label => label.startsWith('xn--'));
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const compact = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Explains why `observed` resembles a listed host or brand without being it.
 * Returns plain-language reasons (empty when there is no resemblance or it is an exact match).
 */
export function lookalikeReasons(observed, allowedHosts, brandName) {
  const host = normalizeHost(observed);
  if (!host || exactHostMatch(host, allowedHosts)) return [];
  const reasons = [];
  for (const raw of allowedHosts || []) {
    const allowed = normalizeHost(raw);
    if (!allowed) continue;
    if (host.startsWith(allowed + '.')) reasons.push(`It begins with ${allowed} but continues to a different domain.`);
    else if (host.endsWith('.' + allowed)) reasons.push(`It is a different host under ${allowed}, not the listed host.`);
    const a = compact(host.split('.').slice(0, -1).join('')), b = compact(allowed.split('.').slice(0, -1).join(''));
    const d = editDistance(a, b);
    if (a && b && d > 0 && d <= 2) reasons.push(`Its name differs from ${allowed} by only ${d} character${d === 1 ? '' : 's'}.`);
  }
  const brand = compact(brandName);
  if (brand.length >= 4 && compact(host).includes(brand)) reasons.push(`It contains the name "${brandName}" but is not the listed host.`);
  if (hasInternationalLabel(host)) reasons.push('It uses internationalised characters, which can imitate other names.');
  return [...new Set(reasons)];
}
