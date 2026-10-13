const {chromium}=require('/Users/ammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:980}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4174/demo/index.html?scenario=suspicious-shoes');
 await page.waitForSelector('#checkout-button');
 await page.addScriptTag({url:'http://127.0.0.1:4174/dist/preview.js'});
 await page.click('#checkout-button');
 await page.waitForFunction(()=>globalThis.BeforePayGuardian?.getAssessment());
 console.log('Suspicious scenario:',await page.evaluate(()=>globalThis.BeforePayGuardian.getAssessment().verdict));
 fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/suspicious-checkout.png',fullPage:true});
 await page.goto('http://127.0.0.1:4174/demo/index.html?scenario=matching-shoes#checkout');
 await page.addScriptTag({url:'http://127.0.0.1:4174/dist/preview.js'});
 await page.waitForFunction(()=>globalThis.BeforePayGuardian?.getAssessment());
 console.log('Matching scenario:',await page.evaluate(()=>({verdict:globalThis.BeforePayGuardian.getAssessment().verdict,identity:globalThis.BeforePayGuardian.getAssessment().identityStatus})));
 console.log('Page errors:',errors);if(errors.length)process.exitCode=1;
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
