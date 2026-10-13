/**
 * BeforePay S4 runtime probe. Official surface: unpacked dist/extension.
 * Keep preview sessions out of extension result files.
 *
 * Contexts to run (same snippet, once each):
 * 1. Page context on the local demo checkout.
 * 2. Isolated world: DevTools JavaScript context menu → BeforePay content script.
 *
 * For scan vs render timing use scan-timing.js. await scan() is a DOM update,
 * not first paint.
 *
 * After the scenario, call:  window.__S4__.snapshot()
 * After cleanup, call:       window.__S4__.diff()
 * Tear down wrappers:        window.__S4__.restore()
 */
(function installBeforePayS4Probe() {
  if (globalThis.__S4__ && globalThis.__S4__.restore) {
    globalThis.__S4__.restore();
  }

  const now = () => performance.now();
  const startedAt = now();
  const world = (function worldName() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) return 'extension-or-isolated';
    } catch {
      /* ignore */
    }
    return 'page';
  })();

  const counts = {
    mutationObserverConstructed: 0,
    mutationObserverObserve: 0,
    mutationObserverDisconnect: 0,
    mutationObserverCallbacks: 0,
    mutationObserverCallbacksOnExtensionRoot: 0,
    intersectionObserverConstructed: 0,
    resizeObserverConstructed: 0,
    raf: 0,
    timeout: 0,
    interval: 0,
    clearTimeout: 0,
    clearInterval: 0,
    cancelRaf: 0
  };

  const live = {
    observers: new Set(),
    timeouts: new Set(),
    intervals: new Set(),
    rafs: new Set()
  };

  const marks = [];
  const measures = [];
  const events = [];

  function record(type, extra) {
    events.push({ t: now(), type, ...extra });
  }

  const OriginalMO = globalThis.MutationObserver;
  const OriginalIO = globalThis.IntersectionObserver;
  const OriginalRO = globalThis.ResizeObserver;
  const originalRaf = globalThis.requestAnimationFrame.bind(globalThis);
  const originalCancelRaf = globalThis.cancelAnimationFrame.bind(globalThis);
  const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
  const originalClearTimeout = globalThis.clearTimeout.bind(globalThis);
  const originalSetInterval = globalThis.setInterval.bind(globalThis);
  const originalClearInterval = globalThis.clearInterval.bind(globalThis);

  function isExtensionRoot(node) {
    if (!node || node.nodeType !== 1) return false;
    const el = node;
    if (el.shadowRoot) return true;
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : '';
    return /beforepay|pip-root|bp-root/i.test(id + ' ' + cls);
  }

  if (OriginalMO) {
    globalThis.MutationObserver = class S4MutationObserver extends OriginalMO {
      constructor(callback) {
        counts.mutationObserverConstructed += 1;
        const wrapped = function (mutations, observer) {
          counts.mutationObserverCallbacks += 1;
          if (mutations.some((m) => isExtensionRoot(m.target) || (m.target && isExtensionRoot(m.target.getRootNode && m.target.getRootNode().host)))) {
            counts.mutationObserverCallbacksOnExtensionRoot += 1;
          }
          return callback.call(this, mutations, observer);
        };
        super(wrapped);
        live.observers.add(this);
        record('mo-construct');
      }
      observe(target, options) {
        counts.mutationObserverObserve += 1;
        record('mo-observe', { target: target && target.nodeName, options });
        return super.observe(target, options);
      }
      disconnect() {
        counts.mutationObserverDisconnect += 1;
        live.observers.delete(this);
        record('mo-disconnect');
        return super.disconnect();
      }
    };
  }

  if (OriginalIO) {
    globalThis.IntersectionObserver = class S4IntersectionObserver extends OriginalIO {
      constructor(callback, options) {
        counts.intersectionObserverConstructed += 1;
        super(callback, options);
      }
    };
  }

  if (OriginalRO) {
    globalThis.ResizeObserver = class S4ResizeObserver extends OriginalRO {
      constructor(callback) {
        counts.resizeObserverConstructed += 1;
        super(callback);
      }
    };
  }

  globalThis.requestAnimationFrame = (cb) => {
    counts.raf += 1;
    const id = originalRaf(cb);
    live.rafs.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    counts.cancelRaf += 1;
    live.rafs.delete(id);
    return originalCancelRaf(id);
  };
  globalThis.setTimeout = (cb, ms, ...rest) => {
    counts.timeout += 1;
    const id = originalSetTimeout(cb, ms, ...rest);
    live.timeouts.add(id);
    return id;
  };
  globalThis.clearTimeout = (id) => {
    counts.clearTimeout += 1;
    live.timeouts.delete(id);
    return originalClearTimeout(id);
  };
  globalThis.setInterval = (cb, ms, ...rest) => {
    counts.interval += 1;
    const id = originalSetInterval(cb, ms, ...rest);
    live.intervals.add(id);
    return id;
  };
  globalThis.clearInterval = (id) => {
    counts.clearInterval += 1;
    live.intervals.delete(id);
    return originalClearInterval(id);
  };

  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'mark' && String(entry.name).startsWith('beforepay:')) {
        marks.push({ name: entry.name, startTime: entry.startTime });
      }
      if (entry.entryType === 'measure' && String(entry.name).startsWith('beforepay:')) {
        measures.push({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        });
      }
    }
  });
  try {
    po.observe({ entryTypes: ['mark', 'measure'] });
  } catch {
    /* older Chromium */
  }

  function shadowRoots(node = document.documentElement) {
    const found = [];
    const visit = (n) => {
      if (!n || n.nodeType !== 1) return;
      if (n.shadowRoot) {
        found.push({
          hostId: n.id || null,
          hostTag: n.tagName,
          childElementCount: n.shadowRoot.childElementCount
        });
        visit(n.shadowRoot);
      }
      n.querySelectorAll && n.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) {
          found.push({
            hostId: el.id || null,
            hostTag: el.tagName,
            childElementCount: el.shadowRoot.childElementCount
          });
          visit(el.shadowRoot);
        }
      });
    };
    visit(node);
    return found;
  }

  function pipLike() {
    const sel = [
      '#beforepay-root',
      '[data-beforepay-root]',
      '[data-pip]',
      '[data-beforepay-pip]',
      '[aria-label*="Pip" i]'
    ];
    const nodes = [];
    for (const s of sel) {
      try {
        document.querySelectorAll(s).forEach((el) => nodes.push({ selector: s, id: el.id, tag: el.tagName }));
      } catch {
        /* invalid selector in this document */
      }
    }
    return nodes;
  }

  function networkHint() {
    const entries = performance.getEntriesByType('resource').map((e) => ({
      name: e.name,
      initiatorType: e.initiatorType,
      duration: Math.round(e.duration * 100) / 100,
      transferSize: e.transferSize
    }));
    return entries;
  }

  let lastSnapshot = null;

  function capture(label = 'snapshot') {
    const roots = document.querySelectorAll('#beforepay-root');
    return {
      label,
      world,
      at: now() - startedAt,
      href: location.href,
      hash: location.hash,
      beforepayRootCount: roots.length,
      scanId: globalThis.BeforePayGuardian?.getAssessment?.()?.scanId ?? null,
      guardianPresent: Boolean(globalThis.BeforePayGuardian),
      counts: { ...counts },
      live: {
        observers: live.observers.size,
        timeouts: live.timeouts.size,
        intervals: live.intervals.size,
        rafs: live.rafs.size
      },
      shadowRoots: shadowRoots(),
      pipLike: pipLike(),
      beforepayMarks: marks.slice(),
      beforepayMeasures: measures.slice(),
      resourceEntries: networkHint(),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }

  function snapshot(label = 'snapshot') {
    const data = capture(label);
    lastSnapshot = data;
    console.log('[S4 probe]', label, data);
    return data;
  }

  function diff(label = 'diff') {
    const previous = lastSnapshot;
    const current = capture(label);
    lastSnapshot = current;
    console.log('[S4 probe]', label, current);
    if (!previous) return { current, previous: null };
    return {
      previousLabel: previous.label,
      currentLabel: current.label,
      rootDelta: current.beforepayRootCount - previous.beforepayRootCount,
      liveDelta: {
        observers: current.live.observers - previous.live.observers,
        timeouts: current.live.timeouts - previous.live.timeouts,
        intervals: current.live.intervals - previous.live.intervals,
        rafs: current.live.rafs - previous.live.rafs
      },
      shadowRootDelta: current.shadowRoots.length - previous.shadowRoots.length,
      pipLikeDelta: current.pipLike.length - previous.pipLike.length,
      callbackDelta: current.counts.mutationObserverCallbacks - previous.counts.mutationObserverCallbacks,
      scanIdChanged: current.scanId !== previous.scanId
    };
  }

  function restore() {
    globalThis.MutationObserver = OriginalMO;
    globalThis.IntersectionObserver = OriginalIO;
    globalThis.ResizeObserver = OriginalRO;
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    try {
      po.disconnect();
    } catch {
      /* ignore */
    }
    record('restore');
  }

  globalThis.__S4__ = {
    world,
    snapshot,
    diff,
    restore,
    counts,
    events,
    startedAt
  };

  console.log('[S4 probe] installed in', world, '— call __S4__.snapshot("checkout-open")');
})();
