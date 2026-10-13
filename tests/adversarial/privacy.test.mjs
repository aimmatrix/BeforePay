import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installDom } from './helpers/dom.mjs';
import { loadRuntime } from './helpers/load.mjs';

const runtime = await loadRuntime();

function pageWithSecrets(doc) {
  const main = doc.createElement('main');
  const p = doc.createElement('p');
  p.textContent = 'Canvas runners £80. Returns policy in the footer.';
  const form = doc.createElement('form');
  const card = doc.createElement('input');
  card.setAttribute('type', 'text');
  card.value = '4111111111111111';
  const cvv = doc.createElement('input');
  cvv.setAttribute('type', 'password');
  cvv.value = '123';
  const addr = doc.createElement('textarea');
  addr.value = '10 Example Street, London';
  const pay = doc.createElement('button');
  pay.textContent = 'Pay now';
  form.append(card, cvv, addr, pay);
  main.append(p, form);
  doc.body.appendChild(main);
  return { card, cvv, addr };
}

describe('extraction hygiene [CORE observation]', () => {
  it('ADV-PRIV-001 form-field values are excluded from the excerpt', () => {
    assert.equal(typeof runtime.collectObservation, 'function');
    const doc = installDom(globalThis);
    pageWithSecrets(doc);
    const obs = runtime.collectObservation(
      doc,
      'https://unfamiliar-shoes.example/checkout',
      'scan-priv-1'
    );
    const blob = `${obs.visibleTextExcerpt} ${obs.paymentClaims.join(' ')}`;
    assert.equal(blob.includes('4111111111111111'), false);
    assert.equal(blob.includes('10 Example Street'), false);
    assert.match(obs.visibleTextExcerpt, /Canvas runners/);
  });

  it('ADV-PRIV-002 pageKey omits query and fragment', () => {
    const doc = installDom(globalThis);
    const main = doc.createElement('main');
    main.textContent = 'Checkout';
    doc.body.appendChild(main);
    const obs = runtime.collectObservation(
      doc,
      'https://unfamiliar-shoes.example/checkout?email=a@b.c&token=secret#card=4111',
      'scan-priv-2'
    );
    assert.equal(obs.pageKey, 'https://unfamiliar-shoes.example/checkout');
    assert.equal(obs.pageKey.includes('token='), false);
    assert.equal(obs.pageKey.includes('email='), false);
  });

  it('ADV-PRIV-003 mailbox hosts are unsupported', () => {
    assert.equal(typeof runtime.supportedUrl, 'function');
    assert.equal(runtime.supportedUrl(new URL('https://mail.google.com/mail/u/0')), false);
    assert.equal(runtime.supportedUrl(new URL('https://outlook.live.com/mail/')), false);
    const doc = installDom(globalThis);
    doc.body.appendChild(doc.createElement('main')).textContent = 'Inbox';
    assert.throws(
      () => runtime.collectObservation(doc, 'https://mail.google.com/mail/u/0', 'scan-mail'),
      /not supported/i
    );
  });

  it('ADV-ID-006b collectObservation does not honour remote scenario query as demo', () => {
    assert.equal(typeof runtime.demoScenario, 'function');
    const remote = new URL('https://attacker.example/checkout?scenario=matching-shoes');
    assert.equal(runtime.demoScenario(remote), null);
    const local = new URL('http://127.0.0.1:4173/demo/index.html?scenario=matching-shoes');
    assert.equal(runtime.demoScenario(local), 'matching-shoes');
  });
});
