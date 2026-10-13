const {chromium}=require('/Users/ammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
(async()=>{
 const extension=path.resolve('dist/extension');
 const context=await chromium.launchPersistentContext('/tmp/beforepay-actions-'+Date.now(),{channel:'chromium',executablePath:require('./chrome-path.cjs'),headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1440,height:980}});
 try {
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const page=await context.newPage();
 await page.goto('http://127.0.0.1:4173/demo/index.html?scenario=suspicious-shoes#checkout');await page.locator('.bp-panel[data-view="warning"]').waitFor();
 const cdp=await context.newCDPSession(page);const worlds=new Map();cdp.on('Runtime.executionContextCreated',({context})=>worlds.set(context.id,context));await cdp.send('Runtime.enable');let world;for(const ctx of worlds.values()){const r=await cdp.send('Runtime.evaluate',{contextId:ctx.id,expression:'Boolean(globalThis.BeforePayGuardian)',returnByValue:true});if(r.result.value)world=ctx.id;}assert.ok(world);
 const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.includes('scenario=suspicious-shoes')).id);
 async function isolated(source){const r=await cdp.send('Runtime.evaluate',{contextId:world,expression:source,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined);return r.result.value;}
 await page.locator('.bp-panel').getByRole('button',{name:'Dismiss',exact:true}).focus();await page.keyboard.press('Escape');assert.equal(await page.locator('.bp-panel').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.querySelector('#beforepay-root').shadowRoot.activeElement?.className),'bp-pip__figure');
 await page.keyboard.press('Enter');await page.locator('.bp-panel').waitFor();
 const old=await isolated('BeforePayGuardian.getAssessment().scanId');await page.locator('.bp-panel').getByRole('button',{name:'Rescan',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#beforepay-root').shadowRoot.querySelector('.bp-panel').dataset.view==='warning');assert.notEqual(await isolated('BeforePayGuardian.getAssessment().scanId'),old);
 await page.locator('.bp-panel').getByRole('button',{name:'Dismiss',exact:true}).click();await page.locator('.bp-pip__hide').click();
 assert.equal(await page.locator('.bp-pip').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.scenario),'suspicious-shoes');
 await isolated('BeforePayGuardian.scan()');
 const popup=await context.newPage();
 // Toolbar popup targets are not exposed by headless Playwright. Load the installed
 // extension popup document and supply its active shopping tab; all other APIs are real.
 await popup.addInitScript(({tabId})=>{const query=chrome.tabs.query.bind(chrome.tabs);chrome.tabs.query=async options=>options.active?[await chrome.tabs.get(tabId)]:query(options);},{tabId});
 await popup.goto(worker.url().replace('background.js','popup.html'));
 await popup.getByRole('button',{name:'Check this store',exact:true}).waitFor();
 console.log('Popup loaded');await popup.getByRole('button',{name:'Check this store',exact:true}).click();await popup.getByText('Pip opened on the current page.',{exact:true}).waitFor();
 console.log('Popup scan completed');await popup.getByText('Reduce motion',{exact:true}).click();await popup.waitForTimeout(100);assert.equal(await worker.evaluate(async()=> (await chrome.storage.local.get('motion')).motion),'reduced');
 await popup.getByText('Follow system',{exact:true}).click();await popup.waitForTimeout(100);assert.equal(await worker.evaluate(async()=> (await chrome.storage.local.get('motion')).motion),'system');
 console.log('Motion actions persisted');
 const remove=popup.getByRole('button',{name:'Stop automatic checks on this site',exact:true});await remove.click();
 await popup.getByText('Check did not complete',{exact:true}).waitFor({timeout:3000});
 console.log('Required localhost permission removal fails visibly (Chrome baseline permission)');
 const timings=[];for(let i=0;i<5;i++)timings.push(await isolated('(async()=>{const t=performance.now();await BeforePayGuardian.scan();return performance.now()-t})()'));
 fs.writeFileSync('artifacts/extension-actions-result.json',JSON.stringify({checks:['Escape returns focus to Pip','Keyboard Enter opens panel','Rescan changes scan ID','Hide returns focus to visible page control','Installed popup document scans (active-tab adapter)' ,'Motion persists','Required local permission removal error visible'],scanAwaitMs:timings},null,2));console.log('Installed extension actions passed',timings);
 } finally {await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
