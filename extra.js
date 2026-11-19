/* extra.js: promo & voucher, stok opname, bonus/potongan gaji, WhatsApp massal, banner versi baru */

/* ---------- banner: versi baru tersedia ---------- */
(()=>{if(!('serviceWorker' in navigator))return;const had=!!navigator.serviceWorker.controller;let shown=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||shown)return;shown=true;
  const b=document.createElement('div');b.id='upd';b.setAttribute('role','status');b.innerHTML='<span>Versi baru PinaGym tersedia.</span><button class="btn sm" id="updgo">Muat ulang</button><button class="btn sm ghost" id="updx" aria-label="Tutup">×</button>';
  document.body.appendChild(b);document.getElementById('updgo').onclick=()=>location.reload();document.getElementById('updx').onclick=()=>b.remove()})})();

/* ---------- stok minimum ---------- */
const minStock=p=>p.min==null?10:+p.min;
const lowStock=()=>S.products.filter(p=>p.stock<=minStock(p));

/* ---------- promo & voucher ---------- */
const fmtPromo=p=>p.type==='pct'?(+p.val)+'%':rp(p.val);
function promoErr(p,gross){if(!p.on)return'Voucher nonaktif.';if(p.exp&&p.exp<T0)return'Voucher sudah kedaluwarsa.';if(p.max>0&&(p.used||0)>=p.max)return'Kuota voucher habis.';if(p.min>0&&gross<p.min)return'Minimal belanja '+rp(p.min)+'.';return''}
function discCalc(){const g=posGross();
 if(S.pv){const p=S.promos.find(x=>x.code===String(S.pv).toUpperCase());if(!p)return{amt:0,err:'Kode voucher tidak ditemukan.'};const e=promoErr(p,g);if(e)return{amt:0,err:e};
  return{amt:Math.max(0,p.type==='pct'?Math.round(g*Math.min(100,p.val)/100):Math.min(g,p.val)),label:p.code,promo:p}}
 if(S.pdm&&can('pos.discount')){const v=+S.pdm.val||0;return{amt:Math.max(0,S.pdm.type==='pct'?Math.round(g*Math.min(100,v)/100):Math.min(g,v)),label:'manual'}}
 return{amt:0}}
function discBox(){const d=discCalc(),g=posGross();
 return`<div class="card" id="pdisc"><h2>Diskon / Voucher</h2>
 ${S.pv?`<p class="pill" style="flex-wrap:wrap">Voucher <b>${esc(String(S.pv).toUpperCase())}</b><button class="btn sm ghost" data-a="pvclear">Lepas</button></p>`:`<div class="tb"><input id="pvc" placeholder="Kode voucher" autocomplete="off" style="text-transform:uppercase"><button class="btn ghost" data-a="pvapply">Terapkan</button></div>`}
 ${can('pos.discount')?(S.pdm?`<p class="pill" style="flex-wrap:wrap">Diskon manual ${S.pdm.type==='pct'?(+S.pdm.val)+'%':rp(S.pdm.val)}<button class="btn sm ghost" data-a="pdmclear">Lepas</button></p>`:`<div class="tb"><select id="pdt"><option value="amt">Rp</option><option value="pct">%</option></select><input id="pdv" type="number" min="0" placeholder="Diskon manual"><button class="btn ghost" data-a="pdmapply">Terapkan</button></div>`):''}
 ${d.err?`<div class="note" style="background:var(--err-bg);color:var(--err)">${esc(d.err)} Lepas voucher agar bisa membayar.</div>`:''}
 <p style="margin:6px 0 0">Subtotal <b id="pdsub">${rp(g)}</b> · Diskon <b id="pdamt">-${rp(d.amt)}</b></p></div>`}
{const _pp=P.pos,mk='<div class="card pill" style="display:flex;justify-content:space-between';
 P.pos=()=>{const h=_pp(),i=h.indexOf(mk);return i<0?h:h.slice(0,i)+discBox()+h.slice(i)}}
document.addEventListener('input',e=>{const t=e.target;
 if(t.classList&&t.classList.contains('qty')){const s=document.getElementById('pdsub');if(s){s.textContent=rp(posGross());document.getElementById('pdamt').textContent='-'+rp(discCalc().amt)}}
 else if(t.classList&&t.classList.contains('opin')){S.opIn[t.dataset.id]=t.value;opCell(t.dataset.id)}});

P.promos=()=>`<div class="note">Voucher dimasukkan kasir di POS. Diskon manual hanya untuk role yang diberi izin <b>Diskon manual di POS</b> (Hak Akses).</div>
 <form class="card form wide" data-f="addpromo"><h2>Buat promo / voucher</h2>${fld('Kode (huruf/angka)','code','','text','required maxlength="20" style="text-transform:uppercase"')}${fld('Nama promo','name','','text','')}<label>Jenis<select name="type"><option value="pct">Persen (%)</option><option value="amt">Rupiah (Rp)</option></select></label>${fld('Nilai','val','','number','min="1" required')}${fld('Minimal belanja (Rp)','min','0','number','min="0"')}${fld('Berlaku sampai (kosongkan = selamanya)','exp','','date')}${fld('Maks. pemakaian (0 = tanpa batas)','max','0','number','min="0"')}<button class="btn">Simpan Promo</button></form>
 <div class="card">${tbl(['Kode','Nama','>Potongan','>Min. belanja','Berlaku s/d','>Terpakai','Status',''],S.promos.map(p=>`<tr><td><b>${esc(p.code)}</b></td><td>${esc(p.name||'-')}</td><td class="r">${fmtPromo(p)}</td><td class="r">${p.min?rp(p.min):'-'}</td><td>${p.exp||'-'}</td><td class="r">${p.used||0}${p.max?' / '+p.max:''}</td><td>${badge(promoErr(p,1e12)==='' ?['Aktif','b-ok']:[p.on?'Tidak berlaku':'Nonaktif','b-gray'])}</td><td><span class="pill" style="flex-wrap:wrap"><button class="btn sm" data-a="editpromo" data-v="${p.id}">Ubah</button><button class="btn sm ghost" data-a="promotoggle" data-v="${p.id}">${p.on?'Nonaktifkan':'Aktifkan'}</button><button class="btn sm red" data-a="delpromo" data-v="${p.id}">Hapus</button></span></td></tr>`),'Belum ada promo.')}</div>`;
const promoFields=p=>fld('Kode','code',p.code,'text','required maxlength="20"')+fld('Nama promo','name',p.name||'','text')+`<label>Jenis<select name="type"><option value="pct"${p.type==='pct'?' selected':''}>Persen (%)</option><option value="amt"${p.type==='amt'?' selected':''}>Rupiah (Rp)</option></select></label>`+fld('Nilai','val',p.val,'number','min="1" required')+fld('Minimal belanja (Rp)','min',p.min||0,'number','min="0"')+fld('Berlaku sampai','exp',p.exp||'','date')+fld('Maks. pemakaian (0 = tanpa batas)','max',p.max||0,'number','min="0"');
function savePromo(d,p){const code=String(d.code||'').trim().toUpperCase();
 if(!/^[A-Z0-9_-]{3,20}$/.test(code)){toast('Kode 3-20 karakter: huruf, angka, strip.');return false}
 if(S.promos.some(x=>x.code===code&&x!==p)){toast('Kode sudah dipakai.');return false}
 const type=d.type==='amt'?'amt':'pct',val=+d.val||0;if(val<=0||(type==='pct'&&val>100)){toast(type==='pct'?'Persen harus 1-100.':'Nilai harus lebih dari 0.');return false}
 Object.assign(p,{code,name:String(d.name||'').trim(),type,val,min:Math.max(0,+d.min||0),exp:d.exp||'',max:Math.max(0,parseInt(d.max,10)||0)});return true}

/* ---------- stok opname ---------- */
S.opIn={};
const opDiff=p=>{const v=S.opIn[p.id];if(v===''||v==null||isNaN(parseInt(v,10)))return null;return parseInt(v,10)-p.stock};
function opCell(id){const p=S.products.find(x=>x.id===id),c=document.getElementById('opd-'+id);if(!p||!c)return;const d=opDiff(p);c.textContent=d==null?'-':(d>0?'+':'')+d;c.style.color=d?d<0?'var(--err)':'var(--ok)':''}
P.opname=()=>{const low=lowStock(),n=S.products.filter(p=>opDiff(p)).length;
 return`${low.length?`<div class="note" style="background:var(--warn-bg);color:var(--warn)"><b>${low.length} produk</b> di bawah stok minimum: ${low.slice(0,8).map(p=>esc(p.name)+' ('+p.stock+')').join(', ')}${low.length>8?'…':''}</div>`:''}
 <div class="note">Hitung stok fisik di rak, isi kolom <b>Stok fisik</b>, lalu <b>Terapkan</b>. Hanya produk yang diisi yang dihitung. Selisih dicatat di riwayat opname.</div>
 <div class="card"><p class="pill" style="flex-wrap:wrap"><button class="btn" data-a="opapply">Terapkan opname${n?' ('+n+' selisih)':''}</button><button class="btn ghost" data-a="opfill">Isi dengan stok sistem</button><button class="btn ghost" data-a="opclear">Kosongkan isian</button></p>
 ${tbl(['Produk','>Stok sistem','>Min.','Stok fisik','>Selisih'],S.products.map(p=>{const d=opDiff(p);return`<tr><td>${esc(p.name)}${p.stock<=minStock(p)?' '+badge(['Menipis','b-warn']):''}</td><td class="r">${p.stock}</td><td class="r">${minStock(p)}</td><td><input class="opin" type="number" min="0" data-id="${p.id}" value="${esc(S.opIn[p.id]==null?'':S.opIn[p.id])}" style="width:100px" aria-label="Stok fisik ${esc(p.name)}"></td><td class="r" id="opd-${p.id}" style="color:${d?d<0?'var(--err)':'var(--ok)':''}">${d==null?'-':(d>0?'+':'')+d}</td></tr>`}),'Belum ada produk.')}</div>
 <div class="card"><h2>Riwayat opname</h2>${tbl(['Waktu','Oleh','>Produk selisih','>Total selisih (unit)',''],S.opname.slice(0,30).map(o=>`<tr><td>${o.date} ${o.time}</td><td>${esc(byName(o.by))}</td><td class="r">${o.items.length}</td><td class="r">${o.items.reduce((a,i)=>a+i.diff,0)}</td><td><button class="btn sm ghost" data-a="opdetail" data-v="${o.id}">Detail</button></td></tr>`),'Belum ada opname.')}</div>`};

/* ---------- bonus / potongan gaji ---------- */
function showAdj(v){const ym=pym(),s=findPayee(v,ym);if(!s)return;
 modal(`<h2 style="margin:0 0 4px">Bonus / Potongan</h2><p class="mut" style="margin:0 0 8px">${esc(s.name)} · ${ymLbl(ym)}</p>
 ${s.adj.length?tbl(['Keterangan','>Jumlah',''],s.adj.map(a=>`<tr><td>${esc(a.label)}</td><td class="r" style="color:${a.amt>0?'var(--ok)':'var(--err)'}">${a.amt>0?'+':'-'}${rp(Math.abs(a.amt))}</td><td><button class="btn sm red" data-a="adjdel" data-v="${a.id}" data-k="${esc(v)}">Hapus</button></td></tr>`)):'<p class="mut">Belum ada bonus atau potongan bulan ini.</p>'}
 <form class="form" data-f="adjadd" data-id="${esc(v)}">${fld('Keterangan (mis. lembur, kasbon, telat)','label','','text','required maxlength="60"')}<label>Jenis<select name="kind"><option value="b">Bonus (tambah)</option><option value="p">Potongan (kurang)</option></select></label>${fld('Jumlah (Rp)','amt','','number','min="1" required')}<div class="pill" style="justify-content:flex-end"><button type="button" class="btn ghost" data-a="mclose">Tutup</button><button class="btn">Tambah</button></div></form>`);labelTables()}

/* ---------- WhatsApp massal tanpa gateway ---------- */
const waTargets=()=>{const g=S.wa.g,soon=iso(addD(TODAY,+S.settings.expiring_days));return S.members.filter(m=>(g==='new'?m.joined>=iso(addD(TODAY,-7)):g==='soon'?(!m.freeze&&m.end>=T0&&m.end<=soon):g==='expired'?m.end<T0:true)&&waNum(m.phone))};
const waTpl=()=>S.tpl.find(x=>x.id==S.wa.t)||S.tpl[0]||{body:''};
const bcText=()=>waTpl().body.replace(/\{nama\}/g,'Kak').replace(/\{gym\}/g,S.settings.gym_name).replace(/\{(kode|tanggal|sisa|paket)\}/g,'').replace(/\s+/g,' ').trim();
function wbBox(){const t=waTargets(),wb=S.wb,cur=wb&&S.members.find(m=>m.id===wb.ids[wb.i]);
 return`<div class="card"><h2>Kirim ke banyak nomor</h2><p class="mut">Tanpa gateway resmi, WhatsApp selalu butuh satu ketukan "kirim" per chat. Dua cara paling cepat, sesuai pilihan template dan kelompok di bawah (<b>${t.length}</b> nomor):</p>
 <p><b>1. Daftar Siaran (satu kali kirim ke semua)</b><br><span class="mut">Unduh kontak, buka di HP (kontak masuk otomatis), lalu di WhatsApp Business buat Daftar Siaran, pilih kontak itu, tempel pesan, kirim sekali. Maks. 256 kontak per daftar. Penerima harus sudah menyimpan nomor gym Anda. Pesan sama untuk semua ({nama} jadi "Kak").</span></p>
 <p class="pill" style="flex-wrap:wrap"><button class="btn" data-a="wbvcf"${t.length?'':' disabled'}>Unduh kontak (.vcf)</button><button class="btn ghost" data-a="wbcopy">Salin pesan siaran</button></p>
 <p style="margin-top:14px"><b>2. Kirim berurutan (pesan pribadi per member)</b><br><span class="mut">Satu ketukan di sini membuka chat berikutnya dengan pesan terisi, Anda tekan kirim di WhatsApp lalu kembali. Nama, kode, dan tanggal terisi otomatis.</span></p>
 ${wb?`<div class="note" style="background:var(--ok-bg);color:var(--ok)">Terbuka ${wb.i} dari ${wb.ids.length}. ${cur?'Berikutnya: <b>'+esc(cur.name)+'</b>':''}</div><p class="pill" style="flex-wrap:wrap">${cur?'<button class="btn" id="wbnext" data-a="wbnext">Buka berikutnya</button>':''}<button class="btn ghost" data-a="wbstop">Selesai</button></p>`
 :`<p><button class="btn" data-a="wbstart"${t.length?'':' disabled'}>${ico('chat')} Mulai kirim berurutan (${t.length})</button></p>`}</div>`}
{const _pw=P.whatsapp;P.whatsapp=()=>{const h=_pw();return canWa()?wbBox()+h:h}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.wb&&S.page==='whatsapp'){const b=document.getElementById('wbnext');if(b)b.scrollIntoView({block:'center'})}});
function copyText(t){return(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).catch(()=>{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()})}
const vEsc=s=>String(s).replace(/([,;\\])/g,'\\$1');
function vcf(list){return list.map(m=>`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${vEsc(S.settings.gym_name+' - '+m.name)}\r\nN:${vEsc(m.name)};${vEsc(S.settings.gym_name)};;;\r\nTEL;TYPE=CELL:+${waNum(m.phone)}\r\nEND:VCARD\r\n`).join('')}

/* ---------- peringatan stok di dashboard non-admin ---------- */
{const _pd=P.dashboard;P.dashboard=()=>{let b='';if(S.user.role!=='admin'&&can('product.view')){const l=lowStock();if(l.length)b=`<div class="note" style="background:var(--warn-bg);color:var(--warn)"><b>Stok menipis:</b> ${l.slice(0,6).map(p=>esc(p.name)+' ('+p.stock+')').join(', ')}${l.length>6?'…':''}</div>`}return b+_pd()}}

/* ---------- aksi ---------- */
{const _ecE=extraClick;extraClick=function(a,v,el){const D=el.dataset;if(a!=='cfyes')CUR={a,v,d:{...D}};
 if(a==='pvapply'){const x=document.getElementById('pvc'),c=x?x.value.trim().toUpperCase():'';if(!c){toast('Ketik kode voucher.');return true}const p=S.promos.find(y=>y.code===c);if(!p){toast('Kode voucher tidak ditemukan.');return true}const e=promoErr(p,posGross());if(e){toast(e);return true}S.pv=c;S.pdm=null;render();toast('Voucher dipakai.');return true}
 if(a==='pvclear'){S.pv='';render();return true}
 if(a==='pdmapply'){if(!can('pos.discount'))return true;const t=document.getElementById('pdt').value,n=+document.getElementById('pdv').value||0;if(n<=0||(t==='pct'&&n>100)){toast('Nilai diskon tidak valid.');return true}S.pdm={type:t,val:n};S.pv='';render();return true}
 if(a==='pdmclear'){S.pdm=null;render();return true}
 if(a==='editpromo'){if(!can('promo.manage'))return true;const p=S.promos.find(x=>x.id===v);if(p)fm('Ubah promo','editpromo',v,promoFields(p));return true}
 if(a==='promotoggle'){if(!can('promo.manage'))return true;const p=S.promos.find(x=>x.id===v);if(p){p.on=p.on?0:1;log('promo_status',p.code);render()}return true}
 if(a==='delpromo'){if(!can('promo.manage'))return true;const p=S.promos.find(x=>x.id===v);if(!p)return true;if(!ask('dpr'+v,'Hapus promo <b>'+esc(p.code)+'</b>?'))return true;S.promos=S.promos.filter(x=>x!==p);log('promo_hapus',p.code);render();toast('Promo dihapus.');return true}
 if(a==='opfill'){S.products.forEach(p=>S.opIn[p.id]=String(p.stock));render();return true}
 if(a==='opclear'){S.opIn={};render();return true}
 if(a==='opapply'){if(!can('stock.opname'))return true;const ch=S.products.filter(p=>opDiff(p)!=null);if(!ch.length){toast('Isi stok fisik dahulu.');return true}
  const dif=ch.filter(p=>opDiff(p)!==0);if(!ask('opa','Terapkan opname? <b>'+ch.length+'</b> produk dihitung, <b>'+dif.length+'</b> berselisih. Stok sistem diganti stok fisik.','Ya, terapkan'))return true;
  const items=dif.map(p=>({pid:p.id,name:p.name,sys:p.stock,real:parseInt(S.opIn[p.id],10),diff:opDiff(p)}));
  dif.forEach(p=>{p.stock=parseInt(S.opIn[p.id],10);p.se=1});
  S.opname.unshift({id:uid(),date:T0,time:hhmm(),by:S.user.id,counted:ch.length,items});S.opname=S.opname.slice(0,100);S.opIn={};log('stok_opname',ch.length+' dihitung, '+dif.length+' selisih');render();toast('Opname diterapkan: '+dif.length+' produk disesuaikan.');return true}
 if(a==='opdetail'){const o=S.opname.find(x=>x.id===v);if(o){modal(`<h2 style="margin:0 0 8px">Opname ${o.date} ${o.time}</h2>${tbl(['Produk','>Sistem','>Fisik','>Selisih'],o.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="r">${i.sys}</td><td class="r">${i.real}</td><td class="r" style="color:${i.diff<0?'var(--err)':'var(--ok)'}">${i.diff>0?'+':''}${i.diff}</td></tr>`),'Tidak ada selisih.')}<p style="text-align:right;margin:12px 0 0"><button class="btn ghost" data-a="mclose">Tutup</button></p>`);labelTables()}return true}
 if(a==='payadj'){if(!can('payroll.manage'))return true;showAdj(v);return true}
 if(a==='adjdel'){if(!can('payroll.manage'))return true;S.padj=S.padj.filter(x=>x.id!==v);log('gaji_adj_hapus');render();showAdj(D.k);return true}
 if(a==='wbvcf'){if(!canWa())return true;const t=waTargets();if(!t.length)return true;Card.download(new Blob([vcf(t)],{type:'text/vcard'}),'Kontak-'+asc(S.settings.gym_name).replace(/\W+/g,'-')+'-'+T0+'.vcf');log('wa_vcf',t.length+' kontak');toast(t.length+' kontak diunduh. Buka file di HP lalu buat Daftar Siaran.');return true}
 if(a==='wbcopy'){if(!canWa())return true;const tx=bcText();copyText(tx).then(()=>toast('Pesan disalin. Tempel di Daftar Siaran.'));return true}
 if(a==='wbstart'){if(!canWa())return true;const t=waTargets();if(!t.length)return true;S.wb={ids:t.map(m=>m.id),i:0};
  const m=t[0];openWa(waLink(m,waTpl().body));S.wb.i=1;log('wa_massal',t.length+' nomor');render();return true}
 if(a==='wbnext'){if(!canWa()||!S.wb)return true;const m=S.members.find(x=>x.id===S.wb.ids[S.wb.i]);if(m)openWa(waLink(m,waTpl().body));S.wb.i++;if(S.wb.i>=S.wb.ids.length){S.wb=null;toast('Semua chat sudah dibuka.')}render();return true}
 if(a==='wbstop'){S.wb=null;render();return true}
 return _ecE.apply(this,arguments)}}
{const _esE=extraSubmit;extraSubmit=function(k,d,f){const id=f.dataset.id;
 if(k==='addpromo'){if(!can('promo.manage'))return true;const p={id:uid(),on:1,used:0};if(savePromo(d,p)){S.promos.push(p);log('promo_tambah',p.code);render();toast('Promo disimpan.')}return true}
 if(k==='editpromo'){if(!can('promo.manage'))return true;const p=S.promos.find(x=>x.id===id);if(p&&savePromo(d,p)){log('promo_ubah',p.code);modal('');render();toast('Promo disimpan.')}return true}
 if(k==='adjadd'){if(!can('payroll.manage'))return true;const n=Math.round(+d.amt||0),l=String(d.label||'').trim();if(!l||n<=0){toast('Isi keterangan dan jumlah.');return true}
  S.padj.push({id:uid(),ym:pym(),key:id,label:l,amt:d.kind==='p'?-n:n});log('gaji_adj',id+' '+(d.kind==='p'?'-':'+')+n);render();showAdj(id);toast(d.kind==='p'?'Potongan ditambahkan.':'Bonus ditambahkan.');return true}
 return _esE.apply(this,arguments)}}

/* ---------- pemulihan akun & perbaikan versi ---------- */
async function clearApp(){try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister()}catch(e){}try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}location.reload()}
P.users=(()=>{const _pu=P.users;return()=>_pu()+`<form class="card form" data-f="recpin"><h2>PIN pemulihan admin</h2>${S.settings.rec_ph?'':'<p style="color:#b91c1c;font-weight:600">⚠ PIN belum diatur — fitur "Lupa password" dinonaktifkan demi keamanan. Atur PIN sekarang.</p>'}<p class="mut">${S.settings.rec_ph?'PIN sudah diatur.':''} PIN wajib untuk "Lupa password?" di layar login. Simpan PIN di tempat aman; jangan dibagikan ke kasir/trainer. Salah 5 kali = terkunci 15 menit.</p>${fld('PIN baru (min. 6 karakter)','pin','','password','minlength="6" autocomplete="new-password"')}<div class="pill"><button class="btn">Simpan PIN</button>${S.settings.rec_ph?'<button type="button" class="btn ghost" data-a="recclear">Hapus PIN</button>':''}</div></form>`})();
{const _ecR=extraClick;extraClick=function(a,v,el){
 if(a==='fixapp'){clearApp();return true}
 if(a==='forgot'){if(!S.settings.rec_ph){fm('Lupa password','noop','',`<p>Fitur ini dinonaktifkan karena <b>PIN pemulihan belum diatur</b>.</p><p class="mut">Admin yang masih bisa masuk: buka Manajemen User → atur PIN pemulihan. Jika sudah terlanjur lupa dan tidak ada PIN, pulihkan lewat file backup atau hubungi pengembang.</p>`);return true}
  fm('Lupa password','forgot','',`<p class="mut">Hanya untuk akun <b>admin</b>. Akun kasir/trainer direset oleh admin di Manajemen User.</p>${fld('Username admin','username','admin','text','required autocomplete="off"')}${fld('PIN pemulihan','pin','','password','required autocomplete="off"')}${fld('Password baru (min. 8)','password','','password','minlength="8" required autocomplete="new-password"')}`);return true}
 if(a==='recclear'){if(!can('user.manage'))return true;if(!ask('rcl','Hapus PIN pemulihan?','Ya, hapus'))return true;delete S.settings.rec_ph;delete S.settings.rec_salt;log('pin_pemulihan_hapus');render();return true}
 return _ecR.apply(this,arguments)}}
{const _esR=extraSubmit;extraSubmit=function(k,d,f){
 if(k==='noop'){modal('');return true}
 if(k==='forgot'){const un=String(d.username).trim().toLowerCase(),u=S.users.find(x=>x.username===un&&x.role==='admin');
  (async()=>{let st={n:0,u:0};try{st=JSON.parse(localStorage.getItem('pinagym.frl')||'')||st}catch(e){}
   const sv=()=>{try{localStorage.setItem('pinagym.frl',JSON.stringify(st))}catch(e){}};
   if(Date.now()<st.u){toast('Terkunci. Coba lagi dalam '+Math.ceil((st.u-Date.now())/60000)+' menit.');return}
   const bad=m=>{st.n=(st.n||0)+1;if(st.n>=5){st.u=Date.now()+15*60000;st.n=0;m='Terlalu banyak percobaan. Terkunci 15 menit.'}sv();log('lupa_pw_gagal',un.slice(0,40));toast(m)};
   if(!S.settings.rec_ph){toast('PIN pemulihan belum diatur.');return}
   const okPin=(await hashPw(String(d.pin),S.settings.rec_salt))===S.settings.rec_ph;
   if(!u||!okPin){bad('Username atau PIN salah.');return}
   if(String(d.password).length<8){toast('Password minimal 8 karakter.');return}
   st={n:0,u:0};sv();
   await setPw(u,String(d.password));u.on=1;S.lock=0;S.f=0;S.msg='';log('reset_password_admin',u.username);persist();modal('');render();toast('Password admin diperbarui. Silakan masuk.')})();return true}
 if(k==='recpin'){if(!can('user.manage'))return true;const pin=String(d.pin||'');if(pin.length<6){toast('PIN minimal 6 karakter.');return true}
  (async()=>{S.settings.rec_salt=rndSalt();S.settings.rec_ph=await hashPw(pin,S.settings.rec_salt);log('pin_pemulihan_atur');render();toast('PIN pemulihan disimpan.')})();return true}
 return _esR.apply(this,arguments)}}
