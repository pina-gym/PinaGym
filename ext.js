/* ext.js: konfirmasi pop-up, tabel responsif, pilih banyak, dan fitur tambahan lain */

/* ---------- tabel responsif: label tiap sel diambil dari judul kolom ---------- */
function labelTables(){document.querySelectorAll('table.rt').forEach(t=>{const h=[...t.querySelectorAll('tr.th th')].map(x=>x.textContent.trim());
 t.querySelectorAll('tr:not(.th)').forEach(tr=>[...tr.children].forEach((td,i)=>{if(!td.hasAttribute('data-label'))td.setAttribute('data-label',h[i]||'')}))})}
{const _rv=renderView;renderView=function(){const r=_rv.apply(this,arguments);labelTables();return r}}

/* ---------- pilih banyak & hapus banyak ---------- */
const KLBL={products:'produk',packages:'paket',members:'member'};
function bulkRun(k,ids){let n=0,skip=0;const set=new Set(ids);
 if(k==='products'){if(!can('product.manage'))return;S.products=S.products.filter(p=>{if(set.has(p.id)){n++;delete S.cart[p.id];return false}return true})}
 else if(k==='packages'){if(!can('package.manage'))return;ids.forEach(id=>{if(S.members.some(m=>m.pkg===id)){skip++;return}const i=PKG.findIndex(x=>x.id===id);if(i>=0){PKG.splice(i,1);n++}})}
 else if(k==='members'){if(!can('member.delete'))return;S.members=S.members.filter(m=>{if(set.has(m.id)){n++;return false}return true})}
 S.sel[k].clear();log('hapus_banyak',k+' '+n);render();toast(n+' '+KLBL[k]+' dihapus'+(skip?'; '+skip+' paket dilewati karena dipakai member (gunakan Nonaktifkan)':'')+'.')}
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset&&t.dataset.sel){const k=t.dataset.sel;t.checked?S.sel[k].add(t.dataset.id):S.sel[k].delete(t.dataset.id);renderView()}
 else if(t.dataset&&t.dataset.selall){const k=t.dataset.selall;selIds(k).forEach(i=>t.checked?S.sel[k].add(i):S.sel[k].delete(i));renderView()}});

const _ecA=extraClick;
extraClick=function(a,v,el){
 if(a!=='cfyes')CUR={a,v,d:{...el.dataset}};
 if(a==='selall'){selIds(v).forEach(i=>S.sel[v].add(i));renderView();return true}
 if(a==='selclear'){S.sel[v].clear();renderView();return true}
 if(a==='bulkdel'||a==='bulkall'){const ids=a==='bulkdel'?[...S.sel[v]]:selIds(v);if(!ids.length)return true;
  const msg=a==='bulkdel'?'Hapus <b>'+ids.length+'</b> '+KLBL[v]+' yang dipilih?':'Hapus <b>SEMUA '+ids.length+'</b> '+KLBL[v]+(v==='members'?' (sesuai filter saat ini)':'')+'? Tindakan ini tidak bisa dibatalkan.';
  if(!ask('b'+a+v,msg,a==='bulkdel'?'Ya, hapus terpilih':'Ya, hapus semua'))return true;bulkRun(v,ids);return true}
 /* konfirmasi untuk tindakan lain di app.js */
 if(a==='void'){const t=S.tx.find(x=>x.id===v);if(t&&can('pos.cancel')&&!ask('vo'+v,'Batalkan transaksi <b>'+esc(t.inv)+'</b>?','Ya, batalkan'))return true}
 if(a==='deltx'){const t=S.tx.find(x=>x.id===v);if(t&&can('transaction.delete')){if(!ask('dt'+v,'Hapus permanen transaksi <b>'+esc(t.inv)+'</b>?'))return true}}
 if(a==='reseed'||a==='wipe'){if(can('settings.manage')){if(!ask('rs'+a,a==='reseed'?'Ganti semua data dengan data contoh? Data sekarang hilang.':'Kosongkan semua member, transaksi, check-in, dan produk? Data sekarang hilang.',a==='reseed'?'Ya, muat data contoh':'Ya, kosongkan'))return true;S.c=a}}
 if(a==='import'){if(can('backup.manage')){const f=$('#imp')&&$('#imp').files[0];if(f&&!ask('imp','Ganti semua data di perangkat ini dengan isi file backup?','Ya, pulihkan'))return true}}
 return _ecA.apply(this,arguments)};

/* ---------- Backup Database (Supabase) ---------- */
const BKSQL=`create table if not exists public.app_backups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  device text,
  kind text not null default 'auto',
  counts jsonb not null default '{}'::jsonb,
  data jsonb not null
);
create index if not exists app_backups_owner_time on public.app_backups (owner, created_at desc);
alter table public.app_backups enable row level security;
drop policy if exists app_backups_own on public.app_backups;
create policy app_backups_own on public.app_backups for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
revoke all on public.app_backups from anon;
grant select, insert, delete on public.app_backups to authenticated;`;
const fmtDT=iso=>{try{return new Date(iso).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return iso}};
const nmsg=(t,x)=>`<div class="note" style="background:var(--${t==='ok'?'ok':t==='err'?'err':'warn'}-bg);color:var(--${t==='ok'?'ok':t==='err'?'err':'warn'})">${esc(x)}</div>`;
function restoreData(d){
 if(!d||!Array.isArray(d.users)||!Array.isArray(d.members))throw new Error('Isi backup tidak valid');
 try{KV.set('pinagym.prerestore',JSON.stringify(snap()))}catch(e){}
 const me=S.user&&S.user.id;hydrate(d);S.user=S.users.find(u=>u.id===me&&u.on)||null;S.myPerms=null;Object.values(S.sel).forEach(x=>x.clear());saveSession();log('backup_pulihkan')}
P.backup=()=>{const c=SB.cfg(),st=SB.st,live=SB.live(),last=SB.last(),kb=Math.round(JSON.stringify(snap()).length/1024);
 if(live&&st.list===null&&!st.loading)setTimeout(()=>SB.list().then(()=>{if(!SB.st.list)SB.st.list=[];if(S.page==='backup')renderView()}),0);
 const rows=(st.list||[]).map(b=>{const n=b.counts||{};return`<tr><td>${fmtDT(b.created_at)}</td><td>${b.kind==='auto'?badge(['Otomatis','b-info']):badge(['Manual','b-gray'])}</td><td>${esc(b.device||'-')}</td><td>${n.members||0} member · ${n.tx||0} transaksi · ${n.products||0} produk · ${n.users||0} user</td><td><span class="pill" style="flex-wrap:wrap"><button class="btn sm" data-a="bkrestore" data-v="${b.id}">Pulihkan</button><button class="btn sm red" data-a="bkdel" data-v="${b.id}">Hapus</button></span></td></tr>`});
 return`<div class="card"><h2>Backup otomatis harian</h2>
  <p>${SB.autoOn()?badge(['Aktif','b-ok']):badge(['Nonaktif','b-gray'])} ${live?badge(['Akun backup terhubung','b-ok']):c?badge(['Belum masuk akun backup','b-warn']):badge(['Supabase belum diatur','b-warn'])} ${badge(navigator.onLine?['Online','b-ok']:['Offline','b-warn'])}</p>
  <p class="mut">Setiap hari, saat aplikasi dibuka dan ada internet, seluruh isi aplikasi (member, transaksi, produk, paket, user, trainer, gaji, pengaturan, template) dikirim ke Supabase. Disimpan ${SB.KEEP} backup terakhir. Ukuran data sekarang sekitar ${kb} KB.</p>
  <p>Backup terakhir dari perangkat ini: <b>${last.last?fmtDT(last.last):'belum pernah'}</b></p>
  ${st.err?nmsg('err','Gagal: '+st.err):''}${S.bmsg?nmsg(S.bok?'ok':'err',S.bmsg):''}
  <p class="pill" style="flex-wrap:wrap"><button class="btn" data-a="bkrun"${live&&!st.busy?'':' disabled'}>${ico('db')} ${st.busy?'Mengirim…':'Backup sekarang'}</button><button class="btn ghost" data-a="bkauto">${SB.autoOn()?'Matikan otomatis':'Aktifkan otomatis'}</button></p>
  <p class="mut">Backup otomatis hanya berjalan saat aplikasi terbuka (di tablet kasir, cukup biarkan aplikasi terbuka atau buka sekali sehari).</p></div>
 <form class="card form" data-f="bkcfg"><h2>Koneksi Supabase</h2>
  ${fld('Project URL','url',c?c.url:'','url','placeholder="https://xxxx.supabase.co" required')}${fld('Anon / publishable key','key',c?c.key:'','text','placeholder="eyJ... atau sb_publishable_..." required')}
  ${fld('Email akun backup','email',SB.email()||'','email','placeholder="email@contoh.com" autocomplete="off" required')}${fld('Password akun backup','password','','password','autocomplete="new-password" placeholder="'+(live?'(sudah masuk, kosongkan jika tidak diganti)':'')+'"'+(live?'':' required'))}
  <div class="pill" style="flex-wrap:wrap"><button class="btn">Simpan &amp; Hubungkan</button>${c?'<button type="button" class="btn ghost" data-a="bkdisc">Putuskan</button>':''}</div>
  <p class="mut">Akun backup = satu user di Supabase (Authentication → Users, centang <b>Auto Confirm User</b>). Ini <b>bukan</b> akun login aplikasi; user aplikasi dikelola di menu Manajemen User (ikut tersinkron antar perangkat). Jangan memakai kunci <code>service_role</code>.</p>
  <details><summary>SQL yang harus dijalankan sekali di Supabase (SQL Editor)</summary><pre style="background:var(--bg);padding:10px;border-radius:8px;overflow:auto;user-select:all;white-space:pre-wrap;font-size:12px">${esc(BKSQL)}</pre></details></form>
 ${live?`<div class="card"><h2>Daftar backup di server</h2><p class="pill" style="flex-wrap:wrap"><button class="btn ghost" data-a="bklist">${ico('refresh')} Muat ulang</button></p>${st.loading?'<p class="mut">Memuat…</p>':''}${tbl(['Waktu','Jenis','Perangkat','Isi',''],rows,'Belum ada backup di server.')}<p class="mut">Memulihkan akan mengganti seluruh data di perangkat ini. Salinan data sebelum dipulihkan disimpan otomatis di perangkat ini.</p></div>`:''}
 <div class="card form"><h2>Cadangkan ke file</h2><p>Unduh seluruh data sebagai file JSON dan simpan di tempat aman. File ini berisi hash password.</p><button class="btn" data-a="export">${ico('db')} Unduh Backup</button></div>
 <div class="card form"><h2>Pulihkan dari file</h2><p class="mut">Mengganti semua data di perangkat ini dengan isi file backup.</p><input type="file" id="imp" accept="application/json"><button class="btn ghost" data-a="import">Pulihkan</button></div>`};

{const _ecB=extraClick;extraClick=function(a,v,el){
 if(a==='bkrun'){if(!can('backup.manage'))return true;SB.backupNow('manual').then(r=>{S.bmsg=r.ok?'Backup berhasil dikirim ke Supabase.':'';S.bok=r.ok;if(r.ok)return SB.list();}).then(()=>renderView());return true}
 if(a==='bklist'){SB.list().then(()=>{if(!SB.st.list)SB.st.list=[];renderView()});return true}
 if(a==='bkauto'){if(can('backup.manage')){S.settings.auto_backup=SB.autoOn()?0:1;log('backup_otomatis',SB.autoOn()?'aktif':'nonaktif');render()}return true}
 if(a==='bkdisc'){if(!can('backup.manage'))return true;CUR={a,v,d:{...el.dataset}};if(!ask('bkdisc','Putuskan koneksi Supabase? Data di perangkat tidak berubah, backup di server tetap ada.','Ya, putuskan'))return true;SB.setCfg(null,null);SB.st.list=null;S.bmsg='';render();toast('Koneksi diputus.');return true}
 if(a==='bkdel'){if(!can('backup.manage'))return true;CUR={a,v,d:{...el.dataset}};if(!ask('bd'+v,'Hapus backup ini dari server?'))return true;SB.remove(v).then(r=>{toast(r.ok?'Backup dihapus.':r.err.message);return SB.list()}).then(()=>renderView());return true}
 if(a==='bkrestore'){if(!can('backup.manage'))return true;CUR={a,v,d:{...el.dataset}};
  if(!ask('br'+v,'Pulihkan data dari backup ini? <b>Seluruh data di perangkat ini diganti</b> dengan isi backup (user, member, transaksi, pengaturan). Salinan data sekarang disimpan dulu di perangkat.','Ya, pulihkan'))return true;
  SB.fetchData(v).then(r=>{if(!r.ok){toast(r.msg);return}try{restoreData(r.data);render();toast('Data dipulihkan dari backup '+fmtDT(r.at)+'.')}catch(e){toast(e.message)}});return true}
 return _ecB.apply(this,arguments)}}
{const _esB=extraSubmit;extraSubmit=function(k,d,f){
 if(k==='bkcfg'){if(!can('backup.manage'))return true;const old=SB.cfg(),chg=!old||old.url!==SB.cleanUrl(d.url)||old.key!==String(d.key).trim();if(chg||!SB.live())SB.setCfg(d.url,d.key);
  S.bmsg='Menghubungkan…';S.bok=true;SB.st.list=null;renderView();
  (async()=>{const t=await SB.test();if(!t.ok){S.bmsg=t.msg;S.bok=false;return}
   if(d.password||!SB.live()){const l=await SB.login(d.email,d.password);if(!l.ok){S.bmsg=l.msg;S.bok=false;return}S.bmsg=l.warn||'Terhubung dan akun backup berhasil masuk.';S.bok=!l.warn;log('supabase_atur')}
   else{S.bmsg='Pengaturan disimpan.';S.bok=true}
   SB.st.list=null})().then(()=>renderView());return true}
 return _esB.apply(this,arguments)}}
function afterLogin(){setTimeout(()=>SB.auto(),2500)}
addEventListener('DOMContentLoaded',()=>setTimeout(()=>SB.auto(),5000));
