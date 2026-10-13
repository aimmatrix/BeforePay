/** Injected into the supplied root so styles reach a Shadow DOM container. */
export const POPUP_CSS = `
.bp-popup {
  --bp-cream: #f6f1e7;
  --bp-surface: #fffcf6;
  --bp-ink: #1e2a24;
  --bp-muted: #5c675f;
  --bp-sage: #3f6b52;
  --bp-sage-soft: #e4eee6;
  --bp-amber: #8a5a12;
  --bp-amber-soft: #f4ead6;
  --bp-rust: #9c3b2a;
  --bp-rust-soft: #f4e4de;
  --bp-line: #e4ddd0;
  --bp-focus: #3f6b52;
  --bp-on-sage: #f7fbf6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 320px;
  padding: 16px 16px 18px;
  color: var(--bp-ink);
  background: var(--bp-cream);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.45;
}

.bp-popup *,
.bp-popup *::before,
.bp-popup *::after {
  box-sizing: border-box;
}

.bp-popup:focus {
  outline: none;
}

.bp-popup:focus-visible,
.bp-popup :focus-visible {
  outline: 2px solid var(--bp-focus);
  outline-offset: 2px;
}

.bp-popup-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bp-popup-title {
  margin: 0;
  font-family: ui-serif, "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

.bp-popup-tagline {
  margin: 0;
  color: var(--bp-muted);
  font-size: 0.875rem;
}

.bp-popup-site {
  padding: 10px 12px;
  border: 1px solid var(--bp-line);
  border-radius: 12px;
  background: var(--bp-surface);
}

.bp-popup-kicker {
  margin: 0 0 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bp-muted);
}

.bp-popup-origin {
  margin: 0 0 6px;
  font-weight: 600;
  word-break: break-word;
}

.bp-popup-access {
  margin: 0 0 8px;
  color: var(--bp-muted);
  font-size: 0.875rem;
}

.bp-popup-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0 8px;
  border: 1px solid var(--bp-line);
  border-radius: 999px;
  background: var(--bp-cream);
  color: var(--bp-muted);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.bp-popup-chip[data-on="true"] {
  border-color: var(--bp-sage);
  background: var(--bp-sage-soft);
  color: var(--bp-sage);
}

.bp-popup-banner {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--bp-line);
}

.bp-popup-banner[data-kind="unsupported"],
.bp-popup-banner[data-kind="loading"] {
  background: var(--bp-amber-soft);
  border-color: #e0d0b0;
  color: var(--bp-amber);
}

.bp-popup-banner[data-kind="error"] {
  background: var(--bp-rust-soft);
  border-color: #e3c4bb;
  color: var(--bp-rust);
}

.bp-popup-banner[data-kind="info"] {
  background: var(--bp-sage-soft);
  border-color: #cddccf;
  color: var(--bp-sage);
}

.bp-popup-banner-title {
  margin: 0 0 4px;
  font-weight: 700;
  color: inherit;
}

.bp-popup-banner-body {
  margin: 0;
  color: var(--bp-ink);
  font-size: 0.875rem;
}

.bp-popup-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-popup-scan,
.bp-popup-secondary {
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.bp-popup-scan {
  border: 0;
  background: var(--bp-sage);
  color: var(--bp-on-sage);
}

.bp-popup-secondary {
  border: 1px solid var(--bp-line);
  background: var(--bp-surface);
  color: var(--bp-ink);
}

.bp-popup-scan:disabled,
.bp-popup-secondary:disabled,
.bp-popup-motion label[data-disabled="true"] {
  opacity: 0.55;
  cursor: not-allowed;
}

.bp-popup-motion {
  margin: 0;
  padding: 0;
  border: 0;
}

.bp-popup-motion legend {
  padding: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bp-muted);
}

.bp-popup-motion-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.bp-popup-motion label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 8px;
  border: 1px solid var(--bp-line);
  border-radius: 10px;
  background: var(--bp-surface);
  cursor: pointer;
}

.bp-popup-motion label[data-active="true"] {
  border-color: var(--bp-sage);
  background: var(--bp-sage-soft);
  color: var(--bp-sage);
  font-weight: 600;
}

.bp-popup-motion input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.bp-popup[data-motion="reduced"] *,
.bp-popup[data-motion="reduced"] *::before,
.bp-popup[data-motion="reduced"] *::after {
  animation: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .bp-popup[data-motion="system"] *,
  .bp-popup[data-motion="system"] *::before,
  .bp-popup[data-motion="system"] *::after {
    animation: none !important;
    transition: none !important;
  }
}
`.trim();
