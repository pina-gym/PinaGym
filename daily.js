/* daily.js: paket harian = catatan kunjungan saja (tanpa member, kartu, atau nomor WhatsApp); bisa di-upgrade jadi member bulanan/tahunan */
const visitTx=v=>S.tx.find(x=>x.vid===v.id);
function tgDaily(){const f=document.querySelector('form[data-f=register]');if(!f)return;const sel=f.querySelector('[name=pkg]');if(!sel)return;const dl=isDaily(sel.value);
 const h=f.querySelector('.dlyhint');if(h)h.hidden=!dl;const ad=f.querySelector('[name=addr]');if(ad)ad.required=dl;
 const b=f.querySelector('#regbtn');if(b)b.textContent=dl?'Catat Kunjungan & Bayar':'Daftarkan & Bayar';const tr=f.querySelector('.trsel');if(dl&&tr)tr.hidden=true}
{const _r=P.register;P.register=()=>_r().replace('<label>No. HP<input','<label class="mf">No. HP<input').replace('<label>Alamat<textarea','<label class="mf">Alamat<textarea').replace('<button class="btn">Daftarkan & Bayar</button>','<p class="note dlyhint" hidden>Paket harian hanya dicatat sebagai kunjungan: tanpa kartu dan tidak menjadi member. Nama dan alamat wajib diisi, No. HP/WhatsApp opsional. Ingin jadi member? Pilih paket bulanan/tahunan.</p><button class="btn" id="regbtn">Daftarkan & Bayar</button>')}
{const _rv=renderView;renderView=function(){_rv.apply(this,arguments);tgDaily()}}
document.addEventListener('change',e=>{if(e.target.name==='pkg'&&e.target.form&&e.target.form.dataset.f==='register')tgDaily()});

const vIn=(v,r)=>r==='all'||(r==='today'&&v.date===T0)||(r==='week'&&v.date>=iso(addD(TODAY,-6)))||(r==='month'&&v.date.slice(0,7)===T0.slice(0,7));
function visitsCard(){const r=S.vr||'today',L=S.visits.filter(v=>vIn(v,r)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1).slice(0,200),ok=L.filter(v=>{const t=visitTx(v);return!(t&&t.voided)}),sum=ok.reduce((a,v)=>a+(+v.price||0),0);
 const rg=[['today','Hari ini'],['week','7 hari'],['month','Bulan ini'],['all','Semua']];
 return`<div class="note">Member harian tidak menjadi member dan tidak punya kartu. Setiap paket harian yang dibayar hanya tercatat sebagai kunjungan di sini. Nama dan alamat wajib dicatat (No. WhatsApp opsional). Pengunjung yang ingin berlangganan bisa di-<b>upgrade</b> ke paket bulanan atau tahunan.</div>
 <div class="seg" style="margin-bottom:12px">${rg.map(x=>`<button type="button" class="${r===x[0]?'on':''}" data-a="vrange" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
 <div class="card"><h2>Kunjungan harian <small class="mut">${ok.length} kunjungan · ${rp(sum)}</small></h2>${tbl(['Tanggal','Pengunjung','Paket','>Harga','Status',''],L.map(v=>{const t=visitTx(v),vd=t&&t.voided,m=v.up?S.members.find(x=>x.id===v.up):null;
  return`<tr><td>${v.date.slice(8)}/${v.date.slice(5,7)} ${esc(v.time||'')}</td><td>${v.name?esc(v.name):'<span class="mut">Pengunjung</span>'}${can('member.contact')&&(v.addr||v.phone)?`<br><small class="mut">${esc(v.addr||'')}${v.phone?' · '+esc(v.phone):''}</small>`:''}</td><td>${esc(pkgName(v.pkg))}</td><td class="r">${rp(v.price||0)}</td><td>${vd?badge(['Batal','b-gray']):m?badge(['Jadi member '+m.code,'b-ok']):badge(['Kunjungan','b-gray'])}</td><td>${!vd&&!v.up&&can('member.create')?`<button class="btn sm" data-a="vup" data-v="${v.id}">Upgrade jadi member</button>`:''}</td></tr>`}),'Belum ada kunjungan harian pada rentang ini.')}</div>`}
{const _m=P.members;P.members=()=>{const h=_m();if((S.mtype||'monthly')!=='daily')return h;const i=h.indexOf('</div>')+6,tabs=h.slice(0,i),rest=h.slice(i),legacy=S.members.filter(m=>isDaily(m.pkg)).length;
 return tabs+visitsCard()+(legacy?`<h3 style="margin:16px 0 6px">Member harian lama (${legacy})</h3><p class="mut" style="margin:0 0 8px">Data sebelum aturan baru. Untuk upgrade, gunakan menu Perpanjangan Membership dan pilih paket bulanan/tahunan.</p>`+rest:'')}}

function vupForm(v){const pk=PKG.filter(p=>p.on&&!isDaily(p));
 fm('Upgrade jadi member','vup',v.id,fld('Nama','name',v.name||'','text','required')+fld('No. HP (WhatsApp)','phone',v.phone||'','tel')+`<label>Alamat<textarea name="addr" rows="2" placeholder="Alamat member">${esc(v.addr||'')}</textarea></label><label>Paket<select name="pkg">${pk.map(p=>`<option value="${p.id}">${esc(p.name)} - ${rp(p.price)}</option>`).join('')}</select></label>`+trainerSel(pk[0]&&pk[0].id,'')+`<label>Pembayaran<select name="method"><option value="cash">Tunai</option><option value="noncash">Non-tunai</option></select></label><p class="mut">Harga paket dibayar penuh. Setelah ini member mendapat kode, kartu, dan ucapan selamat datang seperti member lainnya.</p>`,'Upgrade & Bayar')}
{const _ec=extraClick;extraClick=function(a,v,el){
 if(a==='vrange'){S.vr=v;renderView();return true}
 if(a==='vup'){const x=S.visits.find(y=>y.id===v);if(!x||!can('member.create'))return true;if(!PKG.some(p=>p.on&&!isDaily(p))){toast('Belum ada paket bulanan/tahunan aktif. Buat di menu Paket Membership.');return true}vupForm(x);return true}
 return _ec.apply(this,arguments)}}
{const _es=extraSubmit;extraSubmit=function(k,d,f){
 if(k==='register'&&isDaily(d.pkg)){if(!can('member.create'))return true;if(!String(d.name||'').trim()||!String(d.addr||'').trim()){toast('Nama dan alamat wajib diisi.');return true}const t=newVisit(d.name,d.pkg,d.method,d.phone,d.addr);log('kunjungan_harian',String(d.name||'umum').trim()||'umum');render();receipt(t);return true}
 if(k==='vup'){if(!can('member.create'))return true;const v=S.visits.find(y=>y.id===f.dataset.id),nm=String(d.name||'').trim(),pk=PKG.find(p=>p.id===d.pkg);
  if(!v||v.up)return true;if(!nm){toast('Isi nama member.');return true}if(!pk||isDaily(pk)){toast('Pilih paket bulanan/tahunan.');return true}if(pk.pt&&!d.tid){toast('Pilih trainer untuk paket ini.');return true}
  const t=newMember(nm,String(d.phone||'').trim(),pk.id,d.method,d.tid,d.addr),m=S.members.find(x=>x.id===t.mid);v.up=m.id;if(!v.name)v.name=nm;log('kunjungan_upgrade',m.code);modal('');render();receipt(t);afterReg(m.id);if(autoSend(m))toast('Membuka WhatsApp…');return true}
 return _es.apply(this,arguments)}}
