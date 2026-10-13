const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.test\.(js|mjs|cjs)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const tests=files('tests');if(!tests.length){console.error('No tests found');process.exit(1);}
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});process.exit(result.status??1);
