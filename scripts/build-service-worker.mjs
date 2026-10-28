import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
const root=path.resolve('build/web')
async function files(directory){
 const entries=await readdir(directory,{withFileTypes:true})
 const groups=await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]))
 return groups.flat().filter(file=>!['sw.js','_headers','_redirects'].includes(path.basename(file)))
}
const paths=(await files(root)).sort(),hash=createHash('sha256')
for(const file of paths){hash.update(path.relative(root,file));hash.update(await readFile(file))}
const version=hash.digest('hex').slice(0,16)
const urls=['/',...paths.map(file=>'/'+path.relative(root,file).split(path.sep).join('/'))]
const source=`// Generated from the exact production files. Updates wait for old app tabs to close.
const CACHE='calces-${version}';
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('calces-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{return await fetch(request)}catch{
   const cache=await caches.open(CACHE);
   const page=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
   return (await cache.match(page))||(await cache.match(page+'.html'))||(await cache.match('/'))||Response.error();
  }})());
 }else if(FILES.includes(url.pathname)){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(request)));
 }
});
`
await writeFile(path.join(root,'sw.js'),source)
console.log(`Service worker ${version}: ${urls.length} local resources`)
