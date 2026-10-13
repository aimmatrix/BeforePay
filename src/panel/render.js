import {
  DEMO_DISCLOSURE,
  ERROR_HEADLINE,
  ERROR_SUMMARY,
  EVIDENCE_STATUS_LABELS,
  IDENTITY_LABELS,
  IDLE_HEADLINE,
  IDLE_SUMMARY,
  KIND_LABELS,
  CHECKING_HEADLINE,
  CHECKING_SUMMARY,
  LABEL_CLOSE,
  LABEL_DISMISS,
  LABEL_LINK_WITHHELD,
  LABEL_OPEN_SOURCE,
  LABEL_RESCAN,
  NOT_A_GUARANTEE,
  SECTION_LIMITS,
  SECTION_MISSING,
  SECTION_REASONS,
  SECTION_SOURCES,
  SECTION_STEPS,
  SOURCE_TYPE_LABELS,
  VIEW_LABELS
} from './copy.js';
import { evidenceById, groupEvidence, linkedSourceLabels } from './group.js';
import { statusIcon } from './icons.js';
import { appendSafeLink, clearChildren, el, sanitizeUrl, setText } from './safe.js';
import { showDemoDisclosure, viewFrom } from './view.js';

/**
 * @param {Document} doc
 * @param {(event: Event) => void} onRescan
 * @param {(event: Event) => void} onDismiss
 */
export function createPanelDom(doc, onRescan, onDismiss) {
  const root = el(doc, 'div', {
    className: 'bp-panel',
    role: 'region',
    'data-open': 'false',
    hidden: true,
    'aria-hidden': 'true'
  });

  const live = el(doc, 'div', {
    className: 'bp-status-live',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });

  const chrome = el(doc, 'div', { className: 'bp-chrome' });
  const stripe = el(doc, 'div', { className: 'bp-stripe' });
  const iconSlot = el(doc, 'span', { className: 'bp-icon-slot' });
  const statusWord = el(doc, 'span', { className: 'bp-status-word' });
  stripe.appendChild(iconSlot);
  stripe.appendChild(statusWord);

  const close = el(doc, 'button', {
    className: 'bp-close',
    type: 'button',
    'aria-label': LABEL_CLOSE
  });
  setText(close, '×');
  close.addEventListener('click', onDismiss);

  chrome.appendChild(stripe);
  chrome.appendChild(close);

  const identityRow = el(doc, 'div', {
    className: 'bp-identity-row',
    'data-section': 'identity',
    hidden: true
  });
  const demoBanner = el(doc, 'div', {
    className: 'bp-demo-banner',
    'data-section': 'demo',
    hidden: true
  });
  setText(demoBanner, DEMO_DISCLOSURE);

  const body = el(doc, 'div', { className: 'bp-body' });

  const footer = el(doc, 'div', { className: 'bp-footer' });
  const rescan = el(doc, 'button', {
    className: 'bp-button bp-button-primary',
    type: 'button'
  });
  setText(rescan, LABEL_RESCAN);
  rescan.addEventListener('click', onRescan);

  const dismiss = el(doc, 'button', {
    className: 'bp-button',
    type: 'button'
  });
  setText(dismiss, LABEL_DISMISS);
  dismiss.addEventListener('click', onDismiss);

  footer.appendChild(rescan);
  footer.appendChild(dismiss);

  root.appendChild(live);
  root.appendChild(chrome);
  root.appendChild(identityRow);
  root.appendChild(demoBanner);
  root.appendChild(body);
  root.appendChild(footer);

  return { root, live, stripe, iconSlot, statusWord, identityRow, demoBanner, body, rescan, dismiss };
}

/**
 * @param {ReturnType<typeof createPanelDom>} dom
 * @param {object|null} assessment
 * @param {string} phase
 */
export function renderPanel(dom, assessment, phase) {
  const { root, live, iconSlot, statusWord, identityRow, demoBanner, body, rescan } = dom;
  const doc = root.ownerDocument;
  const view = viewFrom(assessment, phase);

  root.setAttribute('data-view', view);
  root.setAttribute('data-phase', phase);
  root.setAttribute('aria-busy', view === 'checking' ? 'true' : 'false');
  if (assessment && assessment.mode) root.setAttribute('data-mode', assessment.mode);
  else root.removeAttribute('data-mode');
  if (assessment && assessment.identityStatus) {
    root.setAttribute('data-identity', assessment.identityStatus);
  } else {
    root.removeAttribute('data-identity');
  }

  clearChildren(iconSlot);
  iconSlot.appendChild(statusIcon(doc, view));
  setText(statusWord, VIEW_LABELS[view] || VIEW_LABELS.idle);
  setText(live, VIEW_LABELS[view] || VIEW_LABELS.idle);

  const showIdentity = Boolean(assessment && view !== 'checking' && view !== 'idle');
  identityRow.hidden = !showIdentity;
  clearChildren(identityRow);
  if (showIdentity) {
    const identity = el(doc, 'span', { className: 'bp-chip' });
    setText(
      identity,
      IDENTITY_LABELS[assessment.identityStatus] || assessment.identityStatus
    );
    identityRow.appendChild(identity);
    if (assessment.mode === 'demo') {
      const modeChip = el(doc, 'span', { className: 'bp-chip bp-chip-sample' });
      setText(modeChip, 'Demo');
      identityRow.appendChild(modeChip);
    }
  }

  const demo = showDemoDisclosure(assessment, view);
  demoBanner.hidden = !demo;

  rescan.disabled = view === 'checking';

  clearChildren(body);
  const headline = el(doc, 'h2', {
    className: 'bp-headline',
    id: 'bp-panel-headline',
    tabIndex: '-1'
  });
  const summary = el(doc, 'p', { className: 'bp-summary' });
  const copy = headlineCopy(assessment, view);
  setText(headline, copy.headline);
  setText(summary, copy.summary);
  root.setAttribute('aria-labelledby', 'bp-panel-headline');
  body.appendChild(headline);
  body.appendChild(summary);

  if (view !== 'checking' && view !== 'idle' && assessment) {
    appendCompleteSections(doc, body, assessment);
  }

  appendLimits(doc, body, assessment, view);
}

function headlineCopy(assessment, view) {
  if (view === 'checking') {
    return { headline: CHECKING_HEADLINE, summary: CHECKING_SUMMARY };
  }
  if (view === 'idle') {
    return { headline: IDLE_HEADLINE, summary: IDLE_SUMMARY };
  }
  if (view === 'error') {
    return {
      headline: (assessment && assessment.headline) || ERROR_HEADLINE,
      summary: (assessment && assessment.summary) || ERROR_SUMMARY
    };
  }
  return {
    headline: (assessment && assessment.headline) || '',
    summary: (assessment && assessment.summary) || ''
  };
}

function appendCompleteSections(doc, body, assessment) {
  const byId = evidenceById(assessment.evidence);
  const { supporting, missing } = groupEvidence(assessment.evidence);
  const reasons = Array.isArray(assessment.reasons) ? assessment.reasons : [];
  const steps = Array.isArray(assessment.nextSteps) ? assessment.nextSteps : [];

  if (reasons.length) {
    const section = sectionEl(doc, 'reasons', SECTION_REASONS);
    for (const reason of reasons) {
      section.appendChild(reasonEl(doc, reason, byId));
    }
    body.appendChild(section);
  }

  if (supporting.length) {
    const section = sectionEl(doc, 'sources', SECTION_SOURCES);
    for (const item of supporting) section.appendChild(evidenceEl(doc, item));
    body.appendChild(section);
  }

  if (missing.length) {
    const section = sectionEl(doc, 'missing', SECTION_MISSING);
    for (const item of missing) section.appendChild(evidenceEl(doc, item));
    body.appendChild(section);
  }

  if (steps.length) {
    const section = sectionEl(doc, 'steps', SECTION_STEPS);
    const list = el(doc, 'ol', { className: 'bp-steps' });
    for (const step of steps) {
      const li = el(doc, 'li', { className: 'bp-step' });
      setText(li, step);
      list.appendChild(li);
    }
    section.appendChild(list);
    body.appendChild(section);
  }
}

function appendLimits(doc, body, assessment, view) {
  const section = sectionEl(doc, 'limits', SECTION_LIMITS);
  if (view !== 'checking' && view !== 'idle' && assessment && Array.isArray(assessment.limitations)) {
    for (const line of assessment.limitations) {
      const p = el(doc, 'p', { className: 'bp-limit' });
      setText(p, line);
      section.appendChild(p);
    }
  }
  const guarantee = el(doc, 'p', { className: 'bp-guarantee' });
  setText(guarantee, NOT_A_GUARANTEE);
  section.appendChild(guarantee);
  body.appendChild(section);
}

function sectionEl(doc, name, title) {
  const section = el(doc, 'section', {
    className: 'bp-section',
    'data-section': name
  });
  const heading = el(doc, 'h3', { className: 'bp-section-title' });
  setText(heading, title);
  section.appendChild(heading);
  return section;
}

function reasonEl(doc, reason, byId) {
  const article = el(doc, 'article', {
    className: 'bp-reason',
    'data-severity': reason.severity || 'info'
  });
  const title = el(doc, 'h4', { className: 'bp-reason-title' });
  setText(title, reason.title || '');
  const detail = el(doc, 'p', { className: 'bp-reason-detail' });
  setText(detail, reason.detail || '');
  article.appendChild(title);
  article.appendChild(detail);
  const labels = linkedSourceLabels(reason.evidenceIds, byId);
  if (labels.length) {
    const meta = el(doc, 'p', { className: 'bp-reason-sources' });
    setText(meta, `Sources: ${labels.join(', ')}`);
    article.appendChild(meta);
  }
  return article;
}

function evidenceEl(doc, item) {
  const article = el(doc, 'article', {
    className: 'bp-evidence',
    'data-status': item.status || '',
    'data-source-type': item.sourceType || ''
  });
  const head = el(doc, 'div', { className: 'bp-evidence-head' });
  const kind = el(doc, 'span', { className: 'bp-chip' });
  setText(kind, KIND_LABELS[item.kind] || item.kind || 'Evidence');
  const sourceType = el(doc, 'span', {
    className: item.sourceType === 'synthetic' ? 'bp-chip bp-chip-sample' : 'bp-chip'
  });
  setText(sourceType, SOURCE_TYPE_LABELS[item.sourceType] || item.sourceType || '');
  const status = el(doc, 'span', { className: 'bp-chip' });
  setText(status, EVIDENCE_STATUS_LABELS[item.status] || item.status || '');
  head.appendChild(kind);
  head.appendChild(sourceType);
  head.appendChild(status);
  article.appendChild(head);

  const title = el(doc, 'h4', { className: 'bp-evidence-title' });
  setText(title, item.sourceLabel || '');
  const summary = el(doc, 'p', { className: 'bp-evidence-detail' });
  setText(summary, item.summary || '');
  const detail = el(doc, 'p', { className: 'bp-evidence-detail' });
  setText(detail, item.detail || '');
  article.appendChild(title);
  article.appendChild(summary);
  article.appendChild(detail);

  const urlLine = el(doc, 'p', { className: 'bp-evidence-meta' });
  const safe = sanitizeUrl(item.sourceUrl);
  if (safe) {
    const link = appendSafeLink(doc, urlLine, safe, LABEL_OPEN_SOURCE);
    if (link.tagName === 'A') link.className = 'bp-source-link';
  } else if (item.sourceUrl) {
    const withheld = el(doc, 'span', { className: 'bp-url-withheld' });
    setText(withheld, `${String(item.sourceUrl)} (${LABEL_LINK_WITHHELD})`);
    urlLine.appendChild(withheld);
  }
  if (urlLine.childNodes.length) article.appendChild(urlLine);
  return article;
}
