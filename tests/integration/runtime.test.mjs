import test from 'node:test';
import assert from 'node:assert/strict';
import {demoScenario,supportedUrl} from '../../src/runtime/observation.js';
import {createScanController} from '../../src/runtime/scan-controller.js';
import {pipState,isAssessment} from '../../src/contracts/index.js';

test('remote merchant cannot activate synthetic verification',()=>{
 assert.equal(demoScenario(new URL('https://shop.example/demo/index.html?scenario=matching-shoes')),null);
 assert.equal(demoScenario(new URL('http://127.0.0.1:4175/demo/index.html?scenario=matching-shoes')),null);
 assert.equal(demoScenario(new URL('http://127.0.0.1:4173/other?scenario=matching-shoes')),null);
 assert.equal(demoScenario(new URL('http://127.0.0.1:4173/demo/index.html?scenario=matching-shoes')),'matching-shoes');
});
test('mailbox and browser internals are excluded',()=>{
 assert.equal(supportedUrl(new URL('https://mail.google.com/mail/u/0')),false);
 assert.equal(supportedUrl(new URL('chrome://extensions')),false);
 assert.equal(supportedUrl(new URL('https://shoes.example/checkout')),true);
});
test('warning takes priority over verified identity in Pip expression',()=>{
 assert.equal(pipState({verdict:'warning',identityStatus:'verified'}),'warning');
 assert.equal(pipState({verdict:'uncertain',identityStatus:'demo_match'}),'uncertain');
});
test('incomplete engine response cannot pass contract',()=>{
 assert.equal(isAssessment({verdict:'no_flags',identityStatus:'verified'}),false);
});
test('older scan cannot overwrite a later assessment',async()=>{
 const resolvers=[];const results=[];
 const controller=createScanController({collect:scanId=>({scanId}),assess:observation=>new Promise(resolve=>resolvers.push(()=>resolve(observation))),currentKey:()=>'/checkout',onChecking:()=>{},onResult:r=>results.push(r.scanId),onError:()=>{}});
 const first=controller.scan();const second=controller.scan();
 resolvers[1]();await second;resolvers[0]();await first;
 assert.deepEqual(results,['2']);controller.destroy();
});
test('navigation discards the old page assessment',async()=>{
 let key='/one';let finish;const results=[];
 const controller=createScanController({collect:scanId=>({scanId}),assess:o=>new Promise(resolve=>finish=()=>resolve(o)),currentKey:()=>key,onChecking:()=>{},onResult:r=>results.push(r),onError:()=>{}});
 const pending=controller.scan();key='/two';finish();await pending;
 assert.equal(results.length,0);controller.destroy();
});
test('timeout reports failure and aborts provider work',async()=>{
 let signal;const errors=[];
 const controller=createScanController({collect:scanId=>({scanId}),assess:(o,options)=>{signal=options.signal;return new Promise(()=>{});},currentKey:()=>'/checkout',onChecking:()=>{},onResult:()=>assert.fail('Unexpected result'),onError:e=>errors.push(e.message),timeoutMs:10});
 await controller.scan();assert.equal(signal.aborted,true);assert.equal(errors.length,1);controller.destroy();
});
test('destroy prevents a pending result from touching removed UI',async()=>{
 let finish;let rendered=false;
 const controller=createScanController({collect:scanId=>({scanId}),assess:o=>new Promise(resolve=>finish=()=>resolve(o)),currentKey:()=>'/checkout',onChecking:()=>{},onResult:()=>rendered=true,onError:()=>{}});
 const pending=controller.scan();controller.destroy();finish();await pending;assert.equal(rendered,false);
});

test('page-provided or synthetic identity cannot grant live verification',async()=>{
 const {assessmentPolicyError}=await import('../../src/contracts/index.js');
 const observation={scanId:'a',pageKey:'https://shop.example',demoScenarioId:null};
 const base={schemaVersion:1,scanId:'a',pageKey:observation.pageKey,verdict:'no_flags',identityStatus:'verified',headline:'Verified',summary:'',evidence:[{kind:'identity',status:'matched',sourceType:'page'}],reasons:[],limitations:[],nextSteps:[],mode:'live'};
 assert.match(assessmentPolicyError(base,observation),/Independent/);
 assert.match(assessmentPolicyError({...base,identityStatus:'demo_match',mode:'demo'},observation),/Sample/);
 assert.equal(assessmentPolicyError({...base,evidence:[{kind:'identity',status:'matched',sourceType:'independent'}]},observation),null);
});
