/* syncdb.js: sinkron antar perangkat lewat Supabase (tabel sync_records, lihat supabase/sync.sql).
   Setiap data (member, transaksi, produk, user, dll.) disinkronkan per rekaman; yang terakhir diubah menang.
   Jalan otomatis (dibuka, tiap 90 dtk, setelah ada perubahan, saat kembali online) dan lewat tombol Sinkron. */
const SY=(()=>{
const KS='pinagym.sy',KO='pinagym.syoff';
const jr=()=>{try{return JSON.parse(KV.get(KS)||'null')}catch(e){return null}};
let sy=jr()||{cur:0,r:{},pend:{},joined:false,last:0};
const save=()=>{try{KV.setLazy(KS,()=>JSON.stringify(sy))}catch(e){}};
const st={busy:false,err:'',msg:'',up:0,down:0,join:null};
const on=()=>localStorage.getItem(KO)!=='1';
const h53=s=>{let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return(4294967296*(2097151&b)+(a>>>0)).toString(36)};
const ARR=['members','tx','checkins','products','tpl','users','trainers','tsess','visits','shifts','promos','opname','padj'];
const COLL={pkg:{get:()=>PKG,set:a=>{PKG.length=0;PKG.push(...a)}}};
ARR.forEach(k=>COLL[k]={get:()=>S[k],set:a=>{S[k]=a}});
const permObj=()=>Object.fromEntries(Object.entries(S.rolePerms).map(([k,v])=>[k,[...v]]));
const cfgRecs=()=>[{id:'settings',v:S.settings},{id:'perm',v:permObj()}];
const recs=c=>c==='cfg'?cfgRecs():COLL[c].get();
const CN=['cfg',...Object.keys(COLL)];
const ready=()=>SB.live()&&on();

function scan(){const now=Date.now(),seen=new Set();
 CN.forEach(c=>recs(c).forEach(x=>{if(!x||x.id==null)return;const k=c+'|'+x.id,hh=h53(JSON.stringify(x)),o=sy.r[k];seen.add(k);
  if(!o||o[0]!==hh||o[2]){sy.r[k]=[hh,now,0];sy.pend[k]=1}}));
 Object.keys(sy.r).forEach(k=>{if(!seen.has(k)&&!sy.r[k][2]){sy.r[k]=['',now,1];sy.pend[k]=1}});
 save()}

function applyRec(rec){const k=rec.coll+'|'+rec.id,o=sy.r[k];if(o&&o[1]>=rec.t)return false;
 if(rec.coll==='cfg'){const d=rec.data||{};
  if(rec.id==='settings'){Object.keys(S.settings).forEach(x=>delete S.settings[x]);Object.assign(S.settings,d)}
  else if(rec.id==='perm'){Object.keys(S.rolePerms).forEach(r=>{if(Array.isArray(d[r]))S.rolePerms[r]=new Set(d[r])});S.rolePerms.admin=new Set(ALL);S.myPerms=null}
  else return false;
  sy.r[k]=[h53(JSON.stringify(rec.id==='settings'?S.settings:permObj())),rec.t,0];delete sy.pend[k];return true}
 const col=COLL[rec.coll];if(!col)return false;const a=col.get(),i=a.findIndex(x=>x.id===rec.id);
 if(rec.del){if(i>=0)a.splice(i,1);sy.r[k]=['',rec.t,1]}
 else{if(!rec.data)return false;if(i>=0)a[i]=rec.data;else a.push(rec.data);sy.r[k]=[h53(JSON.stringify(rec.data)),rec.t,0]}
 delete sy.pend[k];return true}

async function pullAll(from){const out=[];let cur=from;
 for(;;){const r=await SB.req('/rest/v1/sync_records?select=coll,id,t,del,data,seq&seq=gt.'+cur+'&order=seq.asc&limit=500');
  if(!r.ok)throw new Error(r.status===404||/sync_records/.test(r.err.message)?'Tabel sync_records belum ada. Jalankan supabase/sync.sql di SQL Editor Supabase.':r.err.message);
  out.push(...r.data);if(r.data.length<500)break;cur=r.data[r.data.length-1].seq}
 return out}
async function push(){const keys=Object.keys(sy.pend);if(!keys.length)return 0;let n=0;
 for(let i=0;i<keys.length;i+=150){const part=keys.slice(i,i+150),body=[],sent={};
  part.forEach(k=>{const j=k.indexOf('|'),c=k.slice(0,j),id=k.slice(j+1),o=sy.r[k];if(!o)return;sent[k]=o[1];
   if(o[2])body.push({coll:c,id,t:o[1],del:true,data:null});
   else{const x=c==='cfg'?cfgRecs().find(y=>y.id===id):COLL[c]&&COLL[c].get().find(y=>y.id===id);if(!x){return}
    body.push({coll:c,id,t:o[1],del:false,data:c==='cfg'?x.v:x})}});
  if(!body.length)continue;
  const r=await SB.req('/rest/v1/sync_records?on_conflict=owner,coll,id',{method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});
  if(!r.ok)throw new Error(r.status===404||/sync_records/.test(r.err.message)?'Tabel sync_records belum ada. Jalankan supabase/sync.sql di SQL Editor Supabase.':r.err.message);
  part.forEach(k=>{if(sy.r[k]&&sent[k]===sy.r[k][1])delete sy.pend[k]});n+=body.length}
 save();return n}

function wipeLocal(){ARR.forEach(k=>{S[k]=[]});PKG.length=0;sy={cur:0,r:{},pend:{},joined:false,last:sy.last};}
function after(changed){if(!changed)return;
 const me=S.user&&S.user.id;S.users=S.users.filter(u=>ROLES[u.role]);S.myPerms=null;
 if(me){const u=S.users.find(x=>x.id===me&&x.on);if(u)S.user=u;else{S.user=null}}
 try{persistRaw()}catch(e){}
 try{if(!S.user)render();else if(!document.querySelector('#modal .modal')&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))renderView()}catch(e){}}
let persistRaw=()=>{try{KV.setLazy(KEY,()=>JSON.stringify(snap()))}catch(e){}};

async function run(why){
 if(st.busy||!ready()||!navigator.onLine)return{ok:false};
 if(st.join)return{ok:false};
 st.busy=true;st.err='';ui();
 try{
  if(!sy.joined){ // sinkron pertama di perangkat ini
   const rem=await pullAll(0),hasLocal=S.members.length||S.tx.length||S.products.length;
   if(rem.length&&hasLocal){st.join=rem;st.busy=false;if(forceRep){forceRep=false;await joinDo('replace');return{ok:!st.err}}joinAsk();ui();return{ok:false,ask:true}}
   if(rem.length){let ch=false;rem.forEach(r=>{if(applyRec(r))ch=true});sy.cur=rem[rem.length-1].seq;after(ch)}
   sy.joined=true;save()}
  else{scan();const rem=await pullAll(sy.cur);let ch=false;rem.forEach(r=>{if(applyRec(r))ch=true});if(rem.length)sy.cur=rem[rem.length-1].seq;st.down=rem.length;after(ch)}
  scan();const n=await push();st.up=n;sy.last=Date.now();save();st.msg=(st.down?st.down+' diterima':'')+(st.down&&n?', ':'')+(n?n+' terkirim':'')||'Sudah terbaru';
  return{ok:true}}
 catch(e){st.err=e.message||String(e);return{ok:false}}
 finally{st.busy=false;ui();pubPage()}}
function joinAsk(){modal(`<h2 style="margin:0 0 6px">Sinkron pertama di perangkat ini</h2><p>Server sudah berisi data (dari perangkat lain) dan perangkat ini juga punya data sendiri. Pilih cara menggabungkan:</p><div class="form"><button class="btn" data-a="syreplace">Ambil data dari server (data di perangkat ini diganti)</button><button class="btn ghost" data-a="symerge">Gabungkan (data perangkat ini dan server dipertahankan)</button><button class="btn ghost" data-a="sycancel">Nanti saja</button></div><p class="mut">Perangkat baru atau perangkat yang sedang berisi data contoh: pilih <b>Ambil data dari server</b>. Pilih <b>Gabungkan</b> hanya bila kedua sisi punya data nyata yang berbeda; data contoh bisa jadi dobel.</p>`)}
async function joinDo(mode){const rem=st.join;st.join=null;modal('');if(!rem)return;
 st.busy=true;ui();
 try{if(mode==='replace'){const me=S.user&&S.user.username;const keepSettings=null;wipeLocal();let ch=false;rem.forEach(r=>{if(applyRec(r))ch=true});sy.cur=rem[rem.length-1].seq;sy.joined=true;
   if(!S.users.length)S.users=[{id:'admin',name:'Administrator',username:'admin',role:'admin',on:1}];after(true);if(!S.user)toast('Data diganti dari server. Silakan masuk lagi.')}
  else{let ch=false;rem.forEach(r=>{if(applyRec(r))ch=true});sy.cur=rem[rem.length-1].seq;sy.joined=true;after(ch);scan();await push()}
  sy.last=Date.now();save();st.msg='Sinkron pertama selesai'}
 catch(e){st.err=e.message||String(e)}
 finally{st.busy=false;ui();pubPage()}}
const pubPage=()=>{try{if(S.user&&S.page==='backup'&&!document.querySelector('#modal .modal'))renderView()}catch(e){}};
function ui(){let b=document.getElementById('sybtn');if(!b){const n=document.getElementById('net');if(n&&SB.live()){n.insertAdjacentHTML('beforebegin','<button class="btn ghost sm" id="sybtn" data-a="syncnow">Sinkron</button>');b=document.getElementById('sybtn')}}if(!b)return;
 b.classList.toggle('busy',st.busy);b.textContent=st.busy?'Sinkron…':(st.err?'Sinkron ⚠':'Sinkron');b.title=st.err||('Terakhir: '+(sy.last?new Date(sy.last).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'belum pernah')+(st.msg?' · '+st.msg:''))}
let forceRep=false,tm=null;const dirty=()=>{if(!ready())return;clearTimeout(tm);tm=setTimeout(()=>run('change'),4000)};
setInterval(()=>{if(document.visibilityState==='visible')run('timer')},90*1000);
addEventListener('online',()=>setTimeout(()=>run('online'),1500));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>run('visible'),800)});
addEventListener('DOMContentLoaded',()=>setTimeout(()=>run('start'),3500));
return{st,run,dirty,joinDo,on,setOn:v=>{v?localStorage.removeItem(KO):localStorage.setItem(KO,'1')},last:()=>sy.last,pendN:()=>Object.keys(sy.pend).length,joined:()=>sy.joined,
 reset:f=>{sy={cur:0,r:{},pend:{},joined:false,last:0};forceRep=!!f;save()},ui}})();
const SYSQL=`create sequence if not exists public.sync_seq;
create table if not exists public.sync_records (
  owner uuid not null default auth.uid(),
  coll text not null, id text not null, t bigint not null,
  del boolean not null default false, data jsonb,
  seq bigint not null default nextval('public.sync_seq'),
  primary key (owner, coll, id));
create index if not exists sync_records_owner_seq on public.sync_records (owner, seq);
create or replace function public.sync_records_bi() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.t < old.t then return null; end if;
  new.seq := nextval('public.sync_seq');
  return new;
end $$;
drop trigger if exists sync_records_bi on public.sync_records;
create trigger sync_records_bi before insert or update on public.sync_records for each row execute function public.sync_records_bi();
alter table public.sync_records enable row level security;
drop policy if exists sync_records_own on public.sync_records;
create policy sync_records_own on public.sync_records for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
revoke all on public.sync_records from anon;
grant select, insert, update, delete on public.sync_records to authenticated;
grant usage, select on sequence public.sync_seq to authenticated;`;
/* simpan lokal -> jadwalkan sinkron */
{const _p=persist;persist=function(){_p.apply(this,arguments);SY.dirty()}}
/* tombol Sinkron di bilah atas */
{const _rv=renderView;renderView=function(){_rv.apply(this,arguments);if(!SB.live())return;const n=document.getElementById('net');if(n&&!document.getElementById('sybtn')){n.insertAdjacentHTML('beforebegin','<button class="btn ghost sm" id="sybtn" data-a="syncnow">Sinkron</button>');SY.ui()}}}
/* halaman Backup: kartu sinkron */
{const _b=P.backup;P.backup=()=>{const live=SB.live(),on=SY.on(),st=SY.st,l=SY.last();
 const card=`<div class="card"><h2>Sinkron antar perangkat</h2>
  <p>${on?badge(['Aktif','b-ok']):badge(['Nonaktif','b-gray'])} ${live?badge(['Terhubung','b-ok']):badge(['Hubungkan Supabase dulu','b-warn'])} ${SY.joined()?'':badge(['Belum sinkron pertama','b-warn'])}</p>
  <p class="mut">Laptop, HP dan tablet berbagi data yang sama (member, transaksi, produk, user, trainer, pengaturan, logo). Perubahan dikirim beberapa detik setelah disimpan dan diambil tiap 90 detik atau saat aplikasi dibuka. Bila dua perangkat mengubah data yang sama, perubahan <b>terakhir</b> yang dipakai. Perangkat yang sedang offline akan menyusul saat online lagi.</p>
  <p>Terakhir sinkron: <b>${l?fmtDT(new Date(l).toISOString()):'belum pernah'}</b> · menunggu dikirim: <b>${SY.pendN()}</b>${st.msg?' · '+esc(st.msg):''}</p>
  ${st.err?nmsg('err','Gagal: '+st.err):''}
  <p class="pill" style="flex-wrap:wrap"><button class="btn" data-a="syncnow"${live&&!st.busy?'':' disabled'}>${ico('refresh')} ${st.busy?'Menyinkronkan…':'Sinkronkan sekarang'}</button><button class="btn ghost" data-a="syauto">${on?'Matikan sinkron otomatis':'Aktifkan sinkron otomatis'}</button><button class="btn ghost" data-a="syfull"${live?'':' disabled'}>Ambil ulang semua dari server</button></p>
  <p class="mut"><b>Perangkat baru:</b> hubungkan Supabase di bawah (URL, key, email dan password akun backup yang sama), lalu pilih "Ambil data dari server".</p>
  <details><summary>SQL sinkron (jalankan sekali di Supabase SQL Editor)</summary><pre style="background:var(--bg);padding:10px;border-radius:8px;overflow:auto;user-select:all;white-space:pre-wrap;font-size:12px">${esc(SYSQL)}</pre></details></div>`;
 return card+_b()}}
{const _ec=extraClick;extraClick=function(a,v,el){
 if(a==='syncnow'){SY.run('manual').then(r=>{if(r.ok)toast('Sinkron selesai: '+SY.st.msg);else if(!r.ask)toast(SY.st.err||'Sinkron belum bisa dijalankan (hubungkan Supabase / periksa internet).')});SY.ui();return true}
 if(a==='syauto'){if(can('backup.manage')){SY.setOn(!SY.on());render()}return true}
 if(a==='syfull'){if(!can('backup.manage'))return true;CUR={a,v,d:{...el.dataset}};if(!ask('syfull','Ambil ulang SEMUA data dari server? Data di perangkat ini diganti dengan data server. Perubahan yang belum terkirim akan hilang. Salinan data sekarang disimpan dulu di perangkat.','Ya, ambil ulang'))return true;
  try{KV.set('pinagym.prerestore',JSON.stringify(snap()))}catch(e){}
  SY.reset(true);SY.run('full').then(r=>{if(!r.ok&&SY.st.err)toast(SY.st.err)});return true}
 if(a==='syreplace'){SY.joinDo('replace');return true}
 if(a==='symerge'){SY.joinDo('merge');return true}
 if(a==='sycancel'){SY.st.join=null;modal('');return true}
 return _ec.apply(this,arguments)}}
