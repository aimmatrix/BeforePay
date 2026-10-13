/**
 * Pip's SVG figure, built once from a static spec with DOM calls (no
 * innerHTML, no interpolated data). Every pose variant is present in the
 * tree and tagged with `data-p="<states>"`; CSS shows the variants for the
 * root's current `data-state`, so update() never touches the SVG.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const INK = '#1E2722';
const CREAM = '#FBF6EA';

/** Create an SVG element, falling back to createElement for minimal DOMs. */
function svgEl(doc, tag, attrs = {}, children = []) {
  const node = typeof doc.createElementNS === 'function' ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  for (const child of children) node.appendChild(child);
  return node;
}

const SHOULDER_L = [38, 100];
const SHOULDER_R = [122, 100];

/** Arm variants: hand position and the states that use it. */
const LEFT_ARMS = [
  { hand: [20, 122], states: 'idle noticing checking warning identity_matched' },
  { hand: [10, 96], states: 'uncertain' },
  { hand: [24, 126], states: 'error' },
  { hand: [36, 128], states: 'dismissed' }
];
const RIGHT_ARMS = [
  { hand: [140, 122], states: 'idle identity_matched' },
  { hand: [148, 82], states: 'noticing' },
  { hand: [140, 100], states: 'checking', lens: true },
  { hand: [156, 64], states: 'warning', raise: true },
  { hand: [150, 96], states: 'uncertain' },
  { hand: [136, 126], states: 'error' },
  { hand: [124, 128], states: 'dismissed' }
];

const MOUTHS = [
  { d: 'M73 103 Q80 108 87 103', states: 'idle' },
  { d: 'M76 103 Q80 99 84 103 Q80 108 76 103 Z', states: 'noticing', filled: true },
  { d: 'M75 104 Q80 106 85 104', states: 'checking' },
  { d: 'M73 105 L87 105', states: 'warning' },
  { d: 'M71 104 Q75 101 79 104 Q83 107 87 104', states: 'uncertain' },
  { d: 'M71 101 Q80 110 89 101', states: 'identity_matched' },
  { d: 'M73 107 Q80 102 87 107', states: 'error' },
  { d: 'M76 104 Q80 106 84 104', states: 'dismissed' }
];

const BROWS = [
  { d: 'M57 69 Q63 64 69 67 M91 67 Q97 64 103 69', states: 'noticing' },
  { d: 'M57 73 L69 69 M91 69 L103 73', states: 'warning' },
  { d: 'M57 69 Q63 64 69 68 M91 72 L103 72', states: 'uncertain' }
];

/** Closed-eye variants (open eyes are built separately). */
const SHUT_EYES = [
  { d: 'M57 86 Q63 79 69 86 M91 86 Q97 79 103 86', states: 'identity_matched' },
  { d: 'M58 84 L70 84 M90 84 L102 84', states: 'error' },
  { d: 'M58 82 Q64 87 70 82 M90 82 Q96 87 102 82', states: 'dismissed' }
];

/** Badge glyphs, drawn in white on a circle centred at (124, 34). */
export const BADGE_GLYPHS = [
  { d: 'M117 34 L117.1 34 M124 34 L124.1 34 M131 34 L131.1 34', states: 'checking' },
  { d: 'M124 26 L124 35 M124 41 L124.1 41', states: 'warning' },
  { d: 'M119 29 Q119 23 124 23 Q130 23 129.5 29 Q129 33 124 34 L124 36 M124 41.5 L124.1 41.5', states: 'uncertain' },
  { d: 'M117 34 L122 39 L131 29', states: 'identity_matched' },
  { d: 'M119 29 L129 39 M129 29 L119 39', states: 'error' }
];
const BADGE_STATES = BADGE_GLYPHS.map((g) => g.states).join(' ');

function arm(doc, shoulder, spec, side) {
  const [hx, hy] = spec.hand;
  const [sx, sy] = spec.raise ? [shoulder[0], shoulder[1] - 6] : shoulder;
  const kids = [
    svgEl(doc, 'line', { class: 'pip-limb', x1: sx, y1: sy, x2: hx, y2: hy, 'stroke-width': 8, 'stroke-linecap': 'round' })
  ];
  if (spec.raise) {
    kids.push(
      svgEl(doc, 'circle', { class: 'pip-halo pip-g', cx: hx, cy: hy, r: 14, fill: 'none', 'stroke-width': 2.5 }),
      svgEl(doc, 'circle', { class: 'pip-hand', cx: hx - 9, cy: hy + 6, r: 4.5, 'stroke-width': 3 }),
      svgEl(doc, 'circle', { class: 'pip-hand', cx: hx, cy: hy, r: 10, 'stroke-width': 3 }),
      svgEl(doc, 'path', {
        class: 'pip-palm',
        d: `M${hx - 3} ${hy - 4} L${hx - 3} ${hy + 2} M${hx + 1} ${hy - 5} L${hx + 1} ${hy + 2} M${hx + 5} ${hy - 4} L${hx + 5} ${hy + 2}`,
        fill: 'none',
        'stroke-width': 2,
        'stroke-linecap': 'round'
      })
    );
  } else {
    kids.push(svgEl(doc, 'circle', { class: 'pip-hand', cx: hx, cy: hy, r: 7, 'stroke-width': 3 }));
  }
  if (spec.lens) {
    kids.push(
      svgEl(doc, 'line', { x1: 142, y1: 95, x2: 147, y2: 88, stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      svgEl(doc, 'circle', { cx: 151, cy: 81, r: 8, fill: '#FFFFFF', 'fill-opacity': 0.6, stroke: INK, 'stroke-width': 3 })
    );
  }
  const cls = `pip-arm pip-arm-${side}${spec.raise ? ' pip-arm-raise' : ''}`;
  return svgEl(doc, 'g', { class: cls, 'data-p': spec.states }, kids);
}

function openEyes(doc, ry, states, extraClass) {
  return svgEl(doc, 'g', { class: `pip-g pip-blink ${extraClass}`, 'data-p': states }, [
    svgEl(doc, 'ellipse', { cx: 64, cy: 84, rx: 6, ry, fill: INK }),
    svgEl(doc, 'ellipse', { cx: 96, cy: 84, rx: 6, ry, fill: INK }),
    svgEl(doc, 'circle', { cx: 66.5, cy: 80.5, r: 2, fill: '#FFFFFF' }),
    svgEl(doc, 'circle', { cx: 98.5, cy: 80.5, r: 2, fill: '#FFFFFF' })
  ]);
}

function strokePath(doc, d, states, width = 3) {
  return svgEl(doc, 'path', {
    d,
    'data-p': states,
    fill: 'none',
    stroke: INK,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
}

/** Badge group: circle plus the glyph variants. */
function badge(doc, ring) {
  const kids = [svgEl(doc, 'circle', { class: 'pip-badge-bg', cx: 124, cy: 34, r: ring ? 14 : 13, stroke: CREAM, 'stroke-width': ring ? 3 : 0 })];
  for (const glyph of BADGE_GLYPHS) {
    kids.push(
      svgEl(doc, 'path', {
        d: glyph.d,
        'data-p': glyph.states,
        fill: 'none',
        stroke: '#FFFFFF',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      })
    );
  }
  return svgEl(doc, 'g', { class: 'pip-badge', 'data-p': BADGE_STATES }, kids);
}

/**
 * The full character. Decorative: the button around it carries the name.
 * @param {Document} doc
 */
export function buildFigure(doc) {
  const pose = svgEl(doc, 'g', { class: 'pip-g pip-pose' }, [
    ...LEFT_ARMS.map((spec) => arm(doc, SHOULDER_L, spec, 'left')),
    ...RIGHT_ARMS.map((spec) => arm(doc, SHOULDER_R, spec, 'right')),
    svgEl(doc, 'path', {
      class: 'pip-rim',
      d: 'M80 22 C94 30 112 33 128 34 L128 84 C128 120 106 146 80 158 C54 146 32 120 32 84 L32 34 C48 33 66 30 80 22 Z'
    }),
    svgEl(doc, 'path', {
      d: 'M80 32 C92 39 107 42 119 43 L119 84 C119 114 101 136 80 147 C59 136 41 114 41 84 L41 43 C53 42 68 39 80 32 Z',
      fill: CREAM
    }),
    svgEl(doc, 'path', { d: 'M50 54 Q57 47 67 44', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    svgEl(doc, 'ellipse', { cx: 53, cy: 98, rx: 6, ry: 3.5, fill: '#E9A189', opacity: 0.45 }),
    svgEl(doc, 'ellipse', { cx: 107, cy: 98, rx: 6, ry: 3.5, fill: '#E9A189', opacity: 0.45 }),
    svgEl(doc, 'g', { class: 'pip-g pip-look' }, [
      openEyes(doc, 7.5, 'idle checking warning uncertain', 'pip-eyes'),
      openEyes(doc, 9, 'noticing', 'pip-eyes pip-eyes-wide'),
      ...SHUT_EYES.map((e) => strokePath(doc, e.d, e.states, 3.5))
    ]),
    ...BROWS.map((b) => strokePath(doc, b.d, b.states)),
    ...MOUTHS.map((m) => {
      const node = strokePath(doc, m.d, m.states);
      if (m.filled) node.setAttribute('fill', INK);
      return node;
    }),
    badge(doc, true)
  ]);
  return svgEl(
    doc,
    'svg',
    { class: 'pip-svg', viewBox: '0 0 160 180', 'aria-hidden': 'true', focusable: 'false' },
    [
      svgEl(doc, 'ellipse', { class: 'pip-g pip-shadow', cx: 80, cy: 172, rx: 34, ry: 5, fill: INK, opacity: 0.16 }),
      svgEl(doc, 'g', { class: 'pip-g pip-body' }, [pose])
    ]
  );
}

/**
 * Small status icon for the speech bubble: the same badge glyphs, shown by
 * state. Decorative; the label text carries the meaning.
 * @param {Document} doc
 */
export function buildBadgeIcon(doc) {
  return svgEl(
    doc,
    'svg',
    { class: 'bp-pip__icon', viewBox: '110 20 28 28', width: 20, height: 20, 'aria-hidden': 'true', focusable: 'false' },
    [badge(doc, false)]
  );
}
