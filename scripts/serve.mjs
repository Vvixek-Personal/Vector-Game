import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT)||3000;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=> {
 try {
  if(req.method!=='GET'&&req.method!=='HEAD') {res.writeHead(405);res.end();return;}
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
  if(file===root||pathname.endsWith('/')) file=resolve(root,'index.html');
  let info;try {info=await stat(file);} catch {
   if(extname(pathname)) {res.writeHead(404);res.end('File not found');return;}
   file=resolve(root,'index.html');info=await stat(file);
  }
  if(!info.isFile()) {res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch {res.writeHead(400);res.end('Unable to serve this request');}
});
server.on('error',err=>{console.error('Could not start Vector:',err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=> {
 const url='http://127.0.0.1:'+port;console.log('Vector is ready at '+url+' — keep this window open while playing.');
 if(process.argv.includes('--open')&&process.platform==='win32') spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
});
