/* Lonceng notifikasi untuk admin/kasir: member yang membership-nya berakhir 7 hari lagi dan yang berakhir hari ini */
function wrmList(){
 if(!S.user||!canCW())return[];
 const sent=new Set(S.wlog.map(l=>l.k)),out=[];
 S.members.forEach(m=>{
  if(m.freeze||!String(m.phone||'').trim())return;
  const pk=PKG.find(p=>p.id===m.pkg);if(pk&&pk.days<=1)return;
  const d=daysLeft(m);
  if(d===7){const k=m.id+'|'+m.end+'|h7';if(!sent.has(k))out.push({m,k,d,lbl:'Berakhir 7 hari lagi ('+m.end+')',tpl:tplBy('Pengingat Expired')})}
  else if(d===0){const k=m.id+'|'+m.end+'|h0';if(!sent.has(k))out.push({m,k,d,lbl:'Habis hari ini',tpl:tplBy('Membership Habis')})}});
 return out.sort((a,b)=>a.d-b.d)}
IC.bell='M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0';
let wrmOpen=false;
/* lonceng notifikasi di bilah atas: badge = jumlah pengingat; ketuk untuk membuka daftar */
function wrmShow(){
 const L=S.user?wrmList():[];let bl=document.getElementById('wrb');
 const hd=document.querySelector('header.top');
 if(!hd||!S.user||!canCW()){if(bl)bl.remove();const o=document.getElementById('wrm');if(o)o.remove();return}
 if(!bl){bl=document.createElement('button');bl.id='wrb';bl.type='button';bl.className='btn ghost sm';bl.dataset.a='wrbell';bl.setAttribute('aria-label','Notifikasi pengingat membership');const w=hd.querySelector('.who');hd.insertBefore(bl,w||null)}
 bl.innerHTML=ico('bell')+(L.length?`<span class="wrbadge">${L.length}</span>`:'');bl.classList.toggle('has',L.length>0);
 const old=document.getElementById('wrm');
 if(!wrmOpen){if(old)old.remove();return}
 const h=`<div class="pill" style="justify-content:space-between"><b>Notifikasi pengingat membership</b><button class="btn sm ghost" data-a="wrclose" aria-label="Tutup">×</button></div>${L.length?`<p class="mut" style="margin:4px 0 8px">Member yang membership-nya berakhir 7 hari lagi atau habis hari ini. Kirim WhatsApp pengingat:</p><div class="wrl">${L.map(x=>`<div class="wri"><span><b>${esc(x.m.name)}</b><br><small class="mut">${esc(x.lbl)}</small></span><button class="btn sm" data-a="wrsend" data-v="${x.m.id}" data-k="${esc(x.k)}">${ico('chat')} Kirim</button></div>`).join('')}</div>`:'<p class="mut" style="margin:8px 0">Tidak ada pengingat saat ini.</p>'}`;
 if(old){old.innerHTML=h;return}
 const d=document.createElement('div');d.id='wrm';d.setAttribute('role','dialog');d.innerHTML=h;document.body.appendChild(d)}
{const _x=extraClick;extraClick=function(a,v,el){
 if(a==='wrbell'){wrmOpen=!wrmOpen;wrmShow();return true}
 if(a==='wrclose'){wrmOpen=false;wrmShow();return true}
 if(a==='wrsend'){const x=wrmList().find(y=>y.m.id===v&&y.k===el.dataset.k);if(!x||!canCW())return true;
  if(!openWa(waLink(x.m,x.tpl.body))){toast('Nomor HP member kosong.');return true}
  markSent(x.k,x.m.id);log('wa_pengingat',x.m.code);persist();wrmShow();toast('WhatsApp dibuka untuk '+x.m.name+'.');return true}
 return _x.apply(this,arguments)}}
{const _r=render;render=function(){_r.apply(this,arguments);try{wrmShow()}catch(e){}}}
{const _v=renderView;renderView=function(){_v.apply(this,arguments);try{wrmShow()}catch(e){}}}
setInterval(()=>{try{wrmShow()}catch(e){}},60000);
