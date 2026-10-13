const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.resolve(__dirname,'..');const crypto=require('node:crypto');
function bundler(){try{return require('esbuild');}catch{} const dir=path.join(os.homedir(),'.npm/_npx');if(fs.existsSync(dir))for(const item of fs.readdirSync(dir)){const p=path.join(dir,item,'node_modules/esbuild');if(fs.existsSync(p))try{return require(p);}catch{}}throw new Error('Install dependencies with npm install (esbuild).');}
function candidates(dir){const target=path.join(root,dir);if(!fs.existsSync(target))return [];return fs.readdirSync(target,{withFileTypes:true}).flatMap(e=>e.isDirectory()?candidates(path.join(dir,e.name)):/\.(js|mjs|ts)$/.test(e.name)&&!e.name.includes('.test.')?[path.join(dir,e.name)]:[]);}
const selections={};
function choose(name,dir){const files=candidates(dir).sort((a,b)=>Number(!/index\.(js|mjs|ts)$/.test(a))-Number(!/index\.(js|mjs|ts)$/.test(b)));for(const file of files){const text=fs.readFileSync(path.join(root,file),'utf8');if(new RegExp(`export\\s+(?:async\\s+)?(?:function|const|class)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`).test(text)){selections[name]=file;return file;}} selections[name]='src/runtime/fallback.js';return selections[name];}
const names={collectEvidence:'src/evidence',evaluate:'src/risk',mountPip:'src/pip',mountPanel:'src/panel',mountPopup:'src/popup'};
// The risk owner may expose both exports through its index module.
for(const name of Object.keys(names)){choose(name,names[name]);if(name==='collectEvidence'&&selections[name].includes('fallback'))choose(name,'src/risk');}
const plugin={name:'beforepay-components',setup(build){build.onResolve({filter:/^beforepay-components$/},()=>({path:'components',namespace:'beforepay'}));build.onLoad({filter:/.*/,namespace:'beforepay'},()=>({contents:Object.entries(selections).map(([name,file])=>`export {${name}} from ${JSON.stringify('./'+file)};`).join('\n'),resolveDir:root,loader:'js'}));}};
(async()=>{
 const esbuild=bundler();const out=path.join(root,'dist');fs.mkdirSync(path.join(out,'extension'),{recursive:true});
 const common={bundle:true,format:'iife',target:'chrome120',plugins:[plugin],logLevel:'warning'};
 await esbuild.build({...common,entryPoints:[path.join(root,'src/runtime/content-entry.js')],outfile:path.join(out,'extension/content.js')});
 await esbuild.build({...common,entryPoints:[path.join(root,'src/runtime/popup-entry.js')],outfile:path.join(out,'extension/popup.js')});
 await esbuild.build({...common,entryPoints:[path.join(root,'src/runtime/preview-entry.js')],outfile:path.join(out,'preview.js')});
 for(const file of ['manifest.json','background.js','popup.html'])fs.copyFileSync(path.join(root,'extension',file),path.join(out,'extension',file));
 fs.copyFileSync(path.join(root,'src/runtime/preview.html'),path.join(out,'preview.html'));
 fs.writeFileSync(path.join(out,'build-report.json'),JSON.stringify({builtAt:new Date().toISOString(),components:selections,sourceHashes:Object.fromEntries(Object.entries(selections).map(([name,file])=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]))},null,2));
 console.log('Built dist/extension and dist/preview.js');console.log(selections);
})().catch(error=>{console.error(error);process.exitCode=1;});
