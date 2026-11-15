/* pt.js: paket member + trainer (PT) */
const ptFields=p=>`<label class="chk"><input type="checkbox" name="pt" value="1"${p.pt?' checked':''}> Paket termasuk trainer (PT)</label>`+fld('Nilai per sesi untuk trainer (Rp)','ptv',p.ptv||0,'number','min="0"')+fld('Jumlah sesi trainer (0 = tanpa batas)','ptn',p.ptn||0,'number','min="0"');
function trainerSel(pkgId,cur,always){const p=PKG.find(x=>x.id===pkgId),act=S.trainers.filter(t=>t.on||t.id===cur),show=always?!!(p&&p.pt):!!(p&&p.pt);
 return`<label class="trsel"${show?'':' hidden'}>Trainer<select name="tid"><option value="">${act.length?'Pilih trainer':'Belum ada trainer (daftarkan di menu Trainer)'}</option>${act.map(t=>`<option value="${t.id}"${t.id===cur?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`}
document.addEventListener('change',e=>{const t=e.target;if(t.name==='pkg'&&t.form){const l=t.form.querySelector('.trsel');if(l){const p=PKG.find(x=>x.id===t.value);l.hidden=!(p&&p.pt)}}});

/* sesi otomatis saat check-in member paket + trainer */
function ptSession(m){const p=PKG.find(x=>x.id===m.pkg);if(!p||!p.pt||!m.tid)return null;const t=S.trainers.find(x=>x.id===m.tid);if(!t)return null;
 m.ptu=(m.ptu||0)+1;S.tsess.push({id:uid(),date:T0,time:hhmm(),tid:t.id,mid:m.id,price:+p.ptv||+t.rate||0,status:'done',note:'Check-in member',src:'ci'});return{t,used:m.ptu,max:+p.ptn||0}}

/* form daftar & perpanjang: pilih trainer */
{const _r=P.register;P.register=()=>{const h=_r(),f=PKG.find(p=>p.on);return h.replace('<label>Pembayaran',trainerSel(f&&f.id,'')+'<label>Pembayaran')};
 const _e=P.extend;P.extend=()=>{const h=_e(),f=PKG.find(p=>p.on);return h.replace('<button class="btn">Perpanjang',trainerSel(f&&f.id,'')+'<button class="btn">Perpanjang')};
 const _t=P.trainers;P.trainers=()=>{const h=_t(),rows=S.trainers.map(t=>{const ms=S.members.filter(m=>m.tid===t.id&&mstat(m)[0]!=='Expired');return`<tr><td>${esc(t.name)}</td><td class="r">${ms.length}</td><td>${ms.slice(0,8).map(m=>esc(m.name)).join(', ')}${ms.length>8?'…':''}</td></tr>`});
  return h+`<div class="card"><h2>Member aktif per trainer</h2>${tbl(['Trainer','>Member aktif','Daftar'],rows,'Belum ada trainer.')}<p class="mut">Member masuk ke trainer saat memilih paket + trainer. Setiap check-in tercatat sebagai satu sesi.</p></div>`}}
{const _ec=extraClick;extraClick=function(a,v,el){if(a==='mwacard'){S.cardM=v;return _ec.call(this,'cardwa',v,el)}return _ec.apply(this,arguments)}}
