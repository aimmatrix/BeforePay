import {DEMO_ORIGINS, DEMO_PATHS} from '../evidence/demo-directory.js';
const SCENARIOS = new Set(['suspicious-shoes','matching-shoes','unknown-shoes']);
export function demoScenario(url) {
  if (!DEMO_ORIGINS.includes(url.origin) || !DEMO_PATHS.includes(url.pathname)) return null;
  const raw = url.searchParams.get('scenario');
  const id = raw === 'clean' ? 'matching-shoes' : raw === 'risky' ? 'suspicious-shoes' : raw || 'suspicious-shoes';
  return SCENARIOS.has(id) ? id : null;
}
export function supportedUrl(url) {
  return ['http:','https:'].includes(url.protocol) && !/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|accounts\.google\.com)$/.test(url.hostname.toLowerCase().replace(/\.+$/, ''));
}

const EXCLUDED='script,style,noscript,input,textarea,select,[contenteditable],#beforepay-root,[data-beforepay-root],dialog,[data-personal-info],[hidden]';
function visible(element) {
  const style=getComputedStyle(element);
  return !element.hidden && element.getAttribute('hidden')===null && element.getClientRects().length>0
    && !['hidden','collapse'].includes(style.visibility) && style.display!=='none';
}
function readable(element) {
  for(let node=element;node?.nodeType===1;node=node.parentNode) if(node.matches(EXCLUDED)||!visible(node))return false;
  return true;
}
function visibleText(root) {
  if(!readable(root))return '';
  const copy=root.cloneNode(true);
  function prune(original,cloned) {
    const originals=[...original.children],clones=[...cloned.children];
    originals.forEach((child,i)=>{if(!readable(child))clones[i].remove();else prune(child,clones[i]);});
  }
  prune(root,copy);return copy.textContent||'';
}
export function checkoutContext(doc, url) {
  const demo = demoScenario(url);
  if (demo) return {detected: url.hash === '#checkout', signals: url.hash === '#checkout' ? ['Demo checkout route'] : []};
  const signals = [];
  if (/\/(checkout|payment|billing)(\/|$)/i.test(url.pathname)) signals.push('Checkout route');
  if (/^#\/?(?:checkout|payment)(?:\/|$)/i.test(url.hash)) signals.push('Checkout hash route');
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
  const text=roots.map(visibleText).join(' ').replace(/\s+/g,' ').trim().slice(0,14000);
  const links = [...doc.querySelectorAll('a[href]')].filter(readable).slice(0,100).flatMap(el => {
    try { const link = new URL(el.getAttribute('href'), url); return ['http:','https:'].includes(link.protocol) && !link.username && !link.password ? [{label:visibleText(el).trim().slice(0,120), hostname:link.hostname, pathname:link.pathname}] : []; } catch {return [];}
  });
  const discounts = [...text.matchAll(/\b(\d{1,3})\s*%\s*(?:off|discount)/gi)].map(x=>Number(x[1])).filter(x=>x>=0&&x<=100);
  const paymentClaims = [];
  if (/bank\s+transfer\s+only|(?:only|exclusively)\s+(?:pay|payment|payments)\s+(?:by|via)\s+bank\s+transfer/i.test(text)) paymentClaims.push('Bank transfer only');
  return {schemaVersion:1,scanId,pageKey:url.origin+url.pathname,capturedAt:new Date().toISOString(),hostname:url.hostname.toLowerCase().replace(/\.+$/,''),protocol:url.protocol,checkoutDetected:context.detected,checkoutSignals:context.signals,visibleTextExcerpt:text,links,advertisedDiscountPercent:discounts.length?Math.max(...discounts):null,paymentClaims,demoScenarioId:scenario};
}
