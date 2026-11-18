/* ui.js: halaman dan aksi tambahan (edit/hapus, kartu member, WhatsApp, pengingat, koneksi Supabase) */

/* ---------- pembantu ---------- */
const waNum=p=>{const d=String(p||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('62'))return d;if(d.startsWith('0'))return'62'+d.slice(1);if(d[0]==='8')return'62'+d;return d};
const daysLeft=m=>Math.round((new Date(m.end+'T00:00:00')-TODAY)/864e5);
const fillTpl=(b,m)=>String(b).replace(/\{nama\}/g,m.name).replace(/\{kode\}/g,m.code).replace(/\{tanggal\}/g,m.end).replace(/\{gym\}/g,S.settings.gym_name).replace(/\{sisa\}/g,Math.max(0,daysLeft(m))).replace(/\{paket\}/g,pkgName(m.pkg));
const tplBy=n=>S.tpl.find(t=>t.name===n)||S.tpl[0]||{id:'',name:'',body:'{nama}'};
const waLink=(m,body)=>{const n=waNum(m.phone);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(fillTpl(body,m)):''};
function openWa(url){if(!url)return false;/* tab baru lewat <a>, tidak pernah mengganti halaman aplikasi */const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500);return true}
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
const canWa=()=>can('whatsapp.send');
const canCW=()=>canWa()||can('member.sendcard');
/* konfirmasi lewat pop-up (bukan klik dua kali) */
let CUR=null;
function ask(k,msg,okLabel){if(S.cfok===k){S.cfok='';return true}
 const c=CUR||{};S.cfAct={a:c.a,v:c.v,d:c.d,k};
 modal(`<h2 style="margin:0 0 8px">Konfirmasi</h2><p>${msg||'Yakin ingin menghapus data ini? Tindakan ini tidak bisa dibatalkan.'}</p><div class="pill" style="justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn ghost" data-a="mclose">Batal</button><button type="button" class="btn red" data-a="cfyes" id="cfyes">${okLabel||'Ya, hapus'}</button></div>`);
 return false}
const cfl=(k,a,v,t='Hapus')=>`<button class="btn sm red" data-a="${a}" data-v="${esc(v)}">${t}</button>`;
const fm=(title,k,id,fields,btn)=>modal(`<h2 style="margin:0 0 10px">${title}</h2><form class="form" data-f="${k}" data-id="${esc(id||'')}">${fields}<div class="pill" style="justify-content:flex-end"><button type="button" class="btn ghost" data-a="mclose">Batal</button><button class="btn">${btn||'Simpan'}</button></div></form>`);
const fld=(l,n,v,t='text',x='')=>`<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
const adminsLeft=skip=>S.users.filter(u=>u.role==='admin'&&u.on&&u.id!==skip).length;

/* ---------- pilih banyak ---------- */
S.sel={products:new Set(),packages:new Set(),members:new Set()};
const selTd=(k,id)=>`<td class="ck"><input type="checkbox" data-sel="${k}" data-id="${esc(id)}" aria-label="Pilih"${S.sel[k].has(id)?' checked':''}></td>`;
const selTh=(k,ids)=>'#sel:'+k+':'+(ids.length&&ids.every(i=>S.sel[k].has(i))?1:0);
const selBar=(k,ids,ok)=>ok&&ids.length?`<div class="bulk"><span>${S.sel[k].size?`<b>${S.sel[k].size}</b> dipilih`:'Centang beberapa data untuk dihapus sekaligus'}</span><span class="pill" style="flex-wrap:wrap">${S.sel[k].size?`<button class="btn sm red" data-a="bulkdel" data-v="${k}">Hapus terpilih (${S.sel[k].size})</button><button class="btn sm ghost" data-a="selclear" data-v="${k}">Batal pilih</button>`:''}<button class="btn sm ghost" data-a="selall" data-v="${k}">Pilih semua (${ids.length})</button><button class="btn sm red" data-a="bulkall" data-v="${k}">Hapus semua (${ids.length})</button></span></div>`:'';
const mtOK=m=>{const t=S.mtype||'monthly';return t==='all'||(t==='daily')===isDaily(m.pkg)};
const memList=()=>{const f=S.filter,q=S.q.toLowerCase();return S.members.filter(m=>(!q||m.name.toLowerCase().includes(q)||m.code.toLowerCase().includes(q))&&(!f||mstat(m)[0]===f)&&mtOK(m))};
const selIds=k=>k==='products'?S.products.map(x=>x.id):k==='packages'?PKG.map(x=>x.id):memList().map(x=>x.id);

/* ---------- menu & dashboard ---------- */
const _dash=P.dashboard;
P.dashboard=()=>{let b='';if(canWa()){const n=queue().length;if(n)b=`<div class="note" style="background:var(--warn-bg);color:var(--warn);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span><b>${n} pesan WhatsApp</b> menunggu: sambutan member baru dan pengingat membership.</span><button class="btn sm" data-a="go" data-v="whatsapp">Buka antrean</button></div>`}return b+_dash()};

/* ---------- member ---------- */
P.members=()=>{const c=can('member.contact');const f=S.filter,q=S.q.toLowerCase();
 const list=S.members.filter(m=>(!q||m.name.toLowerCase().includes(q)||m.code.toLowerCase().includes(q))&&(!f||mstat(m)[0]===f)&&mtOK(m));
 return`${c?'':'<p class="mut">Akses terbatas: kontak (HP) disembunyikan untuk role Anda.</p>'}<div class="tb"><input id="q" placeholder="Cari nama / kode" value="${esc(S.q)}"><select data-ch="filter"><option value="">Semua status</option>${['Aktif','Akan Expired','Expired','Freeze'].map(x=>`<option${f===x?' selected':''}>${x}</option>`).join('')}</select>${can('member.create')?`<button class="btn ghost" data-a="go" data-v="register">${ico('plus')} Daftar baru</button>`:''}</div>
 <div class="card" id="mlist">${selBar('members',list.map(m=>m.id),can('member.delete'))}${tbl([...(can('member.delete')?[selTh('members',list.map(m=>m.id))]:[]),'Kode','Nama',...(c?['No. HP']:[]),'Paket','Berakhir','Status',''],list.map(m=>`<tr>${can('member.delete')?selTd('members',m.id):''}<td>${m.code}</td><td>${esc(m.name)}${c&&m.addr?`<br><small class="mut">${esc(m.addr)}</small>`:''}</td>${c?`<td>${esc(m.phone)}</td>`:''}<td>${esc(pkgName(m.pkg))}</td><td>${m.end}</td><td>${badge(mstat(m))}</td><td><span class="pill" style="flex-wrap:wrap;min-width:150px">${can('member.view')?`<button class="btn sm ghost" data-a="mcard" data-v="${m.id}">Kartu</button>`:''}${canCW()&&m.phone&&can('member.view')?`<button class="btn sm ghost" data-a="mwacard" data-v="${m.id}">WA Kartu</button>`:''}${canWa()&&m.phone?`<button class="btn sm ghost" data-a="wasend" data-v="${m.id}" data-t="${mstat(m)[0]==='Expired'?tplBy('Membership Habis').id:tplBy('Pengingat Expired').id}">WA</button>`:''}${can('member.edit')?`<button class="btn sm ghost" data-a="editmember" data-v="${m.id}">Ubah</button>`:''}${can('membership.freeze')?`<button class="btn sm ghost" data-a="freeze" data-v="${m.id}">${m.freeze?'Aktifkan':'Freeze'}</button>`:''}${can('member.delete')?cfl('dm'+m.id,'delmember',m.id):''}</span></td></tr>`))}</div>`};

/* ---------- paket ---------- */
P.packages=()=>{const mg=can('package.manage');return`${mg?`<form class="card form wide" data-f="addpkg"><h2>Tambah paket</h2>${fld('Nama paket','name','','text','required')}${fld('Durasi (hari)','days','30','number','min="1" required')}${fld('Harga (Rp)','price','','number','min="0" required')}${ptFields({})}<button class="btn">Tambah Paket</button></form>`:''}
 <div class="card">${selBar('packages',PKG.map(p=>p.id),mg)}${tbl([...(mg?[selTh('packages',PKG.map(p=>p.id))]:[]),'Paket','Durasi','>Harga','Status',''],PKG.map(p=>`<tr>${mg?selTd('packages',p.id):''}<td>${esc(p.name)}${p.pt?' '+badge(['+ Trainer','b-info']):''}</td><td>${p.days} hari</td><td class="r">${rp(p.price)}</td><td>${badge(p.on?['Aktif','b-ok']:['Nonaktif','b-gray'])}</td><td>${mg?`<span class="pill" style="flex-wrap:wrap;min-width:150px"><button class="btn sm" data-a="editpkg" data-v="${p.id}">Ubah harga</button><button class="btn sm ghost" data-a="pkgtoggle" data-v="${p.id}">${p.on?'Nonaktifkan':'Aktifkan'}</button>${cfl('dp'+p.id,'delpkg',p.id)}</span>`:''}</td></tr>`))}</div>`};

/* ---------- produk ---------- */
P.products=()=>{const mg=can('product.manage'),cs=can('product.cost');return`${mg?`<form class="card form wide" data-f="addprod"><h2>Tambah produk</h2>${fld('Nama produk','name','','text','required')}${fld('Harga jual (Rp)','price','','number','min="0" required')}${cs?fld('Harga modal (Rp)','cost','0','number','min="0"'):''}${fld('Barcode (opsional, scan atau ketik)','bc','','text','autocomplete="off" inputmode="numeric"')}${fld('Stok awal','stock','0','number','required')}${fld('Stok minimum (peringatan)','min','10','number','min="0"')}<button class="btn">Tambah Produk</button></form>`:'<p class="mut">Mode hanya-lihat.</p>'}
 <div class="card">${selBar('products',S.products.map(p=>p.id),mg)}${tbl([...(mg?[selTh('products',S.products.map(p=>p.id))]:[]),'Produk','Barcode','>Harga',...(cs?['>Modal']:[]),'>Stok',...(mg?['']:[])],S.products.map(p=>`<tr>${mg?selTd('products',p.id):''}<td>${esc(p.name)}</td><td class="mut">${esc(p.bc||'-')}</td><td class="r">${rp(p.price)}</td>${cs?`<td class="r">${rp(p.cost||0)}</td>`:''}<td class="r">${p.stock}</td>${mg?`<td><span class="pill" style="flex-wrap:wrap;min-width:150px"><button class="btn sm" data-a="editprod" data-v="${p.id}">Ubah</button>${cfl('dd'+p.id,'delprod',p.id)}</span></td>`:''}</tr>`))}</div>`};

/* ---------- user ---------- */
P.users=()=>`<div class="note">Akun pengguna disimpan di perangkat ini (tidak perlu Supabase). Admin bebas menambah, mengubah, dan menghapus. Ikut tercadangkan di menu Backup Database.</div><div class="card">${tbl(['Nama','Username','Role','Status','Gaji pokok',''],S.users.map(u=>{const me=u.id===S.user.id;return`<tr><td>${esc(u.name)}${me?' (Anda)':''}</td><td>${esc(u.username)}</td><td>${ROLES[u.role]}</td><td>${badge(u.on?['Aktif','b-ok']:['Nonaktif','b-gray'])}${u.def?' '+badge(['Password awal','b-warn']):''}</td><td>${u.base?rp(u.base):'-'}</td><td><span class="pill" style="flex-wrap:wrap"><button class="btn sm" data-a="edituser" data-v="${u.id}">Ubah</button><button class="btn sm ghost" data-a="pwuser" data-v="${u.id}">Password</button>${me?'':`<button class="btn sm ghost" data-a="usertoggle" data-v="${u.id}">${u.on?'Nonaktifkan':'Aktifkan'}</button>${cfl('du'+u.id,'deluser',u.id)}`}</span></td></tr>`}))}</div>
 <form class="card form wide" data-f="adduser"><h2>Tambah user</h2>${fld('Nama','name','','text','required')}${fld('Username','username','','text','required')}${fld('Password (min. 6)','password','','password','minlength="6" required')}<label>Role<select name="role">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn">Tambah User</button></form>`;

/* ---------- WhatsApp ---------- */
P.whatsapp=()=>{const t=S.tpl.find(x=>x.id==S.wa.t)||S.tpl[0]||{id:'',name:'',body:''},g=S.wa.g,soon=iso(addD(TODAY,+S.settings.expiring_days)),q=queue(),cw=canWa();
 const l=S.members.filter(m=>g==='new'?m.joined>=iso(addD(TODAY,-7)):g==='soon'?(!m.freeze&&m.end>=T0&&m.end<=soon):g==='expired'?m.end<T0:true);
 return`<div class="card"><h2>Antrean pesan otomatis</h2><p class="mut">Aplikasi menyusun siapa yang perlu dihubungi: member baru (sambutan) dan member yang akan habis (hari ke ${esc(remDays().join(', '))} sebelum berakhir) atau baru berakhir. Tiap pesan hanya muncul sekali. Tombol Kirim membuka WhatsApp dengan pesan sudah terisi, Anda tinggal menekan kirim di WhatsApp.</p>
 ${q.length?`<p><button class="btn" data-a="wanext">${ico('chat')} Kirim berikutnya (${q.length})</button></p>`:'<p class="badge-line">'+badge(['Tidak ada pesan menunggu','b-ok'])+'</p>'}
 ${tbl(['Member','Jenis',''],q.slice(0,50).map(x=>`<tr><td>${esc(x.m.name)}<br><small class="mut">${x.m.code} · ${x.m.phone?esc(x.m.phone):'HP kosong'}</small></td><td>${x.lbl}</td><td>${cw?`<span class="pill" style="flex-wrap:wrap;min-width:150px">${x.m.phone?`<button class="btn sm" data-a="qsend" data-v="${esc(x.k)}">Kirim WA</button>`:''}<button class="btn sm ghost" data-a="qskip" data-v="${esc(x.k)}">Lewati</button></span>`:''}</td></tr>`),'Tidak ada.')}</div>
 ${can('settings.manage')?`<form class="card form" data-f="settings"><h2>Jadwal pengingat</h2>${fld('Hari sebelum berakhir (pisahkan koma)','remind_days',S.settings.remind_days||'7,3,1,0')}<button class="btn">Simpan</button></form>`:''}
 <div class="tb"><select data-ch="watpl">${S.tpl.map(x=>`<option value="${x.id}"${x.id==t.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select><select data-ch="wag">${[['new','Member baru (7 hari terakhir)'],['soon','Akan expired'],['expired','Sudah expired'],['all','Semua member']].map(([k,v])=>`<option value="${k}"${k===g?' selected':''}>${v}</option>`).join('')}</select></div>
 ${can('whatsapp.manage')?`<div class="card form"><label>Isi template (variabel: {nama} {kode} {tanggal} {sisa} {paket} {gym})<textarea id="tplbody" rows="3">${esc(t.body)}</textarea></label><button class="btn" data-a="savetpl" data-v="${t.id}">Simpan Template</button></div>`:'<p class="mut">Gunakan template yang disediakan. Isi template tidak dapat diubah oleh role Anda.</p>'}
 <div class="card"><h2>Kirim manual</h2>${cw?'':'<p class="mut">Role Anda tidak memiliki hak akses kirim WhatsApp.</p>'}${tbl(['Nama','Kode','Berakhir',''],l.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.code}</td><td>${m.end}</td><td>${cw&&m.phone?`<button class="btn sm" data-a="wasend" data-v="${m.id}" data-t="${esc(t.id)}">Kirim WA</button>`:''}</td></tr>`))}</div>`};

/* ---------- aksi klik ---------- */
function showCard(id){const m=S.members.find(x=>x.id===id);if(!m)return;S.cardM=id;
 modal(`<div style="max-width:420px;margin:auto">${Card.svg(m,{gym:S.settings.gym_name,pkg:pkgName(m.pkg),end:m.end})}</div><p class="mut" style="margin:10px 0">QR berisi kode <b>${esc(m.code)}</b> untuk check-in. Ukuran cetak 85,6 × 54 mm (kartu ATM).</p><div class="pill" style="flex-wrap:wrap;justify-content:flex-end"><button class="btn ghost" data-a="cardprint">${ico('print')} Cetak</button><button class="btn ghost" data-a="cardpdf">Unduh PDF</button>${canCW()&&m.phone?`<button class="btn" data-a="cardwa">${ico('chat')} Kirim PDF ke WhatsApp</button>`:''}<button class="btn ghost" data-a="mclose">Tutup</button></div>`)}
const welcomeTxt=m=>fillTpl(tplBy('Selamat Datang').body,m)+'\n\nKartu member Anda terlampir (kode '+m.code+'). Tunjukkan QR saat check-in.';
function waFlow(m){modal(`<div style="max-width:440px;margin:auto"><h2 style="margin:0 0 6px">Kirim kartu + sambutan</h2><p class="mut" style="margin:0 0 10px">${esc(m.name)} (${m.code}). WhatsApp tidak mengizinkan teks dan berkas dikirim sekaligus oleh aplikasi, jadi kirim dua langkah berikut. Tiap langkah cukup satu ketukan.</p><div class="note" style="white-space:pre-wrap;max-height:160px;overflow:auto">${esc(welcomeTxt(m))}</div><div class="form"><button class="btn" data-a="cwtext" data-v="${m.id}">${ico('chat')} 1. Kirim ucapan selamat datang</button><button class="btn" data-a="cwfile" data-v="${m.id}">${ico('card')} 2. Kirim PDF kartu member</button></div><p style="text-align:right;margin:12px 0 0"><button class="btn ghost" data-a="mclose">Tutup</button></p></div>`)}
const cardOpt=m=>({gym:S.settings.gym_name,pkg:pkgName(m.pkg),end:m.end});
const m0=id=>S.members.find(x=>x.id===id);
/* notifikasi pop up setelah member baru terdaftar: ajak kirim WA selamat datang + kartu */
function waNotify(mid){const m=m0(mid);const old=document.getElementById('wan');if(old)old.remove();
 if(!m||isDaily(m.pkg)||!canCW()||!String(m.phone||'').trim())return;
 const d=document.createElement('div');d.id='wan';d.setAttribute('role','alert');
 d.innerHTML=`<b>Member baru terdaftar</b><p>${esc(m.name)} (${m.code}). Kirim ucapan selamat datang dan kartu member lewat WhatsApp?</p><div class="pill"><button class="btn" data-a="wanopen" data-v="${m.id}">${ico('chat')} Kirim sekarang</button><button class="btn ghost" data-a="wanclose">Nanti</button></div>`;
 document.body.appendChild(d)}
function afterReg(mid){waNotify(mid);const b=document.querySelector('#modal .modal p');if(!b)return;
 b.insertAdjacentHTML('afterbegin',`<button class="btn ghost" data-a="mcard" data-v="${mid}" style="margin-right:6px">Kartu Member</button>${canCW()&&m0(mid)&&!isDaily(m0(mid).pkg)?`<button class="btn" data-a="cwfile" data-v="${mid}" style="margin-right:6px">${ico('card')} Kirim PDF Kartu</button>`:''}${canWa()?`<button class="btn" data-a="wawelcome" data-v="${mid}" style="margin-right:6px">${ico('chat')} Kirim WA Selamat Datang</button>`:''}`)}


function extraClick(a,v,el){
 const D=el.dataset;if(a!=='cfyes')CUR={a,v,d:{...D}};
 if(a==='mcard'){if(can('member.view'))showCard(v);return true}
 if(a==='cardprint'){const m=S.members.find(x=>x.id===S.cardM);if(m)Card.print(m,cardOpt(m));return true}
 if(a==='cardpdf'){const m=S.members.find(x=>x.id===S.cardM);if(m){Card.download(Card.pdf(m,cardOpt(m)),'Kartu-'+m.code+'.pdf');log('kartu_pdf',m.code)}return true}
 if(a==='wanclose'){const n=document.getElementById('wan');if(n)n.remove();return true}
 if(a==='wanopen'){const n=document.getElementById('wan');if(n)n.remove();const m=m0(v);if(m&&canCW())waFlow(m);return true}
 if(a==='cardwa'){const m=S.members.find(x=>x.id===S.cardM);if(!m||!canCW())return true;waFlow(m);return true}
 if(a==='cwtext'){const m=S.members.find(x=>x.id===v);if(m&&canCW()&&m.phone){openWa('https://wa.me/'+waNum(m.phone)+'?text='+encodeURIComponent(welcomeTxt(m)));log('wa_sambutan',m.code)}return true}
 if(a==='cwfile'){const m=S.members.find(x=>x.id===v);if(!m||!canCW())return true;const t=welcomeTxt(m);copyText(t);
  Card.share(m,cardOpt(m),t,null).then(r=>{log('kartu_wa',m.code);toast(r==='download'?'PDF kartu diunduh. Lampirkan ke chat WhatsApp member.':'Teks sambutan juga disalin: tempel sebagai keterangan bila belum muncul.')});return true}
 if(a==='wasend'){const m=S.members.find(x=>x.id===v),t=S.tpl.find(x=>x.id===D.t)||S.tpl[0];if(!m||!canWa()||!t)return true;
  if(!openWa(waLink(m,t.body)))toast('Nomor HP member kosong.');else log('wa_kirim',m.code);return true}
 if(a==='wawelcome'){const m=S.members.find(x=>x.id===v);if(!m||!canWa())return true;
  if(!m.phone){toast('Nomor HP member kosong.');return true}openWa(waLink(m,tplBy('Selamat Datang').body));markSent('w|'+m.id,m.id);log('wa_sambutan',m.code);render();return true}
 if(a==='qsend'){const x=queue().find(y=>y.k===v);if(!x||!canWa())return true;if(!openWa(waLink(x.m,x.tpl.body))){toast('Nomor HP kosong.');return true}markSent(x.k,x.m.id);log('wa_antrean',x.m.code+' '+x.kind);render();return true}
 if(a==='qskip'){const x=queue().find(y=>y.k===v);if(x&&canWa()){markSent(x.k,x.m.id);log('wa_lewati',x.m.code);render()}return true}
 if(a==='wanext'){const x=queue().find(y=>y.m.phone);if(!x||!canWa()){toast('Tidak ada pesan yang bisa dikirim.');return true}openWa(waLink(x.m,x.tpl.body));markSent(x.k,x.m.id);log('wa_antrean',x.m.code+' '+x.kind);render();return true}
 if(a==='delmember'){if(!can('member.delete'))return true;if(!ask('dm'+v,'Hapus member ini? Data kunjungan tetap tersimpan.'))return true;const i=S.members.findIndex(x=>x.id===v);if(i>=0){log('member_hapus',S.members[i].code);S.members.splice(i,1)}toast('Member dihapus.');render();return true}
 /* produk */
 if(a==='editprod'){if(!can('product.manage'))return true;const p=S.products.find(x=>x.id===v);if(!p)return true;
  fm('Ubah produk','editprod',v,fld('Nama','name',p.name,'text','required')+fld('Harga jual (Rp)','price',p.price,'number','min="0" required')+(can('product.cost')?fld('Harga modal (Rp)','cost',p.cost||0,'number','min="0"'):'')+fld('Barcode (opsional)','bc',p.bc||'','text','autocomplete="off"')+fld('Stok','stock',p.stock,'number','required')+fld('Stok minimum (peringatan)','min',p.min==null?10:p.min,'number','min="0"'));return true}
 if(a==='delprod'){if(!can('product.manage'))return true;if(!ask('dd'+v,'Hapus produk ini?'))return true;const i=S.products.findIndex(x=>x.id===v);if(i>=0){log('produk_hapus',S.products[i].name);S.products.splice(i,1);delete S.cart[v]}toast('Produk dihapus.');render();return true}
 /* paket */
 if(a==='editpkg'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===v);if(!p)return true;
  fm('Ubah paket','editpkg',v,fld('Nama paket','name',p.name,'text','required')+fld('Durasi (hari)','days',p.days,'number','min="1" required')+fld('Harga (Rp)','price',p.price,'number','min="0" required')+ptFields(p));return true}
 if(a==='pkgtoggle'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===v);if(p){p.on=p.on?0:1;log('paket_status',p.name)}render();return true}
 if(a==='delpkg'){if(!can('package.manage'))return true;const n=S.members.filter(m=>m.pkg===v).length;if(n){S.cf='';toast('Paket dipakai '+n+' member. Gunakan Nonaktifkan.');render();return true}
  if(!ask('dp'+v,'Hapus paket ini?'))return true;const i=PKG.findIndex(x=>x.id===v);if(i>=0){log('paket_hapus',PKG[i].name);PKG.splice(i,1)}toast('Paket dihapus.');render();return true}
 /* member */
 if(a==='editmember'){if(!can('member.edit'))return true;const m=S.members.find(x=>x.id===v);if(!m)return true;
  fm('Ubah data member','editmember',v,fld('Nama','name',m.name,'text','required')+(can('member.contact')?fld('No. HP','phone',m.phone,'tel')+`<label>Alamat<textarea name="addr" rows="2">${esc(m.addr||'')}</textarea></label>`:'')+trainerSel(m.pkg,m.tid,true));return true}
 /* user */
 if(a==='edituser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u)return true;const me=u.id===S.user.id;
  fm('Ubah user','edituser',v,fld('Nama','name',u.name,'text','required')+fld('No. HP (untuk kirim slip gaji)','phone',u.phone||'','tel')+fld('Gaji pokok (Rp)','base',u.base||0,'number','min="0"')+`<label>Role<select name="role"${me?' disabled':''}>${Object.entries(ROLES).map(([k,n])=>`<option value="${k}"${k===u.role?' selected':''}>${n}</option>`).join('')}</select></label>`);return true}
 if(a==='usertoggle'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u||u.id===S.user.id)return true;
  if(u.on&&u.role==='admin'&&!adminsLeft(u.id)){toast('Harus ada minimal satu admin aktif.');return true}
  u.on=u.on?0:1;log('user_status',u.username);render();return true}
 if(a==='deluser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u||u.id===S.user.id)return true;
  if(u.role==='admin'&&u.on&&!adminsLeft(u.id)){toast('Harus ada minimal satu admin aktif.');return true}
  if(!ask('du'+v,'Hapus user <b>'+esc(u.name)+'</b>? Transaksi lama tetap tersimpan.'))return true;
  S.users=S.users.filter(x=>x.id!==u.id);log('user_hapus',u.username);toast('User dihapus.');render();return true}
 if(a==='pwuser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===v);if(!u)return true;
  fm('Ganti password: '+esc(u.name),'pwuser',v,fld('Password baru (min. 6)','password','','password','minlength="6" required autocomplete="new-password"'));return true}
 if(a==='cfyes'){const c=S.cfAct;modal('');if(c&&c.a){S.cfok=c.k;const b=document.createElement('button');Object.entries(c.d||{}).forEach(([n,x])=>b.dataset[n]=x);b.dataset.a=c.a;if(c.v!==undefined)b.dataset.v=c.v;b.hidden=true;document.body.appendChild(b);b.click();b.remove();S.cfok=''}return true}
 return false}

/* ---------- aksi form ---------- */
function extraSubmit(k,d,f){
 const id=f.dataset.id;
 if(k==='addprod'){if(!can('product.manage'))return true;const n=String(d.name).trim();if(!n)return true;const bc=String(d.bc||'').trim();if(bc&&S.products.some(x=>String(x.bc||'')===bc)){toast('Barcode sudah dipakai produk lain.');return true}S.products.push({id:uid(),bc,name:n,price:+d.price||0,cost:+d.cost||0,stock:parseInt(d.stock,10)||0,min:Math.max(0,parseInt(d.min,10)||0),se:1});log('produk_tambah',n);render();toast('Produk ditambahkan.');return true}
 if(k==='editprod'){if(!can('product.manage'))return true;const p=S.products.find(x=>x.id===id);if(!p)return true;const st=parseInt(d.stock,10)||0;
  if('bc'in d){const bc=String(d.bc||'').trim();if(bc&&S.products.some(x=>x.id!==p.id&&String(x.bc||'')===bc)){toast('Barcode sudah dipakai produk lain.');return true}p.bc=bc}
  if(st!==p.stock)p.se=1;if('min'in d)p.min=Math.max(0,parseInt(d.min,10)||0);p.name=String(d.name).trim()||p.name;p.price=+d.price||0;if('cost'in d)p.cost=+d.cost||0;p.stock=st;log('produk_ubah',p.name);modal('');render();toast('Produk disimpan.');return true}
 if(k==='addpkg'){if(!can('package.manage'))return true;const n=String(d.name).trim();if(!n)return true;PKG.push({id:uid(),name:n,days:Math.max(1,parseInt(d.days,10)||1),price:+d.price||0,on:1,pt:d.pt?1:0,ptv:Math.max(0,+d.ptv||0),ptn:Math.max(0,parseInt(d.ptn,10)||0)});log('paket_tambah',n);render();toast('Paket ditambahkan.');return true}
 if(k==='editpkg'){if(!can('package.manage'))return true;const p=PKG.find(x=>x.id===id);if(!p)return true;p.name=String(d.name).trim()||p.name;p.days=Math.max(1,parseInt(d.days,10)||1);p.price=+d.price||0;p.pt=d.pt?1:0;p.ptv=Math.max(0,+d.ptv||0);p.ptn=Math.max(0,parseInt(d.ptn,10)||0);log('paket_ubah',p.name);modal('');render();toast('Paket disimpan.');return true}
 if(k==='editmember'){if(!can('member.edit'))return true;const m=S.members.find(x=>x.id===id);if(!m)return true;m.name=String(d.name).trim()||m.name;if('phone'in d)m.phone=String(d.phone).trim();if('addr'in d)m.addr=String(d.addr).trim();{const pk=PKG.find(x=>x.id===m.pkg);if(pk&&pk.pt&&'tid'in d)m.tid=d.tid||''}log('member_ubah',m.code);modal('');render();toast('Data member disimpan.');return true}
 if(k==='edituser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===id);if(!u)return true;const nn=String(d.name).trim()||u.name,nr=(u.id===S.user.id||!d.role)?u.role:d.role;
  if(u.role==='admin'&&nr!=='admin'&&!adminsLeft(u.id)){toast('Harus ada minimal satu admin aktif.');return true}
  u.name=nn;u.role=nr;if('phone'in d)u.phone=String(d.phone).trim();if('base'in d)u.base=Math.max(0,+d.base||0);log('user_ubah',u.username);modal('');render();toast('User disimpan.');return true}
 if(k==='pwuser'){if(!can('user.manage'))return true;const u=S.users.find(x=>x.id===id);if(!u)return true;if(String(d.password).length<6){toast('Password minimal 6 karakter.');return true}
  setPw(u,String(d.password)).then(()=>{log('user_reset_password',u.username);modal('');render();toast('Password diperbarui.')});return true}
 if(k==='adduser'){if(!can('user.manage'))return true;const un=String(d.username).trim().toLowerCase();
  if(!/^[a-z0-9_.-]{3,30}$/.test(un)){toast('Username 3-30 karakter: huruf kecil, angka, titik, strip, garis bawah.');return true}
  if(S.users.some(x=>x.username===un)){toast('Username sudah dipakai.');return true}
  if(!ROLES[d.role]||String(d.password).length<6){toast('Role atau password tidak valid.');return true}
  const u={id:un,name:String(d.name).trim(),username:un,role:d.role,on:1};setPw(u,String(d.password)).then(()=>{S.users.push(u);log('user_tambah',un);render();toast('User ditambahkan.')});return true}
 return false}

/* ---------- tema warna (bebas pilih) ---------- */
const PRESET={oranye:['Oranye','#e8590c'],biru:['Biru','#2563eb'],hijau:['Hijau','#16a34a'],ungu:['Ungu','#7c3aed'],merah:['Merah','#dc2626'],pink:['Pink','#db2777'],amber:['Kuning','#d97706'],teal:['Teal','#0d9488'],abu:['Abu-abu','#334155']};
const hex2=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return null;const n=parseInt(m[1],16);return[n>>16,(n>>8)&255,n&255]};
const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixc=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const lumi=a=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
function palette(h){const c=hex2(h);if(!c)return null;const W=[255,255,255],K=[12,15,20],db=lumi(c)<.3?mixc(c,W,.4):c;
 return{L:{b:toHex(c),d:toHex(mixc(c,[0,0,0],.15)),s:toHex(mixc(c,W,.9)),i:lumi(c)>.42?'#14181f':'#ffffff'},D:{b:toHex(db),d:toHex(mixc(db,W,.2)),s:toHex(mixc(c,K,.82)),i:lumi(db)>.4?'#0b0f14':'#ffffff'}}}
const themeHex=()=>{const t=S.settings.theme_color||'oranye';return hex2(t)?(t[0]==='#'?t:'#'+t).toLowerCase():(PRESET[t]||PRESET.oranye)[1]};
const getMode=()=>{try{return localStorage.getItem('pinagym.mode')||'auto'}catch(e){return'auto'}};
function applyTheme(){
 const h=themeHex(),m=getMode(),root=document.documentElement,pl=h==='#e8590c'?null:palette(h);
 if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
 let st=document.getElementById('thm');if(!st){st=document.createElement('style');st.id='thm';document.head.appendChild(st)}
 const L=pl?`--brand:${pl.L.b};--brand-d:${pl.L.d};--brand-soft:${pl.L.s};--brand-ink:${pl.L.i}`:'',D=pl?`--brand:${pl.D.b};--brand-d:${pl.D.d};--brand-soft:${pl.D.s};--brand-ink:${pl.D.i}`:'';
 st.textContent=pl?`:root{${L}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`:'';
 const dark=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);
 const mt=document.querySelector('meta[name=theme-color]');if(mt)mt.content=dark?'#11151c':h}
{const _rv=renderView;renderView=function(){applyTheme();return _rv.apply(this,arguments)}}
const autoOn=()=>{const v=S.settings.auto_wa;return!(v===0||v==='0'||v===false)};
const _sys=P.system;
P.system=()=>_sys()+`<div class="card"><h2>Tampilan</h2><p class="mut">Warna utama berlaku untuk semua perangkat setelah tersinkron. Mode terang/gelap hanya untuk perangkat ini.</p>
 <div class="pill" style="flex-wrap:wrap;gap:10px">${Object.entries(PRESET).map(([k,[n,c]])=>{const on=themeHex()===c;return`<button class="btn ghost" data-a="theme" data-v="${k}" aria-pressed="${on}" style="${on?'border:2px solid var(--brand);':''}"><span style="width:16px;height:16px;border-radius:50%;background:${c};display:inline-block"></span>${n}</button>`}).join('')}</div>
 <label style="display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap"><b>Warna bebas</b><input type="color" id="tcol" value="${themeHex()}" style="width:64px;height:40px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer"><code id="tcode">${themeHex()}</code></label>
 <p class="pill" style="flex-wrap:wrap;margin-top:12px">${[['auto','Otomatis (ikut perangkat)'],['light','Terang'],['dark','Gelap']].map(([k,n])=>`<button class="btn ${getMode()===k?'':'ghost'}" data-a="tmode" data-v="${k}">${n}</button>`).join('')}</p></div>
 <div class="card"><h2>WhatsApp otomatis saat daftar</h2><p class="mut">Setelah member didaftarkan, WhatsApp langsung terbuka dengan pesan sambutan. Untuk paket selain harian, kartu member (PDF) ikut dikirim: di ponsel lewat menu bagikan, di komputer PDF diunduh lalu dilampirkan manual.</p>
 <button class="btn ${autoOn()?'':'ghost'}" data-a="autowa">${autoOn()?'Aktif (klik untuk matikan)':'Nonaktif (klik untuk aktifkan)'}</button></div>`;
const _ec=extraClick;
extraClick=function(a,v,el){
 if(a==='theme'){if(can('settings.manage')&&PRESET[v]){S.settings.theme_color=v;log('tema_warna',v);render();toast('Warna diganti: '+PRESET[v][0])}return true}
 if(a==='tmode'){try{localStorage.setItem('pinagym.mode',v)}catch(e){}render();return true}
 if(a==='autowa'){if(can('settings.manage')){S.settings.auto_wa=autoOn()?0:1;log('wa_otomatis_atur',autoOn()?'aktif':'nonaktif');render()}return true}
 if(a==='pay'){posPay();return true}
 if(a==='pmset'){S.pmem=v;S.pnew=null;render();return true}
 if(a==='pmclear'){S.pmem=null;render();return true}
 if(a==='pnewtoggle'){S.pnew=S.pnew?null:{name:'',phone:''};S.pmem=null;render();return true}
 return _ec.apply(this,arguments)};
document.addEventListener('change',e=>{const t=e.target;
 if(t.id==='tcol'&&can('settings.manage')&&hex2(t.value)){S.settings.theme_color=t.value.toLowerCase();log('tema_warna',t.value);render();toast('Warna diganti: '+t.value)}
 else if(t.id==='ppk'){S.ppk=t.value;render()}});
document.addEventListener('input',e=>{const t=e.target;
 if(t.id==='tcol'){const c=document.getElementById('tcode');if(c)c.textContent=t.value}
 else if(t.id==='pq'){S.pq=t.value;const b=document.getElementById('pres');if(b)b.innerHTML=posResults()}
 else if(t.id==='pnn'||t.id==='pnp'||t.id==='pna'){S.pnew=S.pnew||{name:'',phone:''};S.pnew[t.id==='pnn'?'name':t.id==='pnp'?'phone':'addr']=t.value}});

/* ---------- kasir: member harian, paket, dan produk dalam satu struk ---------- */
const isDaily=pk=>{const p=typeof pk==='string'?PKG.find(x=>x.id===pk):pk;return!!p&&p.days<=1};
const posPkg=()=>S.ppk?PKG.find(x=>x.id===S.ppk&&x.on):null;
const posGross=()=>cartTotal()+(posPkg()?posPkg().price:0);
const posTotal=()=>Math.max(0,posGross()-(typeof discCalc==='function'?discCalc().amt:0));
function posResults(){const q=String(S.pq||'').trim().toLowerCase();if(q.length<2)return'<span class="mut">Ketik minimal 2 huruf nama atau kode member.</span>';
 const r=S.members.filter(m=>m.name.toLowerCase().includes(q)||m.code.toLowerCase().includes(q)).slice(0,6);
 return r.length?r.map(m=>`<button class="btn sm ghost" data-a="pmset" data-v="${m.id}">${esc(m.name)} · ${m.code}</button>`).join(' '):'<span class="mut">Tidak ditemukan.</span>'}
P.pos=()=>{const mem=S.pmem?S.members.find(x=>x.id===S.pmem):null,pk=posPkg(),canReg=can('member.create'),canExt=can('member.extend');
 const today=S.members.filter(m=>isDaily(m.pkg)&&m.end>=T0&&!m.freeze).slice(-8).reverse();
 const pkOpts=PKG.filter(p=>p.on&&(mem?canExt:canReg||canExt)).map(p=>`<option value="${p.id}"${S.ppk===p.id?' selected':''}>${esc(p.name)} (${rp(p.price)})</option>`).join('');
 return`${shiftOpen()?'':'<div class="note">Shift belum dibuka. Buka shift di menu Shift Kasir.</div>'}
 <div class="card"><h2>Pelanggan</h2>
  ${mem?`<p class="pill" style="flex-wrap:wrap"><b>${esc(mem.name)}</b> <span class="mut">${mem.code}</span> ${badge(mstat(mem))}<button class="btn sm ghost" data-a="pmclear">Lepas</button></p>`
  :S.pnew?`<div class="form"><div class="pill" style="flex-wrap:wrap"><b>Member baru</b><button class="btn sm ghost" data-a="pnewtoggle">Batal</button></div><label>Nama<input id="pnn" value="${esc(S.pnew.name)}" placeholder="Nama pelanggan"></label><label>No. HP (untuk WhatsApp)<input id="pnp" type="tel" value="${esc(S.pnew.phone)}" placeholder="08xxxxxxxxxx"></label></div>`
  :`<p class="mut" style="margin:0 0 8px">Opsional. Pilih member agar pembelian tercatat, atau daftarkan member harian baru.</p>
   ${today.length?`<p style="margin:0 0 8px"><span class="mut">Member harian hari ini:</span> ${today.map(m=>`<button class="btn sm ghost" data-a="pmset" data-v="${m.id}">${esc(m.name)}</button>`).join(' ')}</p>`:''}
   <div class="tb"><input id="pq" placeholder="Cari member (nama / kode)" value="${esc(S.pq||'')}" autocomplete="off">${canReg?'<button class="btn ghost" data-a="pnewtoggle">'+ico('plus')+' Member baru</button>':''}</div><div id="pres" style="margin-top:6px">${posResults()}</div>`}
  ${pkOpts?`<label style="margin-top:10px">Paket membership ${mem?'(perpanjang)':S.pnew?'(untuk member baru)':''}<select id="ppk"><option value="">Tanpa paket</option>${pkOpts}</select></label>`:''}
  ${pk&&!mem&&!S.pnew?'<p class="mut">Pilih member atau klik Member baru untuk memakai paket ini.</p>':''}
 </div>
 <div class="card">${tbl(['Produk','>Harga','>Stok','Qty'],S.products.map(p=>`<tr><td>${esc(p.name)}</td><td class="r">${rp(p.price)}</td><td class="r">${p.stock}</td><td><input class="qty" type="number" min="0" max="${p.stock}" value="${S.cart[p.id]||0}" data-id="${p.id}" style="width:80px"></td></tr>`))}</div>
 <div class="card pill" style="display:flex;justify-content:space-between;flex-wrap:wrap"><div>${pk?`<small class="mut">Paket ${esc(pk.name)}: ${rp(pk.price)}</small><br>`:''}Total: <b id="posTotal" style="font:700 22px var(--f-head)">${rp(posTotal())}</b></div><div class="pill"><select id="pm"><option value="cash">Tunai</option><option value="noncash">Non-tunai</option></select>${can('pos.checkout')?'<button class="btn" data-a="pay">Bayar</button>':''}</div></div>`};
function posPay(){
 if(!can('pos.checkout'))return;
 if(!shiftOpen()){toast('Buka shift terlebih dahulu.');return}
 const items=S.products.filter(p=>S.cart[p.id]>0).map(p=>({p,q:S.cart[p.id]})),pk=posPkg(),method=document.getElementById('pm').value,nm=S.pnew&&String(S.pnew.name).trim();
 if(!items.length&&!pk){toast('Pilih produk atau paket membership.');return}
 if(pk&&isDaily(pk)&&!String(S.dname||'').trim()){toast('Nama pengunjung harian wajib diisi.');return}
 if(pk&&!isDaily(pk)&&!S.pmem&&!nm){toast('Pilih member, atau isi nama untuk daftar member baru.');return}
 if(pk&&!isDaily(pk)&&nm&&!can('member.create')){toast('Role Anda tidak boleh mendaftarkan member.');return}
 if(pk&&!isDaily(pk)&&S.pmem&&!can('member.extend')){toast('Role Anda tidak boleh memperpanjang membership.');return}
 if(pk&&pk.pt&&!isDaily(pk)&&!S.ptid){toast('Pilih trainer untuk paket ini.');return}
 if(items.some(i=>i.q>i.p.stock)){toast('Stok tidak cukup.');return}
 const dc=discCalc();if(dc.err){toast(dc.err);return}
 const grp=uid(),txs=[];let mem=S.pmem?S.members.find(x=>x.id===S.pmem):null,isNew=false;
 if(pk&&isDaily(pk))mem=null;
 if(pk){
  if(isDaily(pk)){const t=newVisit(S.dname,pk.id,method,S.dphone,S.daddr);t.grp=grp;txs.push(t);log('kunjungan_harian',(S.dname||'umum'))}
  else if(nm){const t=newMember(nm,String(S.pnew.phone||'').trim(),pk.id,method,S.ptid,S.pnew.addr);t.grp=grp;txs.push(t);mem=S.members.find(x=>x.id===t.mid);isNew=true}
  else{const base=mem.end>T0?mem.end:T0;mem.end=iso(addD(new Date(base+'T00:00:00'),pk.days));mem.freeze=false;mem.pkg=pk.id;mem.tid=pk.pt?S.ptid:'';mem.ptu=0;
   const t=addTx('membership',S.user.id,method,pk.price,[{name:'Perpanjangan '+pk.name,qty:1,price:pk.price,cost:0}],{mid:mem.id,pk:pk.id});t.grp=grp;txs.push(t);log('member_perpanjang',mem.code)}}
 if(items.length){items.forEach(i=>i.p.stock-=i.q);
  const t=addTx('pos',S.user.id,method,items.reduce((s,i)=>s+i.p.price*i.q,0),items.map(i=>({name:i.p.name,qty:i.q,price:i.p.price,cost:i.p.cost,pid:i.p.id})),mem?{mid:mem.id}:{});t.grp=grp;txs.push(t);log('pos_checkout',t.inv)}
 if(dc.amt>0){let rem=dc.amt;[...txs].reverse().forEach(t=>{const d=Math.min(rem,t.total);if(d>0){t.items.push({name:'Diskon'+(dc.label?' '+dc.label:''),qty:1,price:-d,cost:0});t.total-=d;t.disc=d;rem-=d}});if(dc.promo)dc.promo.used=(dc.promo.used||0)+1;log('pos_diskon',(dc.label||'manual')+' '+dc.amt)}
 S.cart={};S.dname='';S.dphone='';S.daddr='';S.pmem=null;S.pnew=null;S.ppk='';S.pq='';S.pv='';S.pdm=null;S.ptid='';S.popen=false;
 render();receipt(txs[0]);if(mem)afterReg(mem.id);
 if(isNew&&autoSend(mem))toast('Membuka WhatsApp…')}
{const _rc=receipt;
 receipt=function(t){const g=t.grp?S.tx.filter(x=>x.grp===t.grp):[t],its=g.flatMap(x=>x.items),total=g.reduce((a,x)=>a+x.total,0),mid=(g.find(x=>x.mid)||{}).mid,m=mid&&S.members.find(x=>x.id===mid),vd=g.every(x=>x.voided);
  modal(`<div class="rc"><div style="text-align:center"><b>${esc(S.settings.gym_name)}</b><br>${esc(S.settings.gym_address)}<br>${esc(S.settings.gym_phone)}</div><hr><div class="row"><span>${g.map(x=>x.inv).join('<br>')}</span><span>${t.date} ${t.time}</span></div><div>Kasir: ${byName(t.by)}</div>${m?`<div>Member: ${esc(m.name)} (${m.code})</div>`:''}<hr>${its.map(i=>`<div>${esc(i.name)}</div><div class="row"><span>${i.qty} x ${i.price.toLocaleString('id-ID')}</span><span>${(i.qty*i.price).toLocaleString('id-ID')}</span></div>`).join('')}<hr><div class="row"><b>TOTAL</b><b>${rp(total)}</b></div><div class="row"><span>Metode</span><span>${t.method==='cash'?'Tunai':'Non-tunai'}</span></div>${vd?'<div style="text-align:center;color:var(--err)"><b>*** DIBATALKAN ***</b></div>':''}<hr><div style="text-align:center">Terima kasih</div></div><p style="text-align:right;margin:12px 0 0"><button class="btn ghost" data-a="mclose">Tutup</button></p>`)}}

/* ---------- WhatsApp otomatis saat member baru ---------- */
function autoSend(m){
 if(!autoOn()||!canCW()||!m||!m.phone)return false;
 const tp=tplBy('Selamat Datang');markSent('w|'+m.id,m.id);log('wa_otomatis',m.code);
 if(!isDaily(m.pkg)){
  openWa('https://wa.me/'+waNum(m.phone)+'?text='+encodeURIComponent(welcomeTxt(m)));toast('Ucapan dibuka di WhatsApp. Setelah terkirim, kembali ke sini dan ketuk Kirim PDF Kartu.')}
 else openWa(waLink(m,tp.body));
 return true}

