/* pos.js: POS sekali ketuk (gaya PinaPOS): produk & paket membership sebagai tile, keranjang ringkas, tombol bayar mengambang */
const pOpts=()=>({canReg:can('member.create'),canExt:can('member.extend')});
function posItems(){const o=pOpts(),q=String(S.pf||'').trim().toLowerCase(),tab=S.ptab||'all',L=[];
 if(tab!=='pkg')S.products.forEach(p=>{if(!q||p.name.toLowerCase().includes(q)||(p.bc&&String(p.bc).toLowerCase().includes(q)))L.push({k:'p',id:p.id,name:p.name,price:p.price,sub:p.stock<=0?'Habis':'Stok '+p.stock,off:p.stock<=0,n:S.cart[p.id]||0})});
 if(tab!=='prod'&&(o.canReg||o.canExt))PKG.filter(p=>p.on).forEach(p=>{if(!q||p.name.toLowerCase().includes(q))L.push({k:'k',id:p.id,name:p.name,price:p.price,sub:isDaily(p)?'Harian · tanpa kartu':p.days+' hari'+(p.pt?' + Trainer':''),n:S.ppk===p.id?1:0})});
 return L}
const posTiles=()=>{const L=posItems();return L.length?L.map(i=>`<button type="button" class="tile${i.k==='k'?' pk':''}${i.n?' on':''}" data-a="${i.k==='k'?'ppick':'padd'}" data-v="${i.id}"${i.off?' disabled':''}>${i.n?`<span class="qb">${i.k==='k'?'✓':i.n}</span>`:''}${i.k==='k'?'<small class="tg">Paket</small>':''}<b>${esc(i.name)}</b><span class="pr">${rp(i.price)}</span><small>${i.sub}</small></button>`).join(''):'<p class="mut">Tidak ada yang cocok.</p>'};
function posCart(){const pk=posPkg(),its=S.products.filter(p=>S.cart[p.id]>0);
 if(!its.length&&!pk)return'<p class="mut" style="margin:0">Ketuk produk atau paket untuk menambah.</p>';
 return(pk?`<div class="cl"><span><b>${esc(pk.name)}</b><br><small class="mut">Paket · ${rp(pk.price)}</small></span><button class="btn sm ghost" data-a="ppick" data-v="${pk.id}" aria-label="Hapus paket">×</button></div>`:'')+
 its.map(p=>`<div class="cl"><span><b>${esc(p.name)}</b><br><small class="mut">${rp(p.price)} × ${S.cart[p.id]}</small></span><span class="st"><button class="btn sm ghost" data-a="pdec" data-v="${p.id}" aria-label="Kurangi">−</button><b>${S.cart[p.id]}</b><button class="btn sm ghost" data-a="padd" data-v="${p.id}" aria-label="Tambah">+</button></span></div>`).join('')}
const dailyNames=(q,all)=>{q=String(q||'').trim().toLowerCase();const c=new Map();
 [...S.visits].sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1).forEach(v=>{const n=String(v.name||'').trim();if(n){const k=n.toLowerCase(),o=c.get(k);if(o)o.n++;else c.set(k,{name:n,n:1,phone:v.phone||'',addr:v.addr||''})}});
 S.members.filter(m=>isDaily(m.pkg)).forEach(m=>{const k=m.name.toLowerCase();if(!c.has(k))c.set(k,{name:m.name,n:0,phone:m.phone||'',addr:m.addr||''})});
 return[...c.values()].filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,all?99999:8)};
const dailyChips=q=>{const l=dailyNames(q);return l.length?l.map(x=>`<button type="button" class="btn sm ghost" data-a="pdname" data-v="${esc(x.name)}">${esc(x.name)}${x.n>1?' <small class="mut">'+x.n+'x</small>':''}</button>`).join(' '):'<span class="mut">Belum ada pengunjung tersimpan yang cocok.</span>'};
function posCust(){if(posPkg()&&isDaily(posPkg()))return`<div class="card pcu"><div class="form"><label>Nama pengunjung (wajib)<input id="pdn" value="${esc(S.dname||'')}" placeholder="Ketik untuk mencari yang sudah tercatat" autocomplete="off"></label><div id="pdchipsw"><small class="mut">Pengunjung tercatat (ketuk untuk mengisi otomatis):</small><div id="pdchips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${dailyChips(S.dname)}</div></div><label>Alamat (opsional)<textarea id="pda" rows="2" placeholder="Alamat pengunjung">${esc(S.daddr||'')}</textarea></label><label>No. WhatsApp (opsional)<input id="pdp" type="tel" value="${esc(S.dphone||'')}" placeholder="08xxxxxxxxxx"></label></div><p class="mut" style="margin:8px 0 0">Paket harian hanya dicatat sebagai kunjungan: tanpa kartu dan tidak menjadi member. Untuk berlangganan, gunakan Upgrade di Data Member → Harian.</p></div>`;
 const mem=S.pmem?S.members.find(x=>x.id===S.pmem):null,pk=posPkg(),o=pOpts();
 const need=pk&&!mem&&!S.pnew,open=S.popen||need;
 const trs=pk&&pk.pt?`<label style="margin-top:10px">Trainer<select id="ptid"><option value="">${S.trainers.some(t=>t.on)?'Pilih trainer':'Belum ada trainer (daftarkan di menu Trainer)'}</option>${S.trainers.filter(t=>t.on||t.id===S.ptid).map(t=>`<option value="${t.id}"${t.id===S.ptid?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`:'';
 if(mem)return`<div class="card pcu"><p class="pill" style="flex-wrap:wrap;margin:0"><b>${esc(mem.name)}</b> <span class="mut">${mem.code}</span> ${badge(mstat(mem))}<button class="btn sm ghost" data-a="pmclear">Lepas</button></p>${trs}</div>`;
 if(S.pnew)return`<div class="card pcu"><div class="form"><div class="pill" style="flex-wrap:wrap"><b>Member baru</b><button class="btn sm ghost" data-a="pnewtoggle">Batal</button></div><label>Nama<input id="pnn" value="${esc(S.pnew.name)}" placeholder="Nama pelanggan"></label><label>No. HP (WhatsApp)<input id="pnp" type="tel" value="${esc(S.pnew.phone)}" placeholder="08xxxxxxxxxx"></label><label>Alamat<textarea id="pna" rows="2" placeholder="Alamat member">${esc(S.pnew.addr||'')}</textarea></label></div>${trs}</div>`;
 if(!open)return`<div class="card pcu"><p class="pill" style="margin:0;justify-content:space-between"><span><span class="mut">Pelanggan:</span> <b>Umum</b></span><button class="btn sm ghost" data-a="pcust">Pilih member</button></p></div>`;
 const today=S.members.filter(m=>isDaily(m.pkg)&&m.end>=T0&&!m.freeze).slice(-6).reverse();
 return`<div class="card pcu">${need?'<div class="note">Paket membership butuh member. Cari member atau daftarkan baru.</div>':''}${today.length?`<p style="margin:0 0 8px"><span class="mut">Harian hari ini:</span> ${today.map(m=>`<button class="btn sm ghost" data-a="pmset" data-v="${m.id}">${esc(m.name)}</button>`).join(' ')}</p>`:''}<div class="tb" style="margin:0"><input id="pq" placeholder="Cari member (nama / kode)" value="${esc(S.pq||'')}" autocomplete="off">${o.canReg?'<button class="btn ghost" data-a="pnewtoggle">'+ico('plus')+' Member baru</button>':''}${need?'':'<button class="btn sm ghost" data-a="pcust">Tutup</button>'}</div><div id="pres" style="margin-top:6px">${posResults()}</div></div>`}
const cartCount=()=>Object.values(S.cart).reduce((a,b)=>a+b,0)+(posPkg()?1:0);
P.pos=()=>{const n=cartCount();
 const tab=S.ptab||'all',tabs=[['all','Semua'],['prod','Produk'],['pkg','Paket']];
 return`${shiftOpen()?'':'<div class="note">Shift belum dibuka. Buka shift di menu Shift Kasir.</div>'}
 ${S.pmem&&S.members.find(x=>x.id===S.pmem)?`<p class="note pill" style="margin:0 0 10px;flex-wrap:wrap"><span>Pelanggan: <b>${esc(S.members.find(x=>x.id===S.pmem).name)}</b> <span class="mut">${S.members.find(x=>x.id===S.pmem).code}</span></span><button class="btn sm ghost" data-a="pmclear">Lepas</button></p>`:''}
 <div class="ptb"><input id="pfq" type="search" placeholder="Cari / scan barcode produk" value="${esc(S.pf||'')}" autocomplete="off"><span class="seg">${tabs.map(t=>`<button type="button" class="${tab===t[0]?'on':''}" data-a="ptab" data-v="${t[0]}">${t[1]}</button>`).join('')}</span></div>
 <div id="ptiles" class="tiles">${posTiles()}</div>
 <div class="padgap"></div>
 <div class="paybar"><div><small class="mut">${n?n+' item':'Keranjang kosong'}</small><br><b id="posTotal">${rp(posTotal())}</b></div><button class="btn" data-a="cartopen"${n?'':' disabled'}>${ico('cart')} Lihat pesanan</button></div>`};
/* popup konfirmasi pesanan: keranjang, data member/trainer, diskon, metode, bayar */
function cartHtml(){const pk=posPkg(),n=cartCount(),mem=S.pmem?S.members.find(x=>x.id===S.pmem):null;
 if(pk&&pk.pt&&!S.ptid&&mem&&mem.tid)S.ptid=mem.tid;
 return`<div class="cartm"><h2 style="margin:0 0 10px">Konfirmasi pesanan</h2>
 <div class="card" style="margin-bottom:10px"><div id="pcart">${posCart()}</div></div>
 ${pk?`<h3 style="margin:10px 0 6px;font-size:15px">${isDaily(pk)?'Pengunjung harian':'Data member'}</h3>`:'<h3 style="margin:10px 0 6px;font-size:15px">Pelanggan</h3>'}${posCust()}${discBox()}
 <div class="cfoot"><div><small class="mut">Total</small><br><b id="posTotal2">${rp(posTotal())}</b></div><select id="pm" aria-label="Metode bayar"><option value="cash"${S.pmeth==='noncash'?'':' selected'}>Tunai</option><option value="noncash"${S.pmeth==='noncash'?' selected':''}>Non-tunai</option></select><button class="btn ghost" data-a="cartclose">Kembali</button>${can('pos.checkout')?`<button class="btn" data-a="pay"${n?'':' disabled'}>Bayar</button>`:''}</div></div>`}
function cartRe(){const m=document.querySelector('#modal .modal'),y=m?m.scrollTop:0;modal(cartHtml());const m2=document.querySelector('#modal .modal');if(m2)m2.scrollTop=y}
function cartOpen(){S.cartOpen=true;cartRe()}
function cartShut(){S.cartOpen=false;modal('')}
const posRe=()=>{const y=scrollY;render();scrollTo(0,y);if(S.cartOpen)cartRe()};
{const _ec=extraClick;extraClick=function(a,v,el){
 if(a==='padd'){const p=S.products.find(x=>x.id===v);if(p&&(S.cart[v]||0)<p.stock){S.cart[v]=(S.cart[v]||0)+1;posRe()}else if(p)toast('Stok tidak cukup.');return true}
 if(a==='pdec'){S.cart[v]=Math.max(0,(S.cart[v]||0)-1);if(!S.cart[v])delete S.cart[v];posRe();if(S.cartOpen&&!cartCount())cartShut();return true}
 if(a==='ppick'){const was=S.ppk===v;S.ppk=was?'':v;S.ptid='';if(S.ppk&&!S.pmem&&!S.pnew)S.popen=true;posRe();if(!S.ppk&&S.cartOpen&&!cartCount())cartShut();return true}
 if(a==='ptab'){S.ptab=v;posRe();return true}
 if(a==='pcust'){S.popen=!S.popen;if(S.cartOpen)cartRe();return true}
 if(a==='pdname'){const x=dailyNames('',1).find(y=>y.name===v);S.dname=v;if(x){S.dphone=x.phone||'';S.daddr=x.addr||''}if(S.cartOpen)cartRe();return true}
 if(a==='cartopen'){if(cartCount())cartOpen();return true}
 if(a==='cartclose'){cartShut();return true}
 if(a==='mclose'&&S.cartOpen){S.cartOpen=false}
 if(a==='pay'){const r=_ec.apply(this,arguments);if(!document.querySelector('#modal .cartm'))S.cartOpen=false;return r}
 const r=_ec.apply(this,arguments);
 if(S.cartOpen&&document.querySelector('#modal .cartm')){if(a==='pmset'||a==='pmclear'||a==='pnewtoggle'){S.ptid=a==='pmset'&&S.ppk&&(S.members.find(x=>x.id===v)||{}).tid||'';S.popen=false}cartRe()}
 return r}}
document.addEventListener('input',e=>{const t=e.target;if(t.id==='pda')S.daddr=t.value;if(t.id==='pdp')S.dphone=t.value;if(t.id==='pdn'){S.dname=t.value;const b=document.getElementById('pdchips');if(b)b.innerHTML=dailyChips(t.value)}if(t.id==='pfq'){S.pf=t.value;const b=document.getElementById('ptiles');if(b)b.innerHTML=posTiles()}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='ptid')S.ptid=t.value;else if(t.id==='pm')S.pmeth=t.value});

/* segarkan popup pesanan bila data/halaman dirender ulang */
{const _r=render;render=function(){_r.apply(this,arguments);if(!S.user){const w=document.getElementById('wan');if(w)w.remove()}if(S.cartOpen&&!S.user){S.cartOpen=false;modal('')}else if(S.cartOpen&&document.querySelector('#modal .cartm'))cartRe()}}
