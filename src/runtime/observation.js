const DEMO_ORIGINS = new Set(['http://127.0.0.1:4173', 'http://localhost:4173', 'http://127.0.0.1:4174', 'http://localhost:4174']);
const SCENARIOS = new Set(['suspicious-shoes','matching-shoes','unknown-shoes']);
export function demoScenario(url) {
  if (!DEMO_ORIGINS.has(url.origin) || !['/demo/index.html','/'].includes(url.pathname)) return null;
  const raw = url.searchParams.get('scenario');
  const id = raw === 'clean' ? 'matching-shoes' : raw === 'risky' ? 'suspicious-shoes' : raw || 'suspicious-shoes';
  return SCENARIOS.has(id) ? id : null;
}
export function supportedUrl(url) {
  return ['http:','https:'].includes(url.protocol) && !/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|accounts\.google\.com)$/.test(url.hostname);
}
function visible(element) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}
export function checkoutContext(doc, url) {
  const demo = demoScenario(url);
  if (demo) return {detected: url.hash === '#checkout', signals: url.hash === '#checkout' ? ['Demo checkout route'] : []};
  const signals = [];
  if (/\/(checkout|payment|billing)(\/|$)/i.test(url.pathname)) signals.push('Checkout route');
  const buttons = [...doc.querySelectorAll('button,[role="button"],input[type="submit"]')].filter(visible);
  if (buttons.some(el => /^(pay now|place order|complete purchase|complete order|pay securely|confirm and pay|buy now)\b/i.test((el.textContent || el.getAttribute('value') || '').trim()))) signals.push('Payment action visible');
  return {detected: signals.length > 0, signals};
}
export function collectObservation(doc, locationUrl, scanId) {
  const url = new URL(locationUrl);
  if (!supportedUrl(url)) throw new Error('This page is not supported. Open a shopping website to check its visible merchant information.');
  const scenario = demoScenario(url);
  const context = checkoutContext(doc, url);
  const sections = [...doc.querySelectorAll('main,footer,.announcement,[data-merchant-info]')];
  const roots = sections.length ? sections : [doc.body];
  const text = roots.filter(visible).map(root => {
    const copy = root.cloneNode(true);
    copy.querySelectorAll('script,style,noscript,input,textarea,select,[contenteditable],#beforepay-root,dialog,[data-personal-info],[hidden]').forEach(el => el.remove());
    return copy.textContent || '';
  }).join(' ').replace(/\s+/g,' ').trim().slice(0,14000);
  const links = [...doc.querySelectorAll('a[href]')].filter(visible).slice(0,100).flatMap(el => {
    try { const link = new URL(el.getAttribute('href'), url); return ['http:','https:'].includes(link.protocol) ? [{label:el.textContent.trim().slice(0,120), hostname:link.hostname, pathname:link.pathname}] : []; } catch {return [];}
  });
  const discounts = [...text.matchAll(/\b(\d{1,3})\s*%\s*(?:off|discount)/gi)].map(x=>Number(x[1])).filter(x=>x>=0&&x<=100);
  const paymentClaims = [];
  if (/bank\s+transfer\s+only|(?:only|exclusively)\s+(?:pay|payment|payments)\s+(?:by|via)\s+bank\s+transfer/i.test(text)) paymentClaims.push('Bank transfer only');
  return {schemaVersion:1,scanId,pageKey:url.origin+url.pathname,capturedAt:new Date().toISOString(),hostname:url.hostname.toLowerCase(),protocol:url.protocol,checkoutDetected:context.detected,checkoutSignals:context.signals,visibleTextExcerpt:text,links,advertisedDiscountPercent:discounts.length?Math.max(...discounts):null,paymentClaims,demoScenarioId:scenario};
}
