/* Kotak cari otomatis untuk tabel panjang di semua menu (di luar yang sudah punya pencarian sendiri) */
(function(){
const OWN=['visits','transactions','reprint','activity','members','cards','pos','checkin'];
function addBoxes(){
 try{
  if(!S.user||OWN.includes(S.page))return;
  document.querySelectorAll('.tw').forEach(w=>{
   if(w.dataset.sq||w.previousElementSibling&&w.previousElementSibling.classList.contains('sqb'))return;
   const t=w.querySelector('table');if(!t)return;
   const rows=[...t.querySelectorAll('tr')].filter(r=>!r.classList.contains('th'));
   if(rows.length<6)return;
   w.dataset.sq='1';
   const b=document.createElement('div');b.className='tb sqb';
   b.innerHTML='<input type="search" placeholder="Cari di daftar ini…" aria-label="Cari di daftar ini" autocomplete="off"><span class="mut sqn"></span>';
   w.parentNode.insertBefore(b,w);
   const inp=b.querySelector('input'),n=b.querySelector('.sqn');
   inp.addEventListener('input',()=>{const k=inp.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let sh=0;
    rows.forEach(r=>{const x=r.textContent.toLowerCase(),ok=k.every(q=>x.includes(q));r.style.display=ok?'':'none';if(ok)sh++});
    n.textContent=k.length?sh+' dari '+rows.length+' data':''});
  });
 }catch(e){}
}
const _r=renderView;renderView=function(){_r.apply(this,arguments);addBoxes()};
})();
