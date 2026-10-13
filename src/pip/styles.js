/**
 * Pip's stylesheet as a string, so mountPip can inject it into whatever root
 * CORE supplies (including a Shadow DOM). Every selector is scoped under
 * .bp-pip and every keyframe is prefixed bp-pip-.
 */

import { PIP_STATES, STATE_TONE, TONES } from './states.js';

const tones = PIP_STATES.map((state) => {
  const t = TONES[STATE_TONE[state]];
  return `.bp-pip[data-state="${state}"]{--pip-rim:${t.rim};--pip-arm:${t.arm};--pip-badge:${t.badge}}`;
}).join('\n');

const poses = PIP_STATES.map((state) => `.bp-pip[data-state="${state}"] [data-p~="${state}"]{display:inline}`).join('\n');

export const PIP_CSS = `.bp-pip{
  --pip-ink:#1E2722;--pip-cream:#FBF6EA;--pip-paper:#FFFDF8;--pip-muted:#33403A;
  position:relative;box-sizing:border-box;display:flex;flex-direction:row-reverse;align-items:flex-end;gap:6px;
  max-width:100%;color:var(--pip-ink);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.4;
}
.bp-pip *,.bp-pip *::before,.bp-pip *::after{box-sizing:border-box}
.bp-pip[hidden],.bp-pip [hidden]{display:none !important}
${tones}
.bp-pip [data-p]{display:none}
${poses}
.bp-pip .bp-pip__figure{
  flex:none;width:96px;height:108px;margin:0;padding:0;border:0;border-radius:18px;background:transparent;cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.bp-pip .bp-pip__figure:focus-visible{outline:3px solid var(--pip-ink);outline-offset:2px}
.bp-pip .pip-svg{display:block;width:100%;height:100%;overflow:visible}
.bp-pip .pip-g{transform-box:fill-box;transform-origin:50% 50%}
.bp-pip .pip-rim{fill:var(--pip-rim)}
.bp-pip .pip-limb{stroke:var(--pip-arm)}
.bp-pip .pip-hand{fill:var(--pip-rim);stroke:var(--pip-arm)}
.bp-pip .pip-palm{stroke:var(--pip-cream)}
.bp-pip .pip-halo{stroke:var(--pip-rim)}
.bp-pip .pip-badge-bg{fill:var(--pip-badge)}
.bp-pip .bp-pip__bubble{
  min-width:0;max-width:280px;margin-bottom:22px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:6px;
  background:var(--pip-paper);border:1.5px solid var(--pip-rim);border-radius:16px 16px 4px 16px;
  box-shadow:0 10px 28px rgba(30,39,34,.18);animation:bp-pip-in .22s ease-out;
}
.bp-pip .bp-pip__head{display:flex;align-items:flex-start;gap:8px}
.bp-pip .bp-pip__icon{flex:none;margin-top:1px}
.bp-pip .bp-pip__label{margin:0;font-weight:700;font-size:15px;line-height:1.3;overflow-wrap:anywhere}
.bp-pip .bp-pip__message{margin:0;font-size:14px;line-height:1.45;color:var(--pip-muted);overflow-wrap:anywhere}
.bp-pip .bp-pip__actions{display:flex;justify-content:flex-end}
.bp-pip .bp-pip__hide{
  min-height:44px;min-width:64px;padding:0 14px;border:1.5px solid #C9C3B3;border-radius:10px;background:transparent;
  color:var(--pip-ink);font:inherit;font-size:14px;cursor:pointer;
}
.bp-pip .bp-pip__hide:hover{background:#F1EDE2}
.bp-pip .bp-pip__hide:focus-visible{outline:3px solid var(--pip-ink);outline-offset:2px}
.bp-pip .bp-pip__live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.bp-pip .pip-body{animation:bp-pip-float 3.2s ease-in-out infinite alternate}
.bp-pip .pip-shadow{animation:bp-pip-shadow 3.2s ease-in-out infinite alternate}
.bp-pip .pip-blink{animation:bp-pip-blink 5.4s infinite}
.bp-pip .pip-halo{animation:bp-pip-ping 2.2s ease-out infinite}
.bp-pip .pip-arm-raise{transform-box:view-box;transform-origin:122px 94px;animation:bp-pip-raise .45s cubic-bezier(.2,.8,.3,1.15) 1}
.bp-pip[data-state="noticing"] .pip-body{animation:bp-pip-hop .9s cubic-bezier(.3,.7,.4,1) 1,bp-pip-float 3.2s ease-in-out .9s infinite alternate}
.bp-pip[data-state="checking"] .pip-look{animation:bp-pip-scan 2.8s ease-in-out infinite}
.bp-pip[data-state="identity_matched"] .pip-pose{transform-origin:50% 100%;animation:bp-pip-nod 1.1s ease-in-out .25s 1}
.bp-pip[data-state="error"] .pip-body,.bp-pip[data-state="error"] .pip-shadow,
.bp-pip[data-state="dismissed"] .pip-body,.bp-pip[data-state="dismissed"] .pip-shadow{animation:none}
.bp-pip[data-state="error"] .pip-pose{transform-origin:50% 100%;transform:rotate(-6deg)}
.bp-pip[data-state="dismissed"] .pip-svg{opacity:.6}

.bp-pip[data-still="true"] *{animation:none !important;transition:none !important}
.bp-pip[data-still="true"] .pip-halo{opacity:.5}
@media (prefers-reduced-motion: reduce){
  .bp-pip *{animation:none !important;transition:none !important}
  .bp-pip .pip-halo{opacity:.5}
}
@media (max-width: 480px){
  .bp-pip .bp-pip__figure{width:64px;height:72px;border-radius:14px}
  .bp-pip .bp-pip__bubble{max-width:calc(100vw - 112px);margin-bottom:12px;padding:10px 10px 8px}
  .bp-pip .bp-pip__label{font-size:14px}
  .bp-pip .bp-pip__message{font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
}
@media (forced-colors: active){
  .bp-pip .bp-pip__bubble{border-color:CanvasText}
}

@keyframes bp-pip-float{from{transform:translateY(2px)}to{transform:translateY(-4px)}}
@keyframes bp-pip-shadow{from{transform:scaleX(1);opacity:.2}to{transform:scaleX(.84);opacity:.12}}
@keyframes bp-pip-hop{0%,100%{transform:translateY(0)}35%{transform:translateY(-10px)}65%{transform:translateY(0)}82%{transform:translateY(-3px)}}
@keyframes bp-pip-blink{0%,93%,97%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes bp-pip-scan{0%,12%,100%{transform:translateX(-5px)}45%,62%{transform:translateX(5px)}}
@keyframes bp-pip-nod{0%,100%{transform:translateY(0)}30%{transform:translateY(4px)}55%{transform:translateY(0)}75%{transform:translateY(2px)}}
@keyframes bp-pip-raise{from{transform:rotate(75deg)}to{transform:rotate(0)}}
@keyframes bp-pip-ping{from{transform:scale(.7);opacity:.7}to{transform:scale(1.5);opacity:0}}
@keyframes bp-pip-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;
