/* Barcode produk untuk POS: scanner USB/Bluetooth, kamera, atau ketik kode di kolom cari */
const prodFind=c=>{c=String(c||'').trim().toLowerCase();return c?S.products.find(p=>p.bc&&String(p.bc).trim().toLowerCase()===c):null};
/* dipanggil dari doScan (scanner/kamera/keyboard). true = kode ini barcode produk dan sudah diproses */
function prodScan(code,src){
 const p=prodFind(code);if(!p||!S.user)return false;
 if(!can('pos.access')){return false}
 if(p.stock<=0||(S.cart[p.id]||0)>=p.stock){toast(p.name+': stok tidak cukup.');beep('bad');return true}
 S.cart[p.id]=(S.cart[p.id]||0)+1;beep('ok');toast(p.name+' masuk keranjang ('+S.cart[p.id]+')');
 if(S.page!=='pos'){go('pos')}else posRe();
 return true}
/* ketik/scan di kolom cari POS lalu Enter */
document.addEventListener('keydown',e=>{
 const t=e.target;if(!t||t.id!=='pfq'||e.key!=='Enter')return;
 const q=String(t.value||'').trim();if(!q)return;e.preventDefault();e.stopPropagation();
 const p=prodFind(q);
 if(p){S.pf='';prodScan(q,'search');return}
 if(/^\d{6,}$/.test(q))toast('Barcode '+q+' belum terdaftar di produk.')
},true);
/* tombol kamera di POS */
{const _x=extraClick;extraClick=function(a,v,el){if(a==='pscan'){camStart().then(ok=>{if(ok)toast('Arahkan kamera ke barcode produk.')});return true}return _x.apply(this,arguments)}}
{const _p=P.pos;if(_p)P.pos=function(){return _p.apply(this,arguments).replace('<span class="seg">','<button type="button" class="btn sm ghost" data-a="pscan" title="Scan barcode dengan kamera">'+ico('scan')+'</button><span class="seg">')}}
