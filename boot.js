/* boot.js: penyimpanan data utama di IndexedDB (kapasitas ratusan MB, bukan 5 MB seperti localStorage), lalu memuat semua skrip aplikasi.
   KV menyediakan get/set sinkron dari memori; penulisan ke IndexedDB menyusul (ditunda sebentar dan digabung).
   Data lama di localStorage dipindahkan otomatis. Bila IndexedDB tidak tersedia, KV memakai localStorage seperti sebelumnya. */
(function(){
const FILES=['qr.js','card.js','sync.js','app.js','ui.js','ext.js','scan.js','print.js','pay.js','xlsx.js','extra.js','pt.js','pos.js','logo.js','cards.js','daily.js','barcode.js','totals.js','remind.js','shift.js','search.js','storeui.js','syncdb.js'];
const BIG=['pinagym.v1','pinagym.sy','pinagym.prerestore'];
const mem={},dirty=new Set();let db=null,timer=0,chain=Promise.resolve();
const ls={g:k=>{try{return localStorage.getItem(k)}catch(e){return null}},s:(k,v)=>{localStorage.setItem(k,v)},d:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const KV=window.KV={mode:'ls',err:'',persisted:false,
 get(k){let v=mem[k];if(typeof v==='function'){v=mem[k]=v()}return v==null?null:v},
 set(k,v){mem[k]=v;dirty.add(k);sched()},
 setLazy(k,fn){mem[k]=fn;dirty.add(k);sched()},
 del(k){delete mem[k];dirty.add(k);sched()},
 flush(){return flush()},
 async usage(){const o={mode:KV.mode,err:KV.err,persisted:KV.persisted,usage:0,quota:0,bytes:{}};
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();o.usage=e.usage||0;o.quota=e.quota||0}}catch(e){}
  BIG.forEach(k=>{const v=KV.get(k);o.bytes[k]=v?v.length:0});return o}};
function banner(msg){let b=document.getElementById('kvbanner');
 if(!msg){if(b)b.remove();return}
 const mk=()=>{b=document.getElementById('kvbanner');if(!b){b=document.createElement('div');b.id='kvbanner';b.setAttribute('role','alert');b.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#b91c1c;color:#fff;padding:10px 14px;font:600 14px sans-serif;text-align:center';(document.body||document.documentElement).appendChild(b)}b.textContent=msg};
 if(document.body)mk();else addEventListener('DOMContentLoaded',mk,{once:true})}
function fail(e){KV.err=(e&&e.name)||String(e||'error');banner('Penyimpanan di perangkat ini gagal atau penuh ('+KV.err+'). Data terbaru BELUM tersimpan di perangkat. Segera unduh backup di menu Backup dan kosongkan ruang penyimpanan.')}
function ok(){if(KV.err){KV.err='';banner('')}}
function sched(){if(KV.mode==='ls'){flushLS();return}clearTimeout(timer);timer=setTimeout(flush,60)}
function flushLS(){dirty.forEach(k=>{try{const v=KV.get(k);v==null?ls.d(k):ls.s(k,v);ok()}catch(e){fail(e)}});dirty.clear()}
function flush(){clearTimeout(timer);if(KV.mode==='ls'){flushLS();return Promise.resolve()}
 const keys=[...dirty];dirty.clear();if(!keys.length)return chain;
 const vals=keys.map(k=>[k,KV.get(k)]);
 chain=chain.then(()=>new Promise(res=>{try{const tx=db.transaction('kv','readwrite'),st=tx.objectStore('kv');vals.forEach(([k,v])=>v==null?st.delete(k):st.put(v,k));
  tx.oncomplete=()=>{keys.forEach(k=>ls.d('pinagym.pend.'+k));ok();res()};tx.onerror=tx.onabort=()=>{fail(tx.error);keys.forEach(k=>dirty.add(k));res()}}catch(e){fail(e);keys.forEach(k=>dirty.add(k));res()}}));
 return chain}
const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function init(){
 try{
  if(!window.indexedDB)throw new Error('no idb');
  db=await new Promise((res,rej)=>{const r=indexedDB.open('pinagym',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'))});
  KV.mode='idb';const st=m=>db.transaction('kv',m).objectStore('kv');
  const gen=ls.g('pinagym.gen'),stored=await rq(st('readonly').get('gen'));
  if(stored&&stored!==gen)await rq(st('readwrite').clear());   /* localStorage dibersihkan = reset: data IndexedDB lama dianggap basi */
  for(const k of BIG){const v=await rq(st('readonly').get(k));if(v!=null)mem[k]=v}
  for(const k of BIG){const pd=ls.g('pinagym.pend.'+k);if(pd!=null){mem[k]=pd;dirty.add(k)}}   /* perubahan terakhir yang belum sempat tersimpan sebelum halaman ditutup */
  if(dirty.size){await flush();if(KV.err)throw new Error('pulihkan gagal')}
  let mig=false;for(const k of BIG){if(mem[k]==null){const l=ls.g(k);if(l!=null){mem[k]=l;dirty.add(k);mig=true}}}
  const g=gen||(Date.now().toString(36)+Math.random().toString(36).slice(2));try{ls.s('pinagym.gen',g)}catch(e){}
  await rq(st('readwrite').put(g,'gen'));
  if(mig){await flush();if(KV.err){throw new Error('migrasi gagal')}BIG.forEach(k=>ls.d(k))}  /* hapus salinan localStorage hanya setelah IndexedDB sukses */
  try{if(navigator.storage&&navigator.storage.persist)KV.persisted=await navigator.storage.persist()}catch(e){}
 }catch(e){KV.mode='ls';db=null;KV.err='';BIG.forEach(k=>{const l=ls.g(k);if(l!=null)mem[k]=l})}
}
/* sebelum halaman ditutup/dimuat ulang: salinan darurat sinkron di localStorage (bila muat) untuk perubahan yang belum sempat masuk IndexedDB */
function flushNow(){if(KV.mode!=='idb'||!dirty.size)return;
 dirty.forEach(k=>{if(BIG.includes(k)&&k!=='pinagym.prerestore'){try{const v=KV.get(k);if(v!=null)ls.s('pinagym.pend.'+k,v)}catch(e){}}});flush()}
addEventListener('pagehide',flushNow);addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushNow()});
(async()=>{
 await init();
 let last=null,n=0;
 const fire=()=>{if(document.readyState==='loading'){addEventListener('DOMContentLoaded',()=>{},{once:true});return}document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}))};
 const done=()=>{if(++n===FILES.length)fire()};
 FILES.forEach(f=>{const s=document.createElement('script');s.src=f;s.async=false;s.onload=s.onerror=done;document.body.appendChild(s)});
})();
})();
