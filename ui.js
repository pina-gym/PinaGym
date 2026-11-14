/* ui.js: halaman dan aksi tambahan (edit/hapus, kartu member, WhatsApp, pengingat, koneksi Supabase) */

/* ---------- pembantu ---------- */
const waNum=p=>{const d=String(p||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('62'))return d;if(d.startsWith('0'))return'62'+d.slice(1);if(d[0]==='8')return'62'+d;return d};
const daysLeft=m=>Math.round((new Date(m.end+'T00:00:00')-TODAY)/864e5);
const fillTpl=(b,m)=>String(b).replace(/\{nama\}/g,m.name).replace(/\{kode\}/g,m.code).replace(/\{tanggal\}/g,m.end).replace(/\{gym\}/g,S.settings.gym_name).replace(/\{sisa\}/g,Math.max(0,daysLeft(m))).replace(/\{paket\}/g,pkgName(m.pkg));
const tplBy=n=>S.tpl.find(t=>t.name===n)||S.tpl[0]||{id:'',name:'',body:'{nama}'};
const waLink=(m,body)=>{const n=waNum(m.phone);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(fillTpl(body,m)):''};
function openWa(url){if(!url)return false;const w=window.open(url,'_blank','noopener');if(!w)location.href=url;return true}
const markSent=(k,mid)=>{if(!S.wlog.some(l=>l.k===k)){S.wlog.push({k,m:mid,at:new Date().toISOString()})}};
const remDays=()=>String(S.settings.remind_days||'7,3,1,0').split(',').map(x=>parseInt(x,10)).filter(x=>x>=0).sort((a,b)=>a-b);
/* Antrean pesan: sambutan member baru, pengingat akan habis, dan membership sudah habis. Satu pesan per member per tahap. */
function queue(){
 const out=[],R=remDays(),sent=new Set(S.wlog.map(l=>l.k));
 S.members.forEach(m=>{
  if(m.joined>=iso(addD(TODAY,-7))){const k='w|'+m.id;if(!sent.has(k))out.push({m,k,kind:'welcome',lbl:'Selamat datang',tpl:tplBy('Selamat Datang'),d:-99})}
  if(m.freeze||((PKG.find(p=>p.id===m.pkg)||{days:30}).days<=1))return;const d=daysLeft(m);let st=null; // tiket harian tidak perlu pengingat
  if(d>=0){const r=R.find(x=>d<=x);if(r!==undefined)st='h'+r}else if(d>=-14)st='x';
  if(!st)return;const k=m.id+'|'+m.end+'|'+st;if(sent.has(k))return;
  out.push(d>=0?{m,k,kind:'remind',lbl:d===0?'Berakhir hari ini':'Berakhir '+d+' hari lagi',tpl:tplBy('Pengingat Expired'),d}:{m,k,kind:'expired',lbl:'Sudah berakhir',tpl:tplBy('Membership Habis'),d})});
 return out.sort((a,b)=>a.d-b.d)}
const canWa=()=>can('whatsapp.send')&&can('member.contact');
const ask=k=>{if(S.cf===k){S.cf='';return true}S.cf=k;render();return false};
const cfl=(k,a,v,t='Hapus')=>`<button class="btn sm red" data-a="${a}" data-v="${esc(v)}">${S.cf===k?'Yakin hapus?':t}</button>`;
const fm=(title,k,id,fields,btn)=>modal(`<h2 style="margin:0 0 10px">${title}</h2><form class="form" data-f="${k}" data-id="${esc(id||'')}">${fields}<div class="pill" style="justify-content:flex-end"><button type="button" class="btn ghost" data-a="mclose">Batal</button><button class="btn">${btn||'Simpan'}</button></div></form>`);
const fld=(l,n,v,t='text',x='')=>`<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
const adminsLeft=(skip)=>S.users.filter(u=>u.role==='admin'&&u.on&&u.id!==skip&&!!u.cloud===!!(S.users.find(x=>x.id===skip)||{}).cloud).length;
const cloudLive=()=>typeof SB!=='undefined'&&SB.live()&&S.user&&S.user.cloud;

/* ---------- menu & dashboard ---------- */
MENU.splice(MENU.findIndex(m=>m[0]==='system')+1,0,['cloud','Koneksi Database','settings.manage','db','Sistem']);
const _dash=P.dashboard;
P.dashboard=()=>{let b='';if(canWa()){const n=queue().length;if(n)b=`<div class="note" style="background:var(--warn-bg);color:var(--warn);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span><b>${n} pesan WhatsApp</b> menunggu: sambutan member baru dan pengingat membership.</span><button class="btn sm" data-a="go" data-v="whatsapp">Buka antrean</button></div>`}return b+_dash()};

/* ---------- member ---------- */
P.members=()=>{const c=can('member.contact');const f=S.filter,q=S.q.toLowerCase();
 const list=S.members.filter(m=>(!q||m.name.toLowerCase().includes(q)||m.code.toLowerCase().includes(q))&&(!f||mstat(m)[0]===f));
 return`${c?'':'<p class="mut">Akses terbatas: kontak (HP) disembunyikan untuk role Anda.</p>'}<div class="tb"><input id="q" placeholder="Cari nama / kode" value="${esc(S.q)}"><select data-ch="filter"><option value="">Semua status</option>${['Aktif','Akan Expired','Expired','Freeze'].map(x=>`<option${f===x?' selected':''}>${x}</option>`).join('')}</select>${can('member.create')?`<button class="btn ghost" data-a="go" data-v="register">${ico('plus')} Daftar baru</button>`:''}</div>
 <div class="card" id="mlist">${tbl(['Kode','Nama',...(c?['No. HP']:[]),'Paket','Berakhir','Status',''],list.map(m=>`<tr><td>${m.code}</td><td>${esc(m.name)}</td>${c?`<td>${esc(m.phone)}</td>`:''}<td>${esc(pkgName(m.pkg))}</td><td>${m.end}</td><td>${badge(mstat(m))}</td><td><span class="pill" style="flex-wrap:wrap;min-width:150px">${can('member.view')?`<button class="btn sm ghost" data-a="mcard" data-v="${m.id}">Kartu</button>`:''}${canWa()&&m.phone?`<button class="btn sm ghost" data-a="wasend" data-v="${m.id}" data-t="${mstat(m)[0]==='Expired'?tplBy('Membership Habis').id:tplBy('Pengingat Expired').id}">WA</button>`:''}${can('member.edit')?`<button class="btn sm ghost" data-a="editmember" data-v="${m.id}">Ubah</button>`:''}${can('membership.freeze')?`<button class="btn sm ghost" data-a="freeze" data-v="${m.id}">${m.freeze?'Aktifkan':'Freeze'}</button>`:''}${can('member.delete')?cfl('dm'+m.id,'delmember',m.id):''}</span></td></tr>`))}</div>`};

/* ---------- paket ---------- */
P.packages=()=>{const mg=can('package.manage');return`${mg?`<form class="card form wide" data-f="addpkg"><h2>Tambah paket</h2>${fld('Nama paket','name','','text','required')}${fld('Durasi (hari)','days','30','number','min="1" required')}${fld('Harga (Rp)','price','','number','min="0" required')}<button class="btn">Tambah Paket</button></form>`:''}
 <div class="card">${tbl(['Paket','Durasi','>Harga','Status',''],PKG.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.days} hari</td><td class="r">${rp(p.price)}</td><td>${badge(p.on?['Aktif','b-ok']:['Nonaktif','b-gray'])}</td><td>${mg?`<span class="pill" style="flex-wrap:wrap;min-width:150px"><button class="btn sm" data-a="editpkg" data-v="${p.id}">Ubah harga</button><button class="btn sm ghost" data-a="pkgtoggle" data-v="${p.id}">${p.on?'Nonaktifkan':'Aktifkan'}</button>${cfl('dp'+p.id,'delpkg',p.id)}</span>`:''}</td></tr>`))}</div>`};

/* ---------- produk ---------- */
P.products=()=>{const mg=can('product.manage'),cs=can('product.cost');return`${mg?`<form class="card form wide" data-f="addprod"><h2>Tambah produk</h2>${fld('Nama produk','name','','text','required')}${fld('Harga jual (Rp)','price','','number','min="0" required')}${cs?fld('Harga modal (Rp)','cost','0','number','min="0"'):''}${fld('Stok awal','stock','0','number','required')}<button class="btn">Tambah Produk</button></form>`:'<p class="mut">Mode hanya-lihat.</p>'}
 <div class="card">${tbl(['Produk','>Harga',...(cs?['>Modal']:[]),'>Stok',...(mg?['']:[])],S.products.map(p=>`<tr><td>${esc(p.name)}</td><td class="r">${rp(p.price)}</td>${cs?`<td class="r">${rp(p.cost||0)}</td>`:''}<td class="r">${p.stock}</td>${mg?`<td><span class="pill" style="flex-wrap:wrap;min-width:150px"><button class="btn sm" data-a="editprod" data-v="${p.id}">Ubah</button>${cfl('dd'+p.id,'delprod',p.id)}</span></td>`:''}</tr>`))}</div>`};

/* ---------- user ---------- */
P.users=()=>{const cl=cloudLive();return`${S.users.some(u=>u.cloud)?`<div class="note">Akun <b>Cloud</b> berasal dari Supabase. ${cl?'Tambah, reset password, dan hapus dijalankan lewat Edge Function admin-users.':'Login dengan akun Supabase untuk mengelolanya.'}</div>`:''}<div class="card">${tbl(['Nama','Username','Role','Status',''],S.users.map(u=>{const me=u.id===S.user.id,mine=!!u.cloud===!!S.user.cloud,okc=!u.cloud||cl;return`<tr><td>${esc(u.name)}${me?' (Anda)':''}</td><td>${esc(u.username)}</td><td>${ROLES[u.role]}</td><td>${badge(u.on?['Aktif','b-ok']:['Nonaktif','b-gray'])} ${u.cloud?badge(['Cloud','b-info']):badge(['Lokal','b-gray'])}${u.def?' '+badge(['Password awal','b-warn']):''}</td><td>${okc?`<span class="pill" style="flex-wrap:wrap;min-width:150px"><input type="password" placeholder="Password baru" data-pw="${u.id}" style="width:130px"><button class="btn sm ghost" data-a="resetpw" data-v="${u.id}">Reset</button><button class="btn sm" data-a="edituser" data-v="${u.id}">Ubah</button>${me?'':`<button class="btn sm ghost" data-a="usertoggle" data-v="${u.id}">${u.on?'Nonaktifkan':'Aktifkan'}</button>${cfl('du'+u.id,'deluser',u.id)}`}</span>`:'<span class="mut">Login Supabase untuk mengelola</span>'}</td></tr>`}))}</div>
 <form class="card form wide" data-f="adduser"><h2>Tambah user ${cl?'(akun Supabase)':'(akun lokal)'}</h2>${fld('Nama','name','','text','required')}${fld('Username','username','','text','required')}${fld('Password (min. 6)','password','','password','minlength="6" required')}<label>Role<select name="role">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn">Tambah User</button></form>`};

/* ---------- WhatsApp ---------- */
P.whatsapp=()=>{const t=S.tpl.find(x=>x.id==S.wa.t)||S.tpl[0]||{id:'',name:'',body:''},g=S.wa.g,soon=iso(addD(TODAY,+S.settings.expiring_days)),q=queue(),cw=canWa();
 const l=S.members.filter(m=>g==='new'?m.joined>=iso(addD(TODAY,-7)):g==='soon'?(!m.freeze&&m.end>=T0&&m.end<=soon):g==='expired'?m.end<T0:true);
 return`<div class="card"><h2>Antrean pesan otomatis</h2><p class="mut">Aplikasi menyusun siapa yang perlu dihubungi: member baru (sambutan) dan member yang akan habis (hari ke ${esc(remDays().join(', '))} sebelum berakhir) atau baru berakhir. Tiap pesan hanya muncul sekali. Tombol Kirim membuka WhatsApp dengan pesan sudah terisi, Anda tinggal menekan kirim di WhatsApp.</p>
 ${q.length?`<p><button class="btn" data-a="wanext">${ico('chat')} Kirim berikutnya (${q.length})</button></p>`:'<p class="badge-line">'+badge(['Tidak ada pesan menunggu','b-ok'])+'</p>'}
 ${tbl(['Member','Jenis',''],q.slice(0,50).map(x=>`<tr><td>${esc(x.m.name)}<br><small class="mut">${x.m.code} · ${x.m.phone?esc(x.m.phone):'HP kosong'}</small></td><td>${x.lbl}</td><td>${cw?`<span class="pill" style="flex-wrap:wrap;min-width:150px">${x.m.phone?`<button class="btn sm" data-a="qsend" data-v="${esc(x.k)}">Kirim WA</button>`:''}<button class="btn sm ghost" data-a="qskip" data-v="${esc(x.k)}">Lewati</button></span>`:''}</td></tr>`),'Tidak ada.')}</div>
 ${can('settings.manage')?`<form class="card form" data-f="settings"><h2>Jadwal pengingat</h2>${fld('Hari sebelum berakhir (pisahkan koma)','remind_days',S.settings.remind_days||'7,3,1,0')}<button class="btn">Simpan</button></form>`:''}
 <div class="tb"><select data-ch="watpl">${S.tpl.map(x=>`<option value="${x.id}"${x.id==t.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select><select data-ch="wag">${[['new','Member baru (7 hari terakhir)'],['soon','Akan expired'],['expired','Sudah expired'],['all','Semua member']].map(([k,v])=>`<option value="${k}"${k===g?' selected':''}>${v}</option>`).join('')}</select></div>
 ${can('whatsapp.manage')?`<div class="card form"><label>Isi template (variabel: {nama} {kode} {tanggal} {sisa} {paket} {gym})<textarea id="tplbody" rows="3">${esc(t.body)}</textarea></label><button class="btn" data-a="savetpl" data-v="${t.id}">Simpan Template</button></div>`:'<p class="mut">Gunakan template yang disediakan. Isi template tidak dapat diubah oleh role Anda.</p>'}
 <div class="card"><h2>Kirim manual</h2>${cw?'':'<p class="mut">Role Anda tidak memiliki akses kontak/WhatsApp.</p>'}${tbl(['Nama','Kode','Berakhir',''],l.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.code}</td><td>${m.end}</td><td>${cw&&m.phone?`<button class="btn sm" data-a="wasend" data-v="${m.id}" data-t="${esc(t.id)}">Kirim WA</button>`:''}</td></tr>`))}</div>`};

/* ---------- koneksi Supabase ---------- */
P.cloud=()=>{const c=SB.cfg(),st=SB.st,live=cloudLive();
 return`<div class="note">Data selalu disimpan di perangkat lebih dulu dan tetap bisa dipakai tanpa internet. Setelah terhubung, perubahan dikirim otomatis ke Supabase saat online.</div>
 <form class="card form" data-f="cloudcfg"><h2>Pengaturan Supabase</h2>${fld('Project URL','url',c?c.url:'','url','placeholder="https://xxxx.supabase.co" required')}${fld('Anon public key','key',c?c.key:'','text','placeholder="eyJ..." required')}<div class="pill"><button class="btn">Simpan &amp; Uji Koneksi</button>${c?'<button type="button" class="btn ghost" data-a="cloudtest">Uji lagi</button>':''}</div><p class="mut">Ada di Supabase: Project Settings → API. Jangan memakai kunci <code>service_role</code>.</p>${S.cmsg?`<div class="note" style="background:${S.cok?'var(--ok-bg)':'var(--err-bg)'};color:${S.cok?'var(--ok)':'var(--err)'}">${esc(S.cmsg)}</div>`:''}</form>
 ${c?`<div class="card"><h2>Status sinkron</h2><p>Koneksi: ${badge(live?['Login Supabase aktif','b-ok']:['Dikonfigurasi, belum login','b-warn'])} ${badge(navigator.onLine?['Online','b-ok']:['Offline','b-warn'])}</p>
 <p>${live?'Terakhir tersinkron: <b>'+(st.last?new Date(st.last).toLocaleString('id-ID'):'belum pernah')+'</b>.':'Keluar lalu masuk memakai <b>akun Supabase</b> (username dan password yang dibuat di Authentication) agar sinkron berjalan. Akun lokal tidak disinkronkan.'}${st.busy?' Sedang sinkron…':''}</p>
 ${st.err?`<div class="note" style="background:var(--err-bg);color:var(--err)">Gagal: ${esc(st.err)}</div>`:''}${st.rej?`<p class="mut">${st.rej} data ditolak server karena aturan hak akses atau validasi.</p>`:''}
 <p class="pill" style="flex-wrap:wrap">${live?`<button class="btn" data-a="cloudsync">${ico('refresh')} Sinkron sekarang</button><button class="btn ghost" data-a="cloudreset">${S.cf==='cr'?'Yakin? Data lokal diganti data server':'Ambil ulang dari server'}</button>`:''}<button class="btn red" data-a="clouddisc">${S.cf==='cd'?'Yakin putuskan?':'Putuskan koneksi'}</button></p></div>`:''}
 <div class="card"><h2>Cara menghubungkan</h2><ol><li>Pasang <code>supabase/schema.sql</code> di SQL Editor dan buat admin pertama (lihat supabase/README.md).</li><li>Isi URL dan anon key di atas, lalu <b>Simpan &amp; Uji Koneksi</b>.</li><li>Keluar, lalu masuk dengan akun Supabase (username admin yang dibuat saat bootstrap).</li><li>Pilih sumber data pertama: ambil dari server atau unggah data lokal.</li></ol></div>`};

/* ---------- aksi klik ---------- */
function showCard(id){const m=S.members.find(x=>x.id===id);if(!m)return;S.cardM=id;
 modal(`<div style="max-width:420px;margin:auto">${Card.svg(m,{gym:S.settings.gym_name,pkg:pkgName(m.pkg),end:m.end})}</div><p class="mut" style="margin:10px 0">QR berisi kode <b>${esc(m.code)}</b> untuk check-in. Ukuran cetak 85,6 × 54 mm (kartu ATM).</p><div class="pill" style="flex-wrap:wrap;justify-content:flex-end"><button class="btn ghost" data-a="cardprint">${ico('print')} Cetak</button><button class="btn ghost" data-a="cardpdf">Unduh PDF</button>${canWa()&&m.phone?`<button class="btn" data-a="cardwa">${ico('chat')} Kirim PDF ke WhatsApp</button>`:''}<button class="btn ghost" data-a="mclose">Tutup</button></div>`)}
const cardOpt=m=>({gym:S.settings.gym_name,pkg:pkgName(m.pkg),end:m.end});
function afterReg(mid){const b=document.querySelector('#modal .modal p');if(!b)return;
 b.insertAdjacentHTML('afterbegin',`<button class="btn ghost" data-a="mcard" data-v="${mid}" style="margin-right:6px">Kartu Member</button>${canWa()?`<button class="btn" data-a="wawelcome" data-v="${mid}" style="margin-right:6px">${ico('chat')} Kirim WA Selamat Datang</button>`:''}`)}

async function cloudCall(r,okMsg){if(r.ok){toast(okMsg);return true}toast(r.err.message);return false}

function extraClick(a,v,el){
 const D=el.dataset;
 if(a==='mcard'){if(can('member.view'))showCard(v);return true}
 if(a==='cardprint'){const m=S.members.find(x=>x.id===S.cardM);if(m)Card.print(m,cardOpt(m));return true}
 if(a==='cardpdf'){const m=S.members.find(x=>x.id===S.cardM);if(m){Card.download(Card.pdf(m,cardOpt(m)),'Kartu-'+m.code+'.pdf');log('kartu_pdf',m.code)}return true}
 if(a==='cardwa'){const m=S.members.find(x=>x.id===S.cardM);if(!m||!canWa())return true;
  const txt='Halo '+m.name+', berikut kartu member Anda di '+S.settings.gym_name+' (kode '+m.code+'). Tunjukkan QR saat check-in.';
  Card.share(m,cardOpt(m),txt,'https://wa.me/'+waNum(m.phone)+'?text='+encodeURIComponent(txt+' (PDF kartu terlampir)')).then(r=>{log('kartu_wa',m.code);if(r==='download')toast('PDF diunduh. Lampirkan ke chat WhatsApp yang terbuka.');});return true}
 if(a==='wasend'){const m=S.members.find(x=>x.id===v),t=S.tpl.find(x=>x.id===D.t)||S.tpl[0];if(!m||!canWa()||!t)return true;
  if(!openWa(waLink(m,t.body)))toast('Nomor HP member kosong.');else log('wa_kirim',m.code);return true}
 if(a==='wawelcome'){const m=S.members.find(x=>x.id===v);if(!m||!canWa())return true;
  if(!m.phone){toast('Nomor HP member kosong.');return true}openWa(waLink(m,tplBy('Selamat Datang').body));markSent('w|'+m.id,m.id);log('wa_sambutan',m.code);render();return true}
 if(a==='qsend'){const x=queue().find(y=>y.k===v);if(!x||!canWa())return true;if(!openWa(waLink(x.m,x.tpl.body))){toast('Nomor HP kosong.');return true}markSent(x.k,x.m.id);log('wa_antrean',x.m.code+' '+x.kind);render();return true}
 if(a==='qskip'){const x=queue().find(y=>y.k===v);if(x&&canWa()){markSent(x.k,x.m.id);log('wa_lewati',x.m.code);render()}return true}
 if(a==='wanext'){const x=queue().find(y=>y.m.phone);if(!x||!canWa()){toast('Tidak ada pesan yang bisa dikirim.');return true}openWa(waLink(x.m,x.tpl.body));markSent(x.k,x.m.id);log('wa_antrean',x.m.code+' '+x.kind);render();return true}
 if(a==='delmember'){if(!can('member.delete'))return true;if(!ask('dm'+v))return true;const i=S.members.findIndex(x=>x.id===v);if(i>=0){log('member_hapus',S.members[i].code);S.members.splice(i,1)}toast('Member dihapus.');render();return true}
 /* produk */
 if(a==='editprod'){if(!can('product.manage'))return true;const p=S.products.find(x=>x.id===v);if(!p)return true;
  fm('Ubah produk','editprod',v,fld('Nama','name',p.name,'text','required')+fld('Harga jual (Rp)','price',p.price,'number','min="0" required')+(can('product.cost')?fld('Harga modal (Rp)','cost',p.cost||0,'number','min="0"'):'')+fld('Stok','stock',p.stock,'number','required'));return true}
 if(a==='delprod'){if(!can('product.manage'))return true;if(!ask('dd'+v))return true;const i=S.products.findIndex(x=>x.id===v);if(i>=0){log('produk_hapus',S.products[i].name);S.products.splice(i,1);delete S.cart[v]}toast('Produk dihapus.');render();return true}
 /* paket */
 if(a==='editpkg'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===v);if(!p)return true;
  fm('Ubah paket','editpkg',v,fld('Nama paket','name',p.name,'text','required')+fld('Durasi (hari)','days',p.days,'number','min="1" required')+fld('Harga (Rp)','price',p.price,'number','min="0" required'));return true}
 if(a==='pkgtoggle'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===v);if(p){p.on=p.on?0:1;log('paket_status',p.name)}render();return true}
 if(a==='delpkg'){if(!can('package.manage'))return true;const n=S.members.filter(m=>m.pkg===v).length;if(n){S.cf='';toast('Paket dipakai '+n+' member. Gunakan Nonaktifkan.');render();return true}
  if(!ask('dp'+v))return true;const i=PKG.findIndex(x=>x.id===v);if(i>=0){log('paket_hapus',PKG[i].name);PKG.splice(i,1)}toast('Paket dihapus.');render();return true}
 /* member */
 if(a==='editmember'){if(!can('member.edit'))return true;const m=S.members.find(x=>x.id===v);if(!m)return true;
  fm('Ubah data member','editmember',v,fld('Nama','name',m.name,'text','required')+(can('member.contact')?fld('No. HP','phone',m.phone,'tel'):''));return true}
 /* user */
 if(a==='edituser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u)return true;const me=u.id===S.user.id;
  fm('Ubah user','edituser',v,fld('Nama','name',u.name,'text','required')+`<label>Role<select name="role"${me?' disabled':''}>${Object.entries(ROLES).map(([k,n])=>`<option value="${k}"${k===u.role?' selected':''}>${n}</option>`).join('')}</select></label>`);return true}
 if(a==='usertoggle'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u||u.id===S.user.id)return true;
  if(u.on&&u.role==='admin'&&!adminsLeft(u.id)){toast('Harus ada minimal satu admin aktif.');return true}
  if(u.cloud){SB.req('/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',body:{active:!u.on},prefer:'return=minimal'}).then(r=>{if(r.ok){u.on=u.on?0:1;log('user_status',u.username);render()}else toast(r.err.message)})}
  else{u.on=u.on?0:1;log('user_status',u.username);render()}return true}
 if(a==='deluser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u||u.id===S.user.id)return true;
  if(u.role==='admin'&&u.on&&!adminsLeft(u.id)){S.cf='';toast('Harus ada minimal satu admin aktif.');render();return true}
  if(!ask('du'+v))return true;
  if(u.cloud){SB.fn('admin-users',{action:'delete',user_id:u.id}).then(r=>{if(r.ok){if(r.data&&r.data.deactivated){u.on=0;toast('User punya riwayat transaksi, jadi dinonaktifkan (tidak bisa login).')}else{S.users=S.users.filter(x=>x.id!==u.id);toast('User dihapus.')}log('user_hapus',u.username);render()}else toast(r.err.message)})}
  else{S.users=S.users.filter(x=>x.id!==u.id);log('user_hapus',u.username);toast('User dihapus.');render()}return true}
 if(a==='resetpw'){if(!can('user.manage'))return true;const inp=document.querySelector(`[data-pw="${v}"]`),u=S.users.find(x=>x.id===v);if(!inp||!u)return true;
  if(inp.value.length<6){toast('Password minimal 6 karakter.');return true}
  if(u.cloud){SB.fn('admin-users',{action:'reset',user_id:u.id,password:inp.value}).then(r=>{if(r.ok){log('user_reset_password',u.username);toast('Password diperbarui.');render()}else toast(r.err.message)})}
  else setPw(u,inp.value).then(()=>{log('user_reset_password',u.username);render();toast('Password diperbarui.')});return true}
 /* koneksi */
 if(a==='cloudtest'){SB.test().then(r=>{S.cmsg=r.msg;S.cok=r.ok;render()});return true}
 if(a==='cloudsync'){SB.sync();toast('Sinkron dimulai…');return true}
 if(a==='cloudreset'){if(!ask('cr'))return true;SB.resetFromServer().then(()=>{toast('Data diambil dari server.');render()});return true}
 if(a==='clouddisc'){if(!ask('cd'))return true;const wasCloud=S.user&&S.user.cloud;SB.setCfg(null,null);SB.logout();S.users=S.users.filter(u=>!u.cloud);S.base={};S.lp={};S.sbinit=false;S.cmsg='';
  if(wasCloud){S.user=null;saveSession()}log('supabase_putus');render();toast('Koneksi diputus. Data tetap ada di perangkat.');return true}
 if(a==='sbpull'||a==='sbpush'){modal('');if(a==='sbpull')SB.resetFromServer().then(()=>render());else{S.sbinit=true;SB.sync()}return true}
 return false}

/* ---------- aksi form ---------- */
function extraSubmit(k,d,f){
 const id=f.dataset.id;
 if(k==='addprod'){if(!can('product.manage'))return true;const n=String(d.name).trim();if(!n)return true;S.products.push({id:uid(),name:n,price:+d.price||0,cost:+d.cost||0,stock:parseInt(d.stock,10)||0,se:1});log('produk_tambah',n);render();toast('Produk ditambahkan.');return true}
 if(k==='editprod'){if(!can('product.manage'))return true;const p=S.products.find(x=>x.id===id);if(!p)return true;const st=parseInt(d.stock,10)||0;
  if(st!==p.stock)p.se=1;p.name=String(d.name).trim()||p.name;p.price=+d.price||0;if('cost'in d)p.cost=+d.cost||0;p.stock=st;log('produk_ubah',p.name);modal('');render();toast('Produk disimpan.');return true}
 if(k==='addpkg'){if(!can('package.manage'))return true;const n=String(d.name).trim();if(!n)return true;PKG.push({id:uid(),name:n,days:Math.max(1,parseInt(d.days,10)||1),price:+d.price||0,on:1});log('paket_tambah',n);render();toast('Paket ditambahkan.');return true}
 if(k==='editpkg'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===id);if(!p)return true;p.name=String(d.name).trim()||p.name;p.days=Math.max(1,parseInt(d.days,10)||1);p.price=+d.price||0;log('paket_ubah',p.name);modal('');render();toast('Paket disimpan.');return true}
 if(k==='editmember'){if(!can('member.edit'))return true;const m=S.members.find(x=>x.id===id);if(!m)return true;m.name=String(d.name).trim()||m.name;if('phone'in d)m.phone=String(d.phone).trim();log('member_ubah',m.code);modal('');render();toast('Data member disimpan.');return true}
 if(k==='edituser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===id);if(!u)return true;const nn=String(d.name).trim()||u.name,nr=(u.id===S.user.id||!d.role)?u.role:d.role;
  if(u.role==='admin'&&nr!=='admin'&&!adminsLeft(u.id)){toast('Harus ada minimal satu admin aktif.');return true}
  if(u.cloud){SB.req('/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',body:{name:nn,role:nr},prefer:'return=minimal'}).then(r=>{if(r.ok){u.name=nn;u.role=nr;log('user_ubah',u.username);modal('');render();toast('User disimpan.')}else toast(r.err.message)})}
  else{u.name=nn;u.role=nr;log('user_ubah',u.username);modal('');render();toast('User disimpan.')}return true}
 if(k==='adduser'){if(!can('user.manage'))return true;const un=String(d.username).trim().toLowerCase();
  if(!/^[a-z0-9_.-]{3,30}$/.test(un)){toast('Username 3-30 karakter: huruf kecil, angka, titik, strip, garis bawah.');return true}
  if(S.users.some(x=>x.username===un&&!!x.cloud===cloudLive())){toast('Username sudah dipakai.');return true}
  if(!ROLES[d.role]||String(d.password).length<6){toast('Role atau password tidak valid.');return true}
  if(cloudLive()){SB.fn('admin-users',{action:'create',username:un,name:String(d.name).trim(),role:d.role,password:String(d.password)}).then(r=>{if(r.ok){log('user_tambah',un);toast('User ditambahkan.');SB.sync()}else toast(r.err.message)})}
  else{const u={id:un,name:String(d.name).trim(),username:un,role:d.role,on:1};setPw(u,String(d.password)).then(()=>{S.users.push(u);log('user_tambah',un);render();toast('User ditambahkan.')})}return true}
 if(k==='cloudcfg'){SB.setCfg(d.url,d.key);S.cmsg='Menguji…';S.cok=false;render();SB.test().then(r=>{S.cmsg=r.msg;S.cok=r.ok;log('supabase_atur');render()});return true}
 return false}

/* ---------- sinkron pertama ---------- */
function firstSync(){
 if(S.sbinit||!S.user.cloud)return;
 if(can('settings.manage')&&(S.members.length||S.products.length)){
  modal(`<h2 style="margin:0 0 8px">Sinkron pertama</h2><p>Terhubung ke Supabase. Pilih sumber data:</p><p><button class="btn" data-a="sbpull" style="width:100%;margin-bottom:8px">Pakai data Supabase (ganti data lokal)</button><button class="btn ghost" data-a="sbpush" style="width:100%">Unggah data lokal ke Supabase</button></p><p class="mut">Jika data di perangkat ini hanya data contoh, pilih yang pertama. Jika sudah ada data nyata di sini dan Supabase masih kosong, pilih yang kedua.</p>`)}
 else SB.resetFromServer().then(()=>render())}

/* ---------- tema warna ---------- */
// [nama, terang: utama, hover, lembut | gelap: utama, hover, lembut, teks di atas utama]
const THEMES={oranye:['Oranye',null],biru:['Biru',['#2563eb','#1d4ed8','#e8f0ff','#60a5fa','#93c5fd','#10203d','#07101f']],hijau:['Hijau',['#16a34a','#15803d','#e6f7ec','#4ade80','#86efac','#0f2a1a','#04150a']],
 ungu:['Ungu',['#7c3aed','#6d28d9','#f0e9ff','#a78bfa','#c4b5fd','#1e1535','#0e0820']],merah:['Merah',['#dc2626','#b91c1c','#ffe9e9','#f87171','#fca5a5','#351515','#1f0606']],
 teal:['Teal',['#0d9488','#0f766e','#e0f5f2','#2dd4bf','#5eead4','#0e2a27','#03181a']],abu:['Abu-abu',['#334155','#1e293b','#eef1f5','#cbd5e1','#e2e8f0','#1c2330','#0b1017']]};
const getMode=()=>{try{return localStorage.getItem('pinagym.mode')||'auto'}catch(e){return'auto'}};
function applyTheme(){
 const t=THEMES[S.settings.theme_color]||THEMES.oranye,c=t[1],m=getMode(),root=document.documentElement;
 if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
 let st=document.getElementById('thm');if(!st){st=document.createElement('style');st.id='thm';document.head.appendChild(st)}
 const L=c?`--brand:${c[0]};--brand-d:${c[1]};--brand-soft:${c[2]}`:'',D=c?`--brand:${c[3]};--brand-d:${c[4]};--brand-soft:${c[5]};--brand-ink:${c[6]}`:'';
 st.textContent=c?`:root{${L}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`:'';
 const dark=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);
 const mt=document.querySelector('meta[name=theme-color]');if(mt)mt.content=dark?'#11151c':(c?c[0]:'#e8590c')}
{const _rv=renderView;renderView=function(){applyTheme();return _rv.apply(this,arguments)}}
const _sys=P.system;
P.system=()=>_sys()+`<div class="card"><h2>Tampilan</h2><p class="mut">Warna utama berlaku untuk semua perangkat setelah tersinkron. Mode terang/gelap hanya untuk perangkat ini.</p>
 <div class="pill" style="flex-wrap:wrap;gap:10px">${Object.entries(THEMES).map(([k,[n,c]])=>{const on=(S.settings.theme_color||'oranye')===k;return`<button class="btn ghost" data-a="theme" data-v="${k}" aria-pressed="${on}" style="${on?'border:2px solid var(--brand);':''}"><span style="width:16px;height:16px;border-radius:50%;background:${c?c[0]:'#e8590c'};display:inline-block"></span>${n}</button>`}).join('')}</div>
 <p class="pill" style="flex-wrap:wrap;margin-top:12px">${[['auto','Otomatis (ikut perangkat)'],['light','Terang'],['dark','Gelap']].map(([k,n])=>`<button class="btn ${getMode()===k?'':'ghost'}" data-a="tmode" data-v="${k}">${n}</button>`).join('')}</p></div>`;
const _ec=extraClick;
extraClick=function(a,v,el){
 if(a==='theme'){if(can('settings.manage')&&THEMES[v]){S.settings.theme_color=v;log('tema_warna',v);render();toast('Warna diganti: '+THEMES[v][0])}return true}
 if(a==='tmode'){try{localStorage.setItem('pinagym.mode',v)}catch(e){}render();return true}
 return _ec.apply(this,arguments)};

/* ---------- uji login Supabase ---------- */
{const _pc=P.cloud;
 P.cloud=()=>{let h=_pc();if(SB.hasCfg()&&!cloudLive()){const rows=(S.diag||[]).map(([t,x])=>t==='code'?`<pre style="background:var(--bg);padding:10px;border-radius:8px;overflow:auto;user-select:all;white-space:pre-wrap">${esc(x)}</pre>`:`<div class="note" style="margin:6px 0;${t==='ok'?'background:var(--ok-bg);color:var(--ok)':t==='err'?'background:var(--err-bg);color:var(--err)':''}">${esc(x)}</div>`).join('');
  h+=`<form class="card form" data-f="cloudlogintest"><h2>Uji login Supabase</h2><p class="mut">Cek bertahap kenapa login gagal. Tidak mengubah apa pun.</p>${fld('Email atau username','u','','text','required autocomplete="off"')}${fld('Password','p','','password','required autocomplete="off"')}<button class="btn">Uji Login</button>${rows}</form>`}return h}}
const _es=extraSubmit;
extraSubmit=function(k,d,f){
 if(k==='cloudlogintest'){S.diag=[['hint','Menguji…']];render();SB.diagnose(d.u,d.p).then(r=>{S.diag=r;render()});return true}
 return _es.apply(this,arguments)};
