/** Temporary integration adapters used only while assigned components arrive. */
export async function collectEvidence(observation) {
  let synthetic=null;
  try {const url=new URL(observation.pageKey);if(['http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:4174','http://localhost:4174'].includes(url.origin)&&['/demo/index.html','/'].includes(url.pathname))synthetic=observation.demoScenarioId;}catch{}
  const now=new Date().toISOString();
  const evidence=[];
  const add=(id,kind,status,sourceType,summary,detail)=>evidence.push({id,kind,status,sourceType,sourceLabel:sourceType==='synthetic'?'Fictional demo directory':'Visible page observation',sourceUrl:null,checkedAt:now,summary,detail});
  if(synthetic) add('identity','identity',synthetic==='matching-shoes'?'matched':synthetic==='suspicious-shoes'?'mismatch':'unavailable','synthetic',synthetic==='matching-shoes'?'Demo identity matches':synthetic==='suspicious-shoes'?'Demo outlet identity differs':'Demo seller unverified','This is a fictional store and sample directory, not real certification.');
  else add('identity','identity','not_checked','independent','Real seller identity is unverified','Independent store verification is not connected in this prototype.');
  if(observation.paymentClaims.length) add('payment','payment','observed','page','Bank transfer only requested','Check the seller independently before transferring money.');
  if(observation.advertisedDiscountPercent>=80) add('offer','offer','observed','page',`${observation.advertisedDiscountPercent}% discount advertised`,'Market prices have not been independently checked.');
  for(const kind of ['returns','contact']) {
    const found=observation.links.some(link=>new RegExp(kind==='returns'?'returns|refund':'contact','i').test(link.label+' '+link.pathname));
    add(kind,kind,found?'observed':'unavailable','page',found?`${kind} link found`:`${kind} information not found`,'Visible links do not independently verify a seller. Information may be elsewhere on the site.');
  }
  for(const kind of ['reputation','domain']) add(kind,kind,'not_checked','independent',kind==='reputation'?'Independent reviews not checked':'Domain age and scam records not checked','No external evidence source is connected.');
  return evidence;
}
export function evaluate(observation,evidence) {
  const id=evidence.find(e=>e.kind==='identity'&&e.status==='mismatch')||evidence.find(e=>e.kind==='identity'&&e.sourceType!=='page')||evidence.find(e=>e.kind==='identity');
  const warning=id?.status==='mismatch'||evidence.some(e=>['payment','offer'].includes(e.kind)&&e.status==='observed');
  const matched=id?.sourceType==='synthetic'&&id.status==='matched';
  return {schemaVersion:1,scanId:observation.scanId,pageKey:observation.pageKey,createdAt:new Date().toISOString(),mode:evidence.some(e=>e.sourceType==='synthetic')?'demo':'live',verdict:warning?'warning':matched?'no_flags':'uncertain',identityStatus:id?.status==='mismatch'?'mismatch':matched?'demo_match':'unverified',headline:warning?'Pause before you pay.':matched?'Demo identity matched.':'This seller is unverified.',summary:warning?'There are details worth checking independently before buying.':matched?'A sample directory match is not a guarantee of delivery or authenticity.':'More independent evidence is needed to establish who runs this store.',reasons:evidence.map(e=>({id:e.id,severity:e.status==='mismatch'||(['payment','offer'].includes(e.kind)&&e.status==='observed')?'warning':['unavailable','not_checked','error','stale'].includes(e.status)?'unknown':'info',title:e.summary,detail:e.detail,evidenceIds:[e.id]})),evidence,nextSteps:['Verify the seller using an independent source before deciding.'],limitations:[...evidence.filter(e=>['error','stale'].includes(e.status)).map(e=>`${e.kind} check is ${e.status}.`),'Provisional local evaluator while the risk component is integrated.','No real payments, bank verification or independent price comparison.']};
}
export function mountPip(container,{onOpen,onDismiss,reducedMotion}) {
  const style=document.createElement('style');style.textContent=`.core-pip{border:1px solid #c6d1bd;border-radius:22px;background:#f5f8ee;color:#29372b;padding:13px 17px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 35px #16271a20;font:13px Arial;cursor:pointer}.core-shield{width:45px;height:50px;background:#c3d991;clip-path:polygon(0 0,100% 0,95% 65%,50% 100%,5% 65%);display:grid;place-items:center;font-size:22px;animation:core-float 3s ease-in-out infinite}.core-pip[data-state=warning] .core-shield{background:#eeb893}@keyframes core-float{50%{transform:translateY(-4px)}}@media(prefers-reduced-motion:reduce){.core-shield{animation:none}}`;
  const button=document.createElement('button');button.className='core-pip';button.setAttribute('aria-label','Open BeforePay findings');
  const shield=document.createElement('span');shield.className='core-shield';shield.textContent='••';shield.setAttribute('aria-hidden','true');if(reducedMotion)shield.style.animation='none';
  const message=document.createElement('span');button.append(shield,message);button.onclick=onOpen;container.append(style,button);
  return {update(view){button.dataset.state=view.state;message.textContent=view.label||'BeforePay';button.hidden=view.state==='dismissed';},destroy(){style.remove();button.remove();}};
}
export function mountPanel(container,{onRescan,onDismiss}) {
  const style=document.createElement('style');style.textContent=`.core-panel{width:min(370px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#fafbf7;border:1px solid #d3dccb;border-radius:18px;padding:22px;color:#28382d;box-shadow:0 12px 55px #1b2e2430;font:13px/1.5 Arial;margin-bottom:12px}.core-panel h2{font:26px/1.1 Georgia;margin:15px 0}.core-panel button{border:1px solid #bfccba;background:#eaf0df;border-radius:8px;padding:9px 13px;color:#293d2d;cursor:pointer}.core-panel article{border-top:1px solid #e0e6d9;padding:12px 0}.core-panel strong{display:block}.core-panel small{color:#69745f}.core-panel p{margin:7px 0}`;
  const box=document.createElement('section');box.className='core-panel';box.hidden=true;box.setAttribute('aria-label','BeforePay evidence');
  container.append(style,box);
  const close=document.createElement('button');close.textContent='Close';close.onclick=onDismiss;
  const rescan=document.createElement('button');rescan.textContent='Check again';rescan.onclick=onRescan;
  return {update(a,phase){box.replaceChildren();const brand=document.createElement('small');brand.textContent='BEFOREPAY · LOCAL CHECK';box.append(brand);const title=document.createElement('h2');title.textContent=phase==='checking'?'Checking this store…':a?.headline||'Check unavailable';box.append(title);const summary=document.createElement('p');summary.textContent=a?.summary||'Reviewing visible merchant information.';box.append(summary);if(a?.mode==='demo'){const note=document.createElement('p');note.textContent='DEMO: fictional store and sample identity records.';box.append(note);}for(const reason of a?.reasons||[]){const article=document.createElement('article');const label=document.createElement('strong');label.textContent=reason.title;const detail=document.createElement('p');detail.textContent=reason.detail;article.append(label,detail);box.append(article);}for(const limit of a?.limitations||[]){const p=document.createElement('small');p.textContent=limit;box.append(p,document.createElement('br'));}box.append(document.createElement('br'),rescan,document.createTextNode(' '),close);},setOpen(open){box.hidden=!open;},destroy(){style.remove();box.remove();}};
}
export function mountPopup(container,{onAction}) {
  container.innerHTML='<h1>BeforePay</h1><p>A second opinion before you pay.</p>';
  const label=document.createElement('p');const scan=document.createElement('button');scan.textContent='Check this store';scan.onclick=async()=>{scan.disabled=true;try{const result=await onAction({type:'SCAN_ACTIVE_TAB'});label.textContent=result.message||'Check opened on the page.';}finally{scan.disabled=false;}};container.append(label,scan);
  return {update(state){label.textContent=state.error||state.originLabel;scan.disabled=!state.supported||state.busy;},destroy(){container.replaceChildren();}};
}
