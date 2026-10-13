const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const dir=path.join(root,'dist/extension');
for(const name of ['manifest.json','background.js','content.js','popup.html','popup.js'])if(!fs.existsSync(path.join(dir,name)))throw new Error('Build first: missing '+name);
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const zip=path.join(root,'artifacts/BeforePay-extension.zip');if(fs.existsSync(zip))fs.unlinkSync(zip);
const result=spawnSync('/usr/bin/zip',['-qr',zip,'.'],{cwd:dir,stdio:'inherit'});if(result.status)process.exit(result.status);
console.log(zip);
