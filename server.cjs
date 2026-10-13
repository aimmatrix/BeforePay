const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=__dirname;const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end('Bad request');}
 if(pathname==='/'){res.writeHead(302,{Location:'/demo/index.html'});return res.end();}
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!/^\/(demo|extension|fixtures|src|dist|assets)\//.test(pathname)){res.writeHead(404);return res.end('Not found');}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'Content-Type':(types[path.extname(file)]||'text/plain')+'; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(data);});
}).listen(Number(process.env.BEFOREPAY_PORT || 4173),'127.0.0.1',()=>console.log('BeforePay core demo server ready'));
