import {collectEvidence,evaluate,mountPip,mountPanel} from 'beforepay-components';
import {collectObservation,checkoutContext,demoScenario} from './observation.js';
import {createScanController} from './scan-controller.js';
import {assessmentPolicyError,pipState} from '../contracts/index.js';

(() => {
  if(globalThis.BeforePayGuardian) return;
  const host=document.createElement('div');host.id='beforepay-root';host.setAttribute('data-beforepay-root','');
  host.style.cssText='all:initial!important;position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483646!important;max-width:calc(100vw - 28px)!important;pointer-events:auto!important;';
  const shadow=host.attachShadow({mode:'open'});
  const style=document.createElement('style');style.textContent=':host{color-scheme:light}*{box-sizing:border-box}button:focus-visible{outline:3px solid #915536;outline-offset:4px}.bp-layout{display:flex;flex-direction:column;align-items:flex-end;max-width:calc(100vw - 28px)}';
  const layout=document.createElement('div');layout.className='bp-layout';
  const panelRoot=document.createElement('div'),pipRoot=document.createElement('div');panelRoot.style.cssText='width:min(380px,calc(100vw - 36px));margin-bottom:12px';layout.append(panelRoot,pipRoot);shadow.append(style,layout);document.documentElement.append(host);
  let assessment=null,open=false,dismissedKey=null,lastContext=null,observerTimer=null;
  const getKey=()=>location.origin+location.pathname+'|'+location.search+'|'+location.hash;
  const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pip;
  function dock(expanded){host.style.left=expanded?'18px':'auto';host.style.right=expanded?'auto':'18px';layout.style.alignItems=expanded?'flex-start':'flex-end';}
  function restoreFocus(){const trigger=pipRoot.querySelector('button,[role=button]');trigger?.focus({preventScroll:true});}
  function close(){open=false;dock(false);panel.setOpen(false);pip.update({state:assessment?pipState(assessment):'idle',label:assessment?'Check details':'Meet Pip',message:assessment?.summary||'A second opinion before you pay.',expanded:false});dismissedKey=getKey();restoreFocus();}
  function show(){open=true;dock(true);panel.setOpen(true);pip.update({state:assessment?pipState(assessment):'checking',label:assessment?.headline||'Checking this store',message:assessment?.summary||'',expanded:true});}
  const panel=mountPanel(panelRoot,{onRescan:()=>scan(),onDismiss:close});
  pip=mountPip(pipRoot,{onOpen:()=>assessment?show():scan(),onDismiss:()=>{close();pip.update({state:'dismissed',label:'',message:'',expanded:false});},reducedMotion:motion()});
  pip.update({state:'idle',label:'Meet Pip',message:'A second opinion before you pay.',expanded:false});
  function fail(error){assessment={schemaVersion:1,scanId:'error',pageKey:location.origin+location.pathname,createdAt:new Date().toISOString(),mode:demoScenario(new URL(location.href))?'demo':'live',verdict:'error',identityStatus:'unverified',headline:'I couldn’t complete this check.',summary:error.message||'Try again or verify the seller independently.',reasons:[],evidence:[],nextSteps:['Try again.'],limitations:['An incomplete check is not a verification result.']};panel.update(assessment,'error');pip.update({state:'error',label:'Check unavailable',message:assessment.summary,expanded:open});}
  const controller=createScanController({
    currentKey:getKey,
    collect:id=>collectObservation(document,location.href,id),
    assess:async(observation,{signal})=>{
      const evidence=await collectEvidence(observation,{signal,providers:[]});
      if(signal.aborted) throw new Error('Check cancelled.');
      const result=await evaluate(observation,evidence);
      const policyError=assessmentPolicyError(result,observation);if(policyError)throw new Error(policyError);
      return result;
    },
    onChecking:()=>{assessment=null;open=true;dock(true);panel.update(null,'checking');panel.setOpen(true);pip.update({state:'checking',label:'Checking this store',message:'Looking at the available evidence.',expanded:true});},
    onResult:result=>{assessment=result;panel.update(result,'complete');pip.update({state:pipState(result),label:result.headline,message:result.summary,expanded:open});},
    onError:fail
  });
  function scan(){dismissedKey=null;return controller.scan();}
  function checkRoute(){
    const key=getKey(); const context=checkoutContext(document,new URL(location.href));
    if(lastContext?.key!==key){controller.invalidate();assessment=null;open=false;dock(false);panel.setOpen(false);pip.update({state:'idle',label:'Meet Pip',message:'A second opinion before you pay.',expanded:false});}
    const entering=context.detected&&(!lastContext?.detected||lastContext.key!==key);
    lastContext={key,detected:context.detected};
    if(entering&&dismissedKey!==key) scan();
  }
  const observer=new MutationObserver(records=>{
    if(records.every(r=>r.target===host||host.contains(r.target))) return;
    clearTimeout(observerTimer);observerTimer=setTimeout(checkRoute,180);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','data-checkout']});
  window.addEventListener('hashchange',checkRoute);window.addEventListener('popstate',checkRoute);window.addEventListener('beforepay:checkout-changed',checkRoute);
  const routeInterval=setInterval(checkRoute,1000);
  const motionStyle=document.createElement('style');shadow.append(motionStyle);
  function applyMotion(value){motionStyle.textContent=value==='reduced'?'*{animation:none!important;transition:none!important;scroll-behavior:auto!important}':'';}
  const storageChanged=(changes,area)=>{if(area==='local'&&changes.motion)applyMotion(changes.motion.newValue);};
  if(globalThis.chrome?.storage?.local){chrome.storage.local.get('motion').then(data=>applyMotion(data.motion));chrome.storage.onChanged.addListener(storageChanged);}
  globalThis.BeforePayGuardian={scan,getAssessment:()=>assessment,destroy(){controller.destroy();observer.disconnect();clearInterval(routeInterval);clearTimeout(observerTimer);window.removeEventListener('hashchange',checkRoute);window.removeEventListener('popstate',checkRoute);window.removeEventListener('beforepay:checkout-changed',checkRoute);globalThis.chrome?.storage?.onChanged?.removeListener(storageChanged);panel.destroy();pip.destroy();host.remove();delete globalThis.BeforePayGuardian;}};
  checkRoute();
})();
