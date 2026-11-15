/* pos.js: POS sekali ketuk (gaya PinaPOS): produk & paket membership sebagai tile, keranjang ringkas, tombol bayar mengambang */
const pOpts=()=>({canReg:can('member.create'),canExt:can('member.extend')});
function posItems(){const o=pOpts(),q=String(S.pf||'').trim().toLowerCase(),tab=S.ptab||'all',L=[];
 if(tab!=='pkg')S.products.forEach(p=>{if(!q||p.name.toLowerCase().includes(q))L.push({k:'p',id:p.id,name:p.name,price:p.price,sub:p.stock<=0?'Habis':'Stok '+p.stock,off:p.stock<=0,n:S.cart[p.id]||0})});
 if(tab!=='prod'&&(o.canReg||o.canExt))PKG.filter(p=>p.on).forEach(p=>{if(!q||p.name.toLowerCase().includes(q))L.push({k:'k',id:p.id,name:p.name,price:p.price,sub:p.days+' hari'+(p.pt?' + Trainer':''),n:S.ppk===p.id?1:0})});
 return L}
const posTiles=()=>{const L=posItems();return L.length?L.map(i=>`<button type="button" class="tile${i.k==='k'?' pk':''}${i.n?' on':''}" data-a="${i.k==='k'?'ppick':'padd'}" data-v="${i.id}"${i.off?' disabled':''}>${i.n?`<span class="qb">${i.k==='k'?'✓':i.n}</span>`:''}${i.k==='k'?'<small class="tg">Paket</small>':''}<b>${esc(i.name)}</b><span class="pr">${rp(i.price)}</span><small>${i.sub}</small></button>`).join(''):'<p class="mut">Tidak ada yang cocok.</p>'};
function posCart(){const pk=posPkg(),its=S.products.filter(p=>S.cart[p.id]>0);
 if(!its.length&&!pk)return'<p class="mut" style="margin:0">Ketuk produk atau paket untuk menambah.</p>';
 return(pk?`<div class="cl"><span><b>${esc(pk.name)}</b><br><small class="mut">Paket · ${rp(pk.price)}</small></span><button class="btn sm ghost" data-a="ppick" data-v="${pk.id}" aria-label="Hapus paket">×</button></div>`:'')+
 its.map(p=>`<div class="cl"><span><b>${esc(p.name)}</b><br><small class="mut">${rp(p.price)} × ${S.cart[p.id]}</small></span><span class="st"><button class="btn sm ghost" data-a="pdec" data-v="${p.id}" aria-label="Kurangi">−</button><b>${S.cart[p.id]}</b><button class="btn sm ghost" data-a="padd" data-v="${p.id}" aria-label="Tambah">+</button></span></div>`).join('')}
function posCust(){const mem=S.pmem?S.members.find(x=>x.id===S.pmem):null,pk=posPkg(),o=pOpts();
 const need=pk&&!mem&&!S.pnew,open=S.popen||need;
 const trs=pk&&pk.pt?`<label style="margin-top:10px">Trainer<select id="ptid"><option value="">${S.trainers.some(t=>t.on)?'Pilih trainer':'Belum ada trainer (daftarkan di menu Trainer)'}</option>${S.trainers.filter(t=>t.on||t.id===S.ptid).map(t=>`<option value="${t.id}"${t.id===S.ptid?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`:'';
 if(mem)return`<div class="card pcu"><p class="pill" style="flex-wrap:wrap;margin:0"><b>${esc(mem.name)}</b> <span class="mut">${mem.code}</span> ${badge(mstat(mem))}<button class="btn sm ghost" data-a="pmclear">Lepas</button></p>${trs}</div>`;
 if(S.pnew)return`<div class="card pcu"><div class="form"><div class="pill" style="flex-wrap:wrap"><b>Member baru</b><button class="btn sm ghost" data-a="pnewtoggle">Batal</button></div><label>Nama<input id="pnn" value="${esc(S.pnew.name)}" placeholder="Nama pelanggan"></label><label>No. HP (WhatsApp)<input id="pnp" type="tel" value="${esc(S.pnew.phone)}" placeholder="08xxxxxxxxxx"></label></div>${trs}</div>`;
 if(!open)return`<div class="card pcu"><p class="pill" style="margin:0;justify-content:space-between"><span><span class="mut">Pelanggan:</span> <b>Umum</b></span><button class="btn sm ghost" data-a="pcust">Pilih member</button></p></div>`;
 const today=S.members.filter(m=>isDaily(m.pkg)&&m.end>=T0&&!m.freeze).slice(-6).reverse();
 return`<div class="card pcu">${need?'<div class="note">Paket membership butuh member. Cari member atau daftarkan baru.</div>':''}${today.length?`<p style="margin:0 0 8px"><span class="mut">Harian hari ini:</span> ${today.map(m=>`<button class="btn sm ghost" data-a="pmset" data-v="${m.id}">${esc(m.name)}</button>`).join(' ')}</p>`:''}<div class="tb" style="margin:0"><input id="pq" placeholder="Cari member (nama / kode)" value="${esc(S.pq||'')}" autocomplete="off">${o.canReg?'<button class="btn ghost" data-a="pnewtoggle">'+ico('plus')+' Member baru</button>':''}${need?'':'<button class="btn sm ghost" data-a="pcust">Tutup</button>'}</div><div id="pres" style="margin-top:6px">${posResults()}</div></div>`}
P.pos=()=>{const pk=posPkg(),mem=S.pmem?S.members.find(x=>x.id===S.pmem):null;
 if(pk&&pk.pt&&!S.ptid&&mem&&mem.tid)S.ptid=mem.tid;
 const tab=S.ptab||'all',tabs=[['all','Semua'],['prod','Produk'],['pkg','Paket']];
 return`${S.shift?'':'<div class="note">Shift belum dibuka. Buka shift di menu Shift Kasir.</div>'}
 <div class="ptb"><input id="pfq" type="search" placeholder="Cari produk atau paket" value="${esc(S.pf||'')}" autocomplete="off"><span class="seg">${tabs.map(t=>`<button type="button" class="${tab===t[0]?'on':''}" data-a="ptab" data-v="${t[0]}">${t[1]}</button>`).join('')}</span></div>
 <div id="ptiles" class="tiles">${posTiles()}</div>
 <div class="card"><h2>Keranjang</h2><div id="pcart">${posCart()}</div></div>
 ${posCust()}${discBox()}
 <div class="padgap"></div>
 <div class="paybar"><div><small class="mut">Total</small><br><b id="posTotal">${rp(posTotal())}</b></div><select id="pm" aria-label="Metode"><option value="cash"${S.pmeth==='noncash'?'':' selected'}>Tunai</option><option value="noncash"${S.pmeth==='noncash'?' selected':''}>Non-tunai</option></select>${can('pos.checkout')?'<button class="btn" data-a="pay">Bayar</button>':''}</div>`};
const posRe=()=>{const y=scrollY;render();scrollTo(0,y)};
{const _ec=extraClick;extraClick=function(a,v,el){
 if(a==='padd'){const p=S.products.find(x=>x.id===v);if(p&&(S.cart[v]||0)<p.stock){S.cart[v]=(S.cart[v]||0)+1;posRe()}else if(p)toast('Stok tidak cukup.');return true}
 if(a==='pdec'){S.cart[v]=Math.max(0,(S.cart[v]||0)-1);if(!S.cart[v])delete S.cart[v];posRe();return true}
 if(a==='ppick'){S.ppk=S.ppk===v?'':v;S.ptid='';if(S.ppk&&!S.pmem&&!S.pnew)S.popen=true;posRe();return true}
 if(a==='ptab'){S.ptab=v;posRe();return true}
 if(a==='pcust'){S.popen=!S.popen;posRe();return true}
 if(a==='pmset'||a==='pmclear'||a==='pnewtoggle'){const r=_ec.apply(this,arguments);S.ptid='';S.popen=false;return r}
 return _ec.apply(this,arguments)}}
document.addEventListener('input',e=>{const t=e.target;if(t.id==='pfq'){S.pf=t.value;const b=document.getElementById('ptiles');if(b)b.innerHTML=posTiles()}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='ptid')S.ptid=t.value;else if(t.id==='pm')S.pmeth=t.value});
