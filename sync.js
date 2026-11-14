/* PinaGym: koneksi Supabase + sinkron offline-first.
   Tanpa library: memakai fetch ke Supabase Auth dan PostgREST.
   Data selalu ditulis ke perangkat dulu. Saat online, perubahan dikirim lalu perubahan server ditarik. */
const SB=(()=>{
const CK='pinagym.sb',SK='pinagym.sbs';
const jr=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const jw=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let cfg=jr(CK),ses=jr(SK);
const st={busy:false,err:'',last:0,rej:0,info:''};
const mail=u=>String(u).trim().toLowerCase()+'@pinagym.app';
const cleanUrl=u=>String(u||'').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/,'');

async function req(path,o={}){
 if(!cfg)return{ok:false,status:0,err:{message:'Supabase belum diatur'}};
 const go=async()=>{const h={apikey:cfg.key,Authorization:'Bearer '+(ses?ses.access:cfg.key),'Content-Type':'application/json',...(o.prefer?{Prefer:o.prefer}:{}),...(o.headers||{})};
  return fetch(cfg.url+path,{method:o.method||'GET',headers:h,body:o.body===undefined?undefined:JSON.stringify(o.body)})};
 let r;try{r=await go();if(r.status===401&&ses&&!o.noRefresh&&await refresh())r=await go()}catch(e){return{ok:false,status:0,err:{message:'Tidak ada koneksi ke Supabase'}}}
 let t='',d=null;try{t=await r.text();d=t?JSON.parse(t):null}catch(e){d=t}
 if(r.ok)return{ok:true,status:r.status,data:d};
 const m=d&&typeof d==='object'?(d.message||d.msg||d.error_description||d.error||t):t;
 return{ok:false,status:r.status,err:{code:d&&d.code,message:String(m||('HTTP '+r.status))}}}
const rpc=(n,b)=>req('/rest/v1/rpc/'+n,{method:'POST',body:b||{}});

async function refresh(){if(!ses||!ses.refresh)return false;
 try{const r=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:ses.refresh})});
  if(!r.ok)return false;const d=await r.json();ses={...ses,access:d.access_token,refresh:d.refresh_token||ses.refresh,exp:Date.now()+(d.expires_in||3600)*1000};jw(SK,ses);return true}catch(e){return false}}

/* ---- konfigurasi & login ---- */
function setCfg(url,key){cfg=url&&key?{url:cleanUrl(url),key:String(key).trim()}:null;jw(CK,cfg)}
async function test(){ // uji URL, kunci, dan apakah skema sudah dipasang
 if(!cfg)return{ok:false,msg:'Isi URL dan anon key dahulu.'};
 const r=await req('/rest/v1/public_settings?select=key,value',{noRefresh:1});
 if(r.status===0)return{ok:false,msg:r.err.message+'. Periksa URL project dan koneksi internet.'};
 if(r.status===401||r.status===403)return{ok:false,msg:'Anon key ditolak. Salin ulang "anon public" dari Project Settings → API.'};
 if(r.status===404)return{ok:false,msg:'Terhubung, tetapi skema belum dipasang. Jalankan schema.sql di SQL Editor.'};
 if(!r.ok)return{ok:false,msg:r.err.message};
 const g=(r.data||[]).find(x=>x.key==='gym_name');return{ok:true,msg:'Terhubung. Skema terpasang'+(g?' (gym: '+g.value+')':'')+'.'}}
async function login(un,pw){
 if(!cfg)return{ok:false,code:'nocfg'};
 let r;try{r=await fetch(cfg.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({email:mail(un),password:pw})})}catch(e){return{ok:false,code:'net',msg:'Tidak ada koneksi ke Supabase'}}
 const d=await r.json().catch(()=>({}));
 if(!r.ok)return{ok:false,code:r.status===400?'cred':'err',msg:d.error_description||d.msg||d.message||('HTTP '+r.status)};
 ses={access:d.access_token,refresh:d.refresh_token,exp:Date.now()+(d.expires_in||3600)*1000,uid:d.user.id};jw(SK,ses);
 const p=await req('/rest/v1/profiles?id=eq.'+ses.uid+'&select=*');
 const pr=p.ok&&p.data&&p.data[0];
 if(!pr){logout();return{ok:false,code:'noprof',msg:'Akun belum punya profil. Jalankan bootstrap_admin atau tambahkan lewat Manajemen User.'}}
 if(!pr.active){logout();return{ok:false,code:'off',msg:'Akun dinonaktifkan.'}}
 const pm=await rpc('my_permissions');
 return{ok:true,profile:pr,perms:pm.ok&&Array.isArray(pm.data)?pm.data:[]}}
function logout(){ses=null;jw(SK,null)}
const live=()=>!!(cfg&&ses);
const hasCfg=()=>!!cfg;

/* ---- pemetaan data ---- */
const jk=ts=>{const d=new Date(ts);return{d:d.toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'}),t:d.toLocaleTimeString('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'})}};
const isoAt=t=>new Date(t.date+'T'+(t.time||'00:00')+':00').toISOString();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const B=t=>(S.base[t]=S.base[t]||{});
const lp=()=>(S.lp=S.lp||{});

const SPEC={
 packages:{arr:()=>PKG,perm:'package.manage',del:'package.manage',
  wire:p=>({id:p.id,name:p.name,duration_days:+p.days,price:+p.price,active:!!p.on}),
  from:r=>({id:r.id,name:r.name,days:r.duration_days,price:+r.price,on:r.active?1:0})},
 products:{arr:()=>S.products,perm:'product.manage',del:'product.manage',
  wire:p=>({id:p.id,name:p.name,price:+p.price,active:true,...(p.se?{stock:+p.stock}:{})}),
  add:p=>({stock:+p.stock}),
  from:r=>({id:r.id,name:r.name,price:+r.price,stock:r.stock})},
 members:{arr:()=>S.members,perm:['member.create','member.edit','membership.freeze'],del:'member.delete',
  wire:m=>({id:m.id,code:m.code,name:m.name,status:m.freeze?'freeze':'active',joined_at:m.joined}),
  from:r=>({id:r.id,code:r.code,name:r.name,pkg:r.package_id,end:r.end_date,freeze:r.status==='freeze',joined:r.joined_at}),
  noPatch:['code','joined_at']}
};
const permOK=p=>[].concat(p).some(x=>can(x));
const sig=o=>JSON.stringify(o);

async function pushTable(name){
 const sp=SPEC[name],arr=sp.arr(),base=B(name);let n=0;
 for(const e of arr.slice()){
  const w=sp.wire(e),sg=sig(w),b=base[e.id];
  if(b===sg)continue;
  if(!permOK(sp.perm)){continue}
  let r;
  if(b===undefined){
   r=await req('/rest/v1/'+name,{method:'POST',body:{...w,...(sp.add?sp.add(e):{})},prefer:'return=minimal'});
   if(!r.ok&&r.err.code==='23505'&&/code/.test(r.err.message)&&name==='members'){ // bentrok kode member dengan perangkat lain
    for(let k=0;k<5&&!r.ok;k++){const mx=Math.max(0,...S.members.map(x=>+String(x.code).replace(/\D/g,'')||0));e.code='GYM'+String(mx+1).padStart(4,'0');w.code=e.code;r=await req('/rest/v1/'+name,{method:'POST',body:{...w,...(sp.add?sp.add(e):{})},prefer:'return=minimal'})}}
   if(!r.ok&&r.err.code==='23505'&&/pkey/.test(r.err.message))r=await patch(name,sp,e,w);
  }else r=await patch(name,sp,e,w);
  if(r.ok){e.se=0;base[e.id]=sig(sp.wire(e));n++}
  else if(r.status===403||r.err.code==='42501'){lp()[name]=null;st.rej++}
  else throw new Error(name+': '+r.err.message)}
 for(const id of Object.keys(base)){ // dihapus di perangkat -> hapus lunak di server
  if(arr.some(e=>e.id===id))continue;
  if(!permOK(sp.del))continue;
  const r=await req('/rest/v1/'+name+'?id=eq.'+id,{method:'PATCH',body:{deleted_at:new Date().toISOString()},prefer:'return=minimal'});
  if(r.ok||r.status===403||r.status===404)delete base[id];else throw new Error(name+': '+r.err.message)}
 return n}
function patch(name,sp,e,w){const b={...w};delete b.id;(sp.noPatch||[]).forEach(k=>delete b[k]);return req('/rest/v1/'+name+'?id=eq.'+e.id,{method:'PATCH',body:b,prefer:'return=minimal'})}

async function pushExtras(){
 // harga modal produk
 if(can('product.cost')){const bc=B('product_costs');for(const p of S.products){const w={product_id:p.id,cost:+p.cost||0},sg=sig(w);if(bc[p.id]===sg||B('products')[p.id]===undefined)continue;
  const r=await req('/rest/v1/product_costs?on_conflict=product_id',{method:'POST',body:w,prefer:'resolution=merge-duplicates,return=minimal'});if(r.ok)bc[p.id]=sg;else if(r.status!==403)throw new Error('product_costs: '+r.err.message)}}
 // kontak member
 const bk=B('member_contacts');for(const m of S.members){if(B('members')[m.id]===undefined)continue;const w={member_id:m.id,phone:m.phone||'',address:m.addr||''},sg=sig(w);if(bk[m.id]===sg||(!m.phone&&bk[m.id]===undefined))continue;
  const r=await req('/rest/v1/member_contacts?on_conflict=member_id',{method:'POST',body:w,prefer:'resolution=merge-duplicates,return=minimal'});if(r.ok)bk[m.id]=sg;else if(r.status!==403&&r.err.code!=='42501')throw new Error('member_contacts: '+r.err.message)}}

async function pushTx(){
 const bt=B('tx');let n=0;
 for(const t of S.tx.slice()){
  if(!t.sy){
   let r;
   if(t.type==='pos'){
    const its=(t.items||[]).filter(i=>i.pid);
    if(!its.length||its.length!==t.items.length){t.sy=1;bt[t.id]=1;continue} // data lama tanpa ID produk: tidak bisa dikirim
    r=await rpc('pos_checkout',{p_id:t.id,p_invoice:t.inv,p_items:its.map(i=>({product_id:i.pid,qty:i.qty})),p_method:t.method,p_at:isoAt(t)})}
   else{
    if(!t.mid||!t.pk){t.sy=1;bt[t.id]=1;continue}
    r=await rpc('membership_sale',{p_id:t.id,p_invoice:t.inv,p_member:t.mid,p_package:t.pk,p_method:t.method,p_at:isoAt(t)})}
   if(!r.ok&&r.err.code==='23505'&&/invoice/.test(r.err.message)){t.inv=t.inv+'-'+Math.random().toString(36).slice(2,4).toUpperCase();continue}
   if(r.ok){t.sy=1;bt[t.id]=1;n++}
   else if(r.err.code==='42501'||r.status===403){t.sy=1;bt[t.id]=1;st.rej++}
   else throw new Error('transaksi '+t.inv+': '+r.err.message)}
  if(t.sy&&t.voided&&!t.vsy){const r=await rpc('void_transaction',{p_id:t.id});if(r.ok||r.err.code==='42501'){t.vsy=1}else throw new Error('batal '+t.inv+': '+r.err.message)}}
 for(const id of Object.keys(bt)){if(S.tx.some(t=>t.id===id))continue;
  const r=await rpc('delete_transaction',{p_id:id});if(r.ok||r.err.code==='42501'||r.status===403)delete bt[id];else throw new Error('hapus transaksi: '+r.err.message)}
 for(const c of S.checkins.slice()){if(c.sy)continue;
  const r=await req('/rest/v1/checkins',{method:'POST',body:{id:c.id,member_id:c.m,checked_in_at:isoAt(c)},prefer:'return=minimal'});
  if(r.ok||r.err.code==='23505'){c.sy=1;n++}
  else if(r.status===400||r.status===403||r.status===409||r.err.code==='23503'||r.err.code==='P0001'||r.err.code==='42501'){c.sy=1;st.rej++} // ditolak aturan server
  else throw new Error('check-in: '+r.err.message)}
 return n}

async function pushMisc(){
 // log pengingat WA
 for(const l of S.wlog){if(l.sy)continue;const r=await req('/rest/v1/wa_log?on_conflict=k',{method:'POST',body:{k:l.k,member_id:l.m||null,created_at:l.at||new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});
  if(r.ok||r.status===403||r.err.code==='23503')l.sy=1;else if(r.status!==404)throw new Error('wa_log: '+r.err.message)}
 // template WA
 const bw=B('wa_templates');for(const t of S.tpl){if(!can('whatsapp.manage'))break;if(!UUID.test(t.id)){const o=t.id;t.id=uid();if(S.wa.t===o)S.wa.t=t.id}
  const w={id:t.id,name:t.name,body:t.body},sg=sig(w);if(bw[t.id]===sg)continue;
  const r=await req('/rest/v1/wa_templates?on_conflict=id',{method:'POST',body:w,prefer:'resolution=merge-duplicates,return=minimal'});if(r.ok)bw[t.id]=sg;else if(r.status!==403)throw new Error('wa_templates: '+r.err.message)}
 // pengaturan
 const bs=B('settings');for(const k of Object.keys(S.settings)){const g=k.startsWith('gym_');if(!can(g?'gym.settings':'settings.manage'))continue;
  const w={key:k,value:String(S.settings[k])},sg=sig(w);if(bs[k]===sg)continue;
  const r=await req('/rest/v1/settings?on_conflict=key',{method:'POST',body:w,prefer:'resolution=merge-duplicates,return=minimal'});if(r.ok)bs[k]=sg;else if(r.status!==403)throw new Error('settings: '+r.err.message)}}

/* ---- tarik perubahan dari server ---- */
async function fetchAll(path,since){
 const out=[];let off=0;
 for(;;){const q=path+(path.includes('?')?'&':'?')+(since?'updated_at=gte.'+encodeURIComponent(since)+'&':'')+'order=updated_at.asc,'+(/^\/rest\/v1\/member_contacts/.test(path)?'member_id':/^\/rest\/v1\/product_costs/.test(path)?'product_id':'id')+'.asc&limit=1000&offset='+off;
  const r=await req(q);if(!r.ok){if(r.status===403||r.status===404)return null;throw new Error(path.split('?')[0].replace('/rest/v1/','')+': '+r.err.message)}
  out.push(...r.data);if(r.data.length<1000)break;off+=1000}
 return out}
const maxTs=(rows,was)=>rows.reduce((a,r)=>r.updated_at>a?r.updated_at:a,was||'');
function upsertLocal(arr,id,obj){const i=arr.findIndex(x=>x.id===id);if(i<0)arr.push(obj);else Object.assign(arr[i],obj)}
function dropLocal(arr,id){const i=arr.findIndex(x=>x.id===id);if(i>=0)arr.splice(i,1)}

async function pullAll(){
 const L=lp();
 for(const name of['packages','products','members']){
  const sp=SPEC[name],rows=await fetchAll('/rest/v1/'+name+'?select=*',L[name]);if(!rows)continue;
  const arr=sp.arr();
  for(const r of rows){
   if(r.deleted_at){dropLocal(arr,r.id);delete B(name)[r.id];continue}
   const cur=arr.find(x=>x.id===r.id);const f=sp.from(r);
   if(cur&&B(name)[r.id]!==undefined&&B(name)[r.id]!==sig(sp.wire(cur))&&!(L[name]===null))f.__keep=1; // ada ubahan lokal yang belum terkirim
   if(f.__keep){continue}
   upsertLocal(arr,r.id,f);B(name)[r.id]=sig(sp.wire(arr.find(x=>x.id===r.id)))}
  L[name]=maxTs(rows,L[name])||L[name]}
 // modal produk
 if(can('product.cost')){const rows=await fetchAll('/rest/v1/product_costs?select=*',L.product_costs);if(rows){for(const r of rows){const p=S.products.find(x=>x.id===r.product_id);if(p){p.cost=+r.cost;B('product_costs')[p.id]=sig({product_id:p.id,cost:+r.cost})}}L.product_costs=maxTs(rows,L.product_costs)||L.product_costs}}
 // kontak member
 if(can('member.contact')){const rows=await fetchAll('/rest/v1/member_contacts?select=*',L.member_contacts);if(rows){for(const r of rows){const m=S.members.find(x=>x.id===r.member_id);if(m){m.phone=r.phone||'';m.addr=r.address||'';B('member_contacts')[m.id]=sig({member_id:m.id,phone:m.phone,address:m.addr})}}L.member_contacts=maxTs(rows,L.member_contacts)||L.member_contacts}}
 // transaksi
 {const rows=await fetchAll('/rest/v1/transactions?select=*,transaction_items(*,transaction_item_costs(cost))',L.transactions);
  if(rows){for(const r of rows){if(r.deleted_at){dropLocal(S.tx,r.id);delete B('tx')[r.id];continue}
   const c=jk(r.created_at);
   const o={id:r.id,inv:r.invoice,date:c.d,time:c.t,type:r.type,by:r.user_id,method:r.method,total:+r.total,voided:!!r.voided,vsy:r.voided?1:0,sy:1,mid:r.member_id,pk:r.package_id,
    items:(r.transaction_items||[]).map(i=>{const k=i.transaction_item_costs;return{name:i.name,qty:i.qty,price:+i.price,cost:+((Array.isArray(k)?(k[0]||{}).cost:(k||{}).cost)||0),pid:i.product_id}})};
   const cur=S.tx.find(x=>x.id===r.id);if(cur&&!o.voided&&cur.voided&&!cur.vsy){o.voided=true;o.vsy=0}
   upsertLocal(S.tx,r.id,o);B('tx')[r.id]=1}
   S.tx.sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);L.transactions=maxTs(rows,L.transactions)||L.transactions}}
 // check-in
 {const rows=await fetchAll('/rest/v1/checkins?select=*',L.checkins);
  if(rows){for(const r of rows){const c=jk(r.checked_in_at);upsertLocal(S.checkins,r.id,{id:r.id,date:r.checkin_date||c.d,time:c.t,m:r.member_id,sy:1})}L.checkins=maxTs(rows,L.checkins)||L.checkins}}
 // log pengingat
 {const rows=await fetchAll('/rest/v1/wa_log?select=*',L.wa_log);
  if(rows){for(const r of rows)if(!S.wlog.some(x=>x.k===r.k))S.wlog.push({k:r.k,m:r.member_id,at:r.created_at,sy:1});L.wa_log=maxTs(rows,L.wa_log)||L.wa_log}}
 // template WA
 {const rows=await fetchAll('/rest/v1/wa_templates?select=*',L.wa_templates);
  if(rows&&rows.length){if(!L.wa_templates||!Object.keys(B('wa_templates')).length){S.tpl=S.tpl.filter(t=>UUID.test(t.id))}
   for(const r of rows){upsertLocal(S.tpl,r.id,{id:r.id,name:r.name,body:r.body});B('wa_templates')[r.id]=sig({id:r.id,name:r.name,body:r.body})}
   if(!S.tpl.some(t=>t.id===S.wa.t))S.wa.t=S.tpl[0].id;L.wa_templates=maxTs(rows,L.wa_templates)||L.wa_templates}}
 // pengaturan
 {const r=await req('/rest/v1/settings?select=key,value');
  if(r.ok)for(const x of r.data){if(!(x.key in S.settings)&&!/^(gym_|session_|expiring_|remind_)/.test(x.key))continue;const cur=B('settings')[x.key];const lv=sig({key:x.key,value:String(S.settings[x.key])});
   if(cur!==undefined&&cur!==lv)continue;S.settings[x.key]=x.value!==''&&!isNaN(x.value)&&!/^(gym_|remind_)/.test(x.key)?+x.value:x.value;B('settings')[x.key]=sig({key:x.key,value:String(S.settings[x.key])})}}
 // staf
 {const r=await req('/rest/v1/staff?select=*');
  if(r.ok){const keep=S.users.filter(u=>!u.cloud);const old=new Map(S.users.filter(u=>u.cloud).map(u=>[u.id,u]));
   S.users=keep.concat(r.data.map(x=>({id:x.id,name:x.name,username:x.username,role:x.role,on:x.active?1:0,cloud:1,salt:(old.get(x.id)||{}).salt,ph:(old.get(x.id)||{}).ph}))).filter(u=>ROLES[u.role])}}
 // hak akses role (tampilan)
 {const r=await req('/rest/v1/role_permissions?select=role,perm');
  if(r.ok){const m={};r.data.forEach(x=>(m[x.role]=m[x.role]||new Set()).add(x.perm));Object.keys(S.rolePerms).forEach(k=>{if(k!=='admin'&&m[k])S.rolePerms[k]=m[k]})}}
}

/* ---- siklus sinkron ---- */
let timer=0;
async function sync(pullOnly){
 if(!live()||st.busy||!navigator.onLine||!S.user||!S.user.cloud)return;
 st.busy=true;st.err='';st.rej=0;pub();
 try{
  if(!pullOnly){await pushTable('packages');await pushTable('products');
  await pushTable('members');await pushExtras();
  await pushTx();await pushMisc()}
  await pullAll();
  S.sbinit=true;st.last=Date.now()
 }catch(e){st.err=e.message||String(e)}
 st.busy=false;persist(1);pub()}
function dirty(){
 if(S.tx.some(t=>!t.sy||(t.voided&&!t.vsy))||S.checkins.some(c=>!c.sy)||S.wlog.some(l=>!l.sy))return true;
 for(const n of Object.keys(SPEC)){const sp=SPEC[n],b=B(n),arr=sp.arr();if(arr.some(e=>b[e.id]!==sig(sp.wire(e))))return true;if(Object.keys(b).some(id=>!arr.some(e=>e.id===id)))return true}
 if(Object.keys(B('tx')).some(id=>!S.tx.some(t=>t.id===id)))return true;
 if(S.members.some(m=>B('members')[m.id]!==undefined&&m.phone&&B('member_contacts')[m.id]!==sig({member_id:m.id,phone:m.phone,address:m.addr||''})))return true;
 if(can('product.cost')&&S.products.some(p=>B('products')[p.id]!==undefined&&B('product_costs')[p.id]!==sig({product_id:p.id,cost:+p.cost||0})))return true;
 if(can('whatsapp.manage')&&S.tpl.some(t=>B('wa_templates')[t.id]!==sig({id:t.id,name:t.name,body:t.body})))return true;
 return Object.keys(S.settings).some(k=>B('settings')[k]!==sig({key:k,value:String(S.settings[k])})&&can(k.startsWith('gym_')?'gym.settings':'settings.manage'))}
function kick(ms){clearTimeout(timer);timer=setTimeout(sync,ms==null?4000:ms)}
function pub(){if(S.user&&S.page==='cloud')try{renderView()}catch(e){}const n=document.getElementById('syn');if(n){n.textContent=st.busy?'Sinkron…':st.err?'Gagal sinkron':'Tersinkron';n.className='bd '+(st.busy?'b-gray':st.err?'b-err':'b-ok')}}
addEventListener('online',()=>kick(500));
setInterval(()=>{if(live()&&S.user&&S.user.cloud&&document.visibilityState==='visible')sync()},60000);

/* Ambil ulang semua dari server (ganti data lokal) */
async function resetFromServer(){
 for(let i=0;i<100&&st.busy;i++)await new Promise(r=>setTimeout(r,100));
 S.members=[];S.products=[];S.tx=[];S.checkins=[];S.tpl=[];S.wlog=[];PKG.length=0;S.base={};S.lp={};S.sbinit=false;
 await sync(true);if(!S.tpl.length)S.tpl=[{id:'t1',name:'Pengingat Expired',body:'Halo {nama}, membership Anda di {gym} akan berakhir pada {tanggal}.'}];if(!S.tpl.some(t=>t.id===S.wa.t))S.wa.t=S.tpl[0].id}

/* ---- Edge Function (buat user, reset password, hapus user) ---- */
async function fn(name,body){
 if(!live())return{ok:false,err:{message:'Belum login ke Supabase'}};
 try{const go=()=>fetch(cfg.url+'/functions/v1/'+name,{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+ses.access,'Content-Type':'application/json'},body:JSON.stringify(body)});
  let r=await go();if(r.status===401&&await refresh())r=await go();
  const d=await r.json().catch(()=>({}));if(r.ok)return{ok:true,data:d};
  return{ok:false,status:r.status,err:{message:d.error||d.message||('HTTP '+r.status)}}}
 catch(e){return{ok:false,err:{message:'Tidak ada koneksi, atau Edge Function belum dipasang'}}}}

return{st,dirty,cfg:()=>cfg,hasCfg,live,setCfg,test,login,logout,sync,kick,req,rpc,fn,resetFromServer,mail,cleanUrl}})();
