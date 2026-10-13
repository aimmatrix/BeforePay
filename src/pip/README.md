# Pip: integration notes for CORE

Pip is BeforePay's checkout companion: a shield with eyes and arms, drawn in local SVG and animated with CSS only. It renders the PipView it is given. It reads no page content, uses no Chrome APIs and never decides whether a store is trustworthy.

## Mount

```js
import { mountPip } from './src/pip/index.js';

const pip = mountPip(pipRoot, {
  onOpen: () => { /* open the panel, or start a scan */ },
  onDismiss: () => { /* close; CORE then sends state 'dismissed' */ },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
});

pip.update({ state: 'warning', label: 'Pause before you pay.', message: '…', expanded: false });
pip.destroy();
```

Contract v1, unchanged. Exports: `mountPip` and `PIP_STATES`.

## What Pip does with a PipView

| Field | Effect |
| --- | --- |
| `state` | Sets `data-state` on `.bp-pip`. CSS shows the matching pose, rim colour and badge glyph. An unknown value shows the **error** pose, logs one console warning and keeps the supplied label. |
| `label` | Shown in bold in the speech bubble (via textContent). It also names the figure button: `Pip: <label>`, or `Pip` when empty. It is announced politely when the state changes. |
| `message` | The bubble's second line (via textContent). Hidden when empty. |
| `expanded` | `true` means CORE's panel is open: the bubble steps aside and the figure gets `aria-expanded="true"`. `false` shows the bubble when there is copy to show. |

`dismissed` hides the whole Pip, including every button. CORE brings it back by sending any other state (for example after a rescan). Repeating an identical view does nothing: no DOM writes and no restarted animations.

## Input

- **Figure:** a real `<button>`, first in Pip's DOM order. Click, Enter or Space calls `onOpen`. CORE's `restoreFocus` (`pipRoot.querySelector('button')`) lands here.
- **Hide:** a `<button>` in the bubble (44 px tall) that calls `onDismiss`.
- **Escape:** when focus is inside Pip and the bubble is showing, calls `onDismiss`. While `expanded`, Escape is left to the panel. There are no document-level listeners.
- **Focus:** Pip never calls `focus()`.

## Motion

Pip floats, blinks every ~5 s, scans its eyes while checking, hops once when noticing, raises its hand with a soft halo on warning, and nods once on identity_matched. It is tilted and still on error.

All motion is CSS. `reducedMotion: true` (read at mount) or the OS `prefers-reduced-motion` setting removes every animation; each state stays a distinct static pose.

## Layout

- **Default:** a 96×108 figure, with the bubble (max 280 px wide) to its left. It is sized to sit in CORE's fixed bottom-right host.
- **Narrow screens:** at `max-width: 480px`, the figure is 64×72 and the message is clamped to 3 lines.
- **Styling:** Pip injects one `<style>` node next to its root inside the supplied container, so it works inside a Shadow DOM. Every selector is under `.bp-pip`, keyframes are prefixed `bp-pip-`, and fonts are the system stack. There are no remote assets.

## Files

- `index.js`: `mountPip`.
- `figure.js`: SVG built with DOM calls from a static spec (no innerHTML).
- `states.js`: the state list and tones.
- `styles.js`: the CSS string.
- `preview.html` / `preview.js`: the component preview (served at `/src/pip/preview.html`). It isn't part of the bundle.
- `assets/pip/pip-reference.svg`: a reference sheet of the eight poses.
- `tests/pip/`: tests with a local fake DOM. Run them with `node --test tests/pip/pip.test.js`.
