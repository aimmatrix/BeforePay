(() => {
  const SCENARIO_IDS = ['suspicious-shoes', 'matching-shoes'];
  const LEGACY = { risky: 'suspicious-shoes', clean: 'matching-shoes' };

  const FALLBACK_RECORDS = [
    {
      id: 'suspicious-shoes',
      displayName: 'Suspicious outlet',
      claimedBrand: 'Solehouse',
      simulatedHostname: 'solehouse-outlet.example',
      product: { name: 'Studio Runner 01', price: 14, currency: 'GBP', advertisedDiscountPercent: 90 },
      visibleClaims: [
        'FINAL HOURS · 90% OFF THE STUDIO RUNNER · BANK TRANSFER ONLY',
        'Reserve your pair today. Bank transfer only.'
      ],
      links: [{ label: 'About the demo', hostname: 'solehouse-outlet.example', pathname: '/about' }]
    },
    {
      id: 'matching-shoes',
      displayName: 'Matching demo store',
      claimedBrand: 'Solehouse',
      simulatedHostname: 'solehouse.example',
      product: { name: 'Studio Runner 01', price: 140, currency: 'GBP', advertisedDiscountPercent: null },
      visibleClaims: [
        'THOUGHTFULLY DESIGNED. EVERY DAY, EVERYWHERE.',
        'Sample seller · Cards accepted in this fictional scenario.'
      ],
      links: [
        { label: 'Contact', hostname: 'solehouse.example', pathname: '/contact' },
        { label: 'Returns & refunds', hostname: 'solehouse.example', pathname: '/returns' },
        { label: 'About the demo', hostname: 'solehouse.example', pathname: '/about' }
      ]
    }
  ];

  const query = new URLSearchParams(location.search);
  const scenarioId = resolveScenarioId(query.get('scenario'));
  const root = document.documentElement;
  const body = document.body;

  function resolveScenarioId(raw) {
    if (LEGACY[raw]) return LEGACY[raw];
    if (SCENARIO_IDS.includes(raw)) return raw;
    return 'suspicious-shoes';
  }

  function text(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount);
    } catch {
      return `£${Number(amount).toFixed(2)}`;
    }
  }

  function listPrice(product) {
    const discount = Number(product.advertisedDiscountPercent);
    if (discount > 0 && discount < 100) return product.price / (1 - discount / 100);
    return null;
  }

  function asList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.scenarios)) return data.scenarios;
    return [];
  }

  async function loadRecords() {
    const urls = ['/fixtures/scenarios.json', 'scenarios.placeholder.json'];
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;
        const records = asList(await response.json()).filter((item) => SCENARIO_IDS.includes(item.id));
        if (records.length) return records;
      } catch {
        /* try the next source */
      }
    }
    return FALLBACK_RECORDS;
  }

  function paymentSentences(record) {
    const claims = Array.isArray(record.visibleClaims) ? record.visibleClaims : [];
    const joined = claims.join(' ').toLowerCase();
    const note = claims[1] || claims[0] || '';
    if (joined.includes('bank transfer') || joined.includes('transfer only')) {
      return {
        note,
        method: 'Bank transfer only · fictional payment instructions'
      };
    }
    return {
      note: note || 'Sample seller · Cards accepted in this fictional scenario.',
      method: 'Sample payment method: card · no card details collected'
    };
  }

  function dialogCopy(label, record) {
    if (label === 'Returns & refunds') {
      return 'Synthetic policy: this fictional store offers 30-day returns. This page is a demonstration, not a real shop.';
    }
    if (label === 'Contact') {
      return `Synthetic contact: hello@${record.simulatedHostname}. The .example domain is reserved for examples; this is not a real retailer.`;
    }
    return 'Solehouse is a fictional store built to demonstrate BeforePay. All products, store identity records and payments in this demo are synthetic.';
  }

  function publishCheckoutChanged(checkoutDetected) {
    window.dispatchEvent(new CustomEvent('beforepay:checkout-changed', {
      bubbles: true,
      detail: {
        checkoutDetected,
        demoScenarioId: root.dataset.demoScenario || scenarioId
      }
    }));
  }

  function applyRecord(record) {
    const product = record.product || {};
    const price = money(product.price, product.currency);
    const original = listPrice(product);
    const discount = Number(product.advertisedDiscountPercent);
    const claims = Array.isArray(record.visibleClaims) ? record.visibleClaims : [];
    const payment = paymentSentences(record);
    const name = product.name || 'Studio Runner 01';

    root.dataset.beforepayDemo = 'true';
    root.dataset.demoScenario = record.id;
    root.dataset.simulatedHostname = record.simulatedHostname || '';
    document.title = `${record.displayName} · Solehouse · BeforePay demo`;

    text('announcement', claims[0] || '');
    text('crumb-name', name);
    text('product-name', name);
    text('order-name', name);
    text('price', price);
    text('order-price', price);
    text('total', price);
    text('payment-note', payment.note);
    text('payment-method', payment.method);
    text('simulated-host', record.simulatedHostname || '');

    const oldPrice = document.getElementById('old-price');
    const discountBadge = document.getElementById('discount');
    if (original && discount > 0) {
      oldPrice.hidden = false;
      discountBadge.hidden = false;
      oldPrice.textContent = money(original, product.currency);
      discountBadge.textContent = `${discount}% off`;
    } else {
      oldPrice.hidden = true;
      discountBadge.hidden = true;
      oldPrice.textContent = '';
      discountBadge.textContent = '';
    }

    const shopUrl = (id) => `${location.pathname}?scenario=${encodeURIComponent(id)}`;
    document.getElementById('wordmark').setAttribute('href', shopUrl(record.id));
    document.querySelectorAll('[data-scenario]').forEach((button) => {
      const selected = button.dataset.scenario === record.id;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.addEventListener('click', () => {
        location.assign(shopUrl(button.dataset.scenario));
      });
    });

    const footer = document.getElementById('footer-links');
    footer.replaceChildren();
    const links = Array.isArray(record.links) && record.links.length
      ? record.links
      : [{ label: 'About the demo', hostname: record.simulatedHostname, pathname: '/about' }];
    for (const link of links) {
      const anchor = document.createElement('a');
      anchor.href = '#information';
      anchor.textContent = link.label;
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        text('info-title', link.label);
        text('info-text', dialogCopy(link.label, record));
        document.getElementById('info-dialog').showModal();
      });
      footer.append(anchor);
    }
  }

  function bindShop() {
    document.querySelectorAll('.sizes button').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.sizes button').forEach((other) => {
          other.classList.remove('selected');
          other.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        text('order-size', button.textContent.trim());
      });
    });

    document.getElementById('checkout-button').addEventListener('click', () => {
      location.hash = 'checkout';
    });
    document.getElementById('back').addEventListener('click', () => {
      const url = new URL(location.href);
      url.hash = '';
      history.pushState('', document.title, `${url.pathname}${url.search}`);
      route();
    });
    document.getElementById('simulate').addEventListener('click', () => {
      text('simulation-status', 'Simulation complete. No payment was made.');
    });
    document.getElementById('close-dialog').addEventListener('click', () => {
      document.getElementById('info-dialog').close();
    });

    window.addEventListener('hashchange', route);
    route();
  }

  let lastCheckout = null;
  function route() {
    const checkout = location.hash === '#checkout';
    document.getElementById('checkout-view').hidden = !checkout;
    document.getElementById('product-view').hidden = checkout;
    body.dataset.checkout = String(checkout);
    text('simulation-status', '');
    window.scrollTo(0, 0);
    if (lastCheckout !== checkout) {
      lastCheckout = checkout;
      publishCheckoutChanged(checkout);
    }
  }

  function start(records) {
    const record = records.find((item) => item.id === scenarioId) || records[0] || FALLBACK_RECORDS[0];
    applyRecord(record);
    bindShop();
  }

  loadRecords().then(start).catch(() => start(FALLBACK_RECORDS));
})();
