const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.resolve(__dirname,'..');const crypto=require('node:crypto');
function bundler(){try{return require('esbuild');}catch{} const dir=path.join(os.homedir(),'.npm/_npx');if(fs.existsSync(dir))for(const item of fs.readdirSync(dir)){const p=path.join(dir,item,'node_modules/esbuild');if(fs.existsSync(p))try{return require(p);}catch{}}throw new Error('Install dependencies with npm install (esbuild).');}
// Explicit integration: a missing export must fail the build, never select a temporary adapter.
const selections={collectEvidence:'src/risk/index.js',evaluate:'src/risk/index.js',mountPip:'src/pip/index.js',mountPanel:'src/panel/index.js',mountPopup:'src/popup/index.js'};
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
