(function (root) {
  function evaluate(input) {
    const findings=[]; let concern=0; let matched=false;
    const add=(id,level,title,detail,points=0) => {findings.push({id,level,title,detail});concern+=points;};
    if(input.demo){
      matched=input.hostname==='solehouse.example';
      if(matched) add('identity','good','Demo store identity matches','solehouse.example matches the fictional Solehouse directory entry. This is sample evidence, not real certification.');
      else add('identity','warning','Store identity does not match',`${input.hostname} differs from solehouse.example, the domain in our fictional Solehouse directory.`,2);
    } else add('identity','unknown','Seller identity is unverified','This prototype has no independent directory for real stores. The website’s own claims cannot verify its identity.');
    if(!input.demo && input.protocol!=='https:') add('transport','warning','Connection is not HTTPS','Information submitted on this page may travel without transport encryption.',2);
    else if(!input.demo) add('transport','neutral','HTTPS connection','The connection is encrypted. This does not establish that the seller is trustworthy.');
    if(input.transferOnly) add('payment','warning','Transfer-only payment requested','The visible page explicitly asks for bank transfer only. Verify the seller independently before sending money.',2);
    if(input.discount>=80) add('discount','warning',`${input.discount}% discount advertised`,'This unusually large advertised reduction deserves a closer look. We have not independently checked the product’s market price.',1);
    add('returns',input.hasReturns?'neutral':'unknown',input.hasReturns?'Returns link found':'Returns information not found',input.hasReturns?'A returns/refunds link is visible. Its existence does not verify the policy or whether the seller honours it.':'No visible returns/refunds link was found in this scan. It may be elsewhere on the site.');
    add('contact',input.hasContact?'neutral':'unknown',input.hasContact?'Contact link found':'Contact information not found',input.hasContact?'A contact link is visible. Contact details have not been independently verified.':'No visible contact link was found. This is missing evidence, not proof of fraud.');
    const status=concern>=3?'risk':matched&&concern===0?'matched':'unknown';
    return {status,title:status==='risk'?'Pause before you pay.':status==='matched'?'A match. Still stay curious.':'Let’s check a little closer.',label:status==='risk'?'Warning signs found':status==='matched'?'Demo identity matched':'Unverified store',summary:status==='risk'?'I found details worth checking independently before you buy.':status==='matched'?'This store matches our sample directory. That does not guarantee the purchase.':'There isn’t enough independent evidence here to verify this seller.',findings,notChecked:['Independent customer reviews','Domain age and known-fraud reports','Product authenticity and delivery','Independent price comparison']};
  }
  root.BeforePayRules={evaluate};
  if(typeof module!=='undefined'&&module.exports) module.exports={evaluate};
})(globalThis);
