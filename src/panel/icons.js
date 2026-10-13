const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {Document} doc
 * @param {(svg: SVGElement) => void} draw
 * @returns {SVGElement}
 */
function icon(doc, draw) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'bp-icon');
  draw(svg);
  return svg;
}

function stroke(doc, name, attrs) {
  const node = doc.createElementNS(SVG_NS, name);
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '1.75');
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function warningIcon(doc) {
  return icon(doc, (svg) => {
    svg.appendChild(stroke(doc, 'path', { d: 'M12 3.6 21.2 20H2.8L12 3.6z' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M12 10v4.5' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M12 17.4h.01' }));
  });
}

function uncertainIcon(doc) {
  return icon(doc, (svg) => {
    const circle = stroke(doc, 'circle', { cx: '12', cy: '12', r: '8.2' });
    circle.setAttribute('stroke-dasharray', '2.5 2.5');
    svg.appendChild(circle);
    svg.appendChild(stroke(doc, 'path', { d: 'M9.4 9.4a2.6 2.6 0 1 1 3.4 2.46c-.7.28-1.2.9-1.2 1.64V14' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M12 17.2h.01' }));
  });
}

function shieldIcon(doc) {
  return icon(doc, (svg) => {
    svg.appendChild(stroke(doc, 'path', { d: 'M12 3.4 19 6.2v5.3c0 4.3-2.9 7.3-7 8.7-4.1-1.4-7-4.4-7-8.7V6.2L12 3.4z' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M8.8 12.1 11.1 14.4 15.4 9.6' }));
  });
}

function errorIcon(doc) {
  return icon(doc, (svg) => {
    svg.appendChild(stroke(doc, 'circle', { cx: '12', cy: '12', r: '8.2' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M9 9l6 6' }));
    svg.appendChild(stroke(doc, 'path', { d: 'M15 9l-6 6' }));
  });
}

function checkingIcon(doc) {
  return icon(doc, (svg) => {
    svg.setAttribute('class', 'bp-icon bp-icon-checking');
    const arc = stroke(doc, 'circle', { cx: '12', cy: '12', r: '8.2' });
    arc.setAttribute('stroke-dasharray', '12 38');
    svg.appendChild(arc);
  });
}

function idleIcon(doc) {
  return icon(doc, (svg) => {
    svg.appendChild(stroke(doc, 'path', { d: 'M12 3.4 19 6.2v5.3c0 4.3-2.9 7.3-7 8.7-4.1-1.4-7-4.4-7-8.7V6.2L12 3.4z' }));
  });
}

/**
 * @param {Document} doc
 * @param {string} view
 * @returns {SVGElement}
 */
export function statusIcon(doc, view) {
  switch (view) {
    case 'warning':
      return warningIcon(doc);
    case 'uncertain':
      return uncertainIcon(doc);
    case 'demo-match':
    case 'no-flags':
      return shieldIcon(doc);
    case 'error':
      return errorIcon(doc);
    case 'checking':
      return checkingIcon(doc);
    default:
      return idleIcon(doc);
  }
}
