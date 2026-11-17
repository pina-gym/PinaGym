/* pt.js: paket member + trainer (PT) */
const ptFields=p=>`<label class="chk"><input type="checkbox" name="pt" value="1"${p.pt?' checked':''}> Paket termasuk trainer (PT)</label>`+fld('Nilai per sesi untuk trainer (Rp)','ptv',p.ptv||0,'number','min="0"')+fld('Jumlah sesi trainer (0 = tanpa batas)','ptn',p.ptn||0,'number','min="0"');
function trainerSel(pkgId,cur,always){const p=PKG.find(x=>x.id===pkgId),act=S.trainers.filter(t=>t.on||t.id===cur),show=always?!!(p&&p.pt):!!(p&&p.pt);
 return`<label class="trsel"${show?'':' hidden'}>Trainer<select name="tid"><option value="">${act.length?'Pilih trainer':'Belum ada trainer (daftarkan di menu Trainer)'}</option>${act.map(t=>`<option value="${t.id}"${t.id===cur?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`}
document.addEventListener('change',e=>{const t=e.target;if(t.name==='pkg'&&t.form){const l=t.form.querySelector('.trsel');if(l){const p=PKG.find(x=>x.id===t.value);l.hidden=!(p&&p.pt)}}});

/* sesi otomatis saat check-in member paket + trainer */
function ptSession(m,cid){const p=PKG.find(x=>x.id===m.pkg);if(!p||!p.pt||!m.tid)return null;const t=S.trainers.find(x=>x.id===m.tid);if(!t)return null;
 m.ptu=(m.ptu||0)+1;S.tsess.push({id:uid(),date:T0,time:hhmm(),tid:t.id,mid:m.id,price:+p.ptv||+t.rate||0,status:'done',note:'Check-in member',src:'ci',cid:cid||''});return{t,used:m.ptu,max:+p.ptn||0}}
/* cocokkan ulang: check-in member paket+trainer yang belum punya sesi (mis. data lama / perangkat lain) dibuatkan sesinya */
function ptReconcile(){let n=0;S.checkins.forEach(c=>{const m=S.members.find(x=>x.id===c.m);if(!m||!m.tid)return;const p=PKG.find(x=>x.id===m.pkg);if(!p||!p.pt)return;const t=S.trainers.find(x=>x.id===m.tid);if(!t)return;if(c.date<iso(addD(new Date(m.end+'T00:00:00'),-(+p.days||0))))return;if(S.tsess.some(s=>s.src==='ci'&&(s.cid===c.id||(s.mid===m.id&&s.date===c.date))))return;S.tsess.push({id:uid(),date:c.date,time:c.time||'00:00',tid:t.id,mid:m.id,price:+p.ptv||+t.rate||0,status:'done',note:'Check-in member',src:'ci',cid:c.id});m.ptu=(m.ptu||0)+1;n++});if(n)persist();return n}

/* form daftar & perpanjang: pilih trainer */
{const _r=P.register;P.register=()=>{const h=_r(),f=PKG.find(p=>p.on);return h.replace('<label>Pembayaran',trainerSel(f&&f.id,'')+'<label>Pembayaran')};
 const _e=P.extend;P.extend=()=>{const h=_e(),f=PKG.find(p=>p.on);return h.replace('<button class="btn">Perpanjang',trainerSel(f&&f.id,'')+'<button class="btn">Perpanjang')};
 const _t=P.trainers;P.trainers=()=>{const h=_t(),rows=S.trainers.map(t=>{const ms=S.members.filter(m=>m.tid===t.id&&mstat(m)[0]!=='Expired');return`<tr><td>${esc(t.name)}</td><td class="r">${ms.length}</td><td>${ms.slice(0,8).map(m=>esc(m.name)).join(', ')}${ms.length>8?'…':''}</td></tr>`});
  return h+`<div class="card"><h2>Member aktif per trainer</h2>${tbl(['Trainer','>Member aktif','Daftar'],rows,'Belum ada trainer.')}<p class="mut">Member masuk ke trainer saat memilih paket + trainer. Setiap check-in tercatat sebagai satu sesi.</p></div>`}}
{const _ec=extraClick;extraClick=function(a,v,el){if(a==='mwacard'){S.cardM=v;return _ec.call(this,'cardwa',v,el)}return _ec.apply(this,arguments)}}

/* Sesi Trainer: otomatis dari check-in (trainer tersedia 24 jam, tanpa atur jadwal) */
{const _s=P.tsessions;P.tsessions=()=>{try{ptReconcile()}catch(e){}let h=_s();const i=h.indexOf('<form class="card form wide" data-f="addsess">');if(i<0)return h;const j=h.indexOf('</form>',i)+7;
 const form=h.slice(i,j).replace('Atur sesi dengan trainer','Catat sesi manual').replace('Jadwalkan</button>','Catat sesi</button>');
 const ym=pym(),sm=S.trainers.filter(t=>t.on).map(t=>{const l=S.tsess.filter(s=>s.tid===t.id&&s.date.startsWith(ym)&&s.status==='done');return{t,n:l.length,a:l.filter(s=>s.src==='ci').length,ms:S.members.filter(m=>m.tid===t.id&&mstat(m)[0]!=='Expired').length}});
 const info=`<div class="card"><h2>Sesi otomatis</h2><p class="mut" style="margin:0 0 10px">Trainer siaga 24 jam, jadi tidak perlu mengatur jadwal. Setiap kali member paket + trainer <b>check-in</b>, satu sesi langsung tercatat <b>Selesai</b> untuk trainer-nya dan masuk ke perhitungan komisi.</p>${tbl(['Trainer','>Member aktif','>Sesi '+ymLbl(ym),'>Dari check-in'],sm.map(x=>`<tr><td>${esc(x.t.name)}</td><td class="r">${x.ms}</td><td class="r"><b>${x.n}</b></td><td class="r">${x.a}</td></tr>`),'Belum ada trainer aktif.')}<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Catat sesi manual (opsional, untuk sesi di luar check-in)</summary>${form.replace('class="card form wide"','class="form wide" style="margin-top:10px"')}</details></div>`;
 return h.slice(0,i)+info+h.slice(j)}}


/* role Trainer: hanya lihat menu Trainer & Sesi Trainer (milik sendiri bila akun dikaitkan ke trainer) */
{const isTr=()=>S.user&&!can('trainer.manage')&&can('trainer.view');
 const _t=P.trainers;P.trainers=()=>{if(!isTr())return _t();const me=trainerOf(S.user),list=S.trainers.filter(t=>t.on&&(!me||t.id===me.id));
  return`<div class="card"><h2>Member aktif per trainer</h2>${tbl(['Trainer','>Member aktif','Daftar'],list.map(t=>{const ms=S.members.filter(m=>m.tid===t.id&&mstat(m)[0]!=='Expired');return`<tr><td>${esc(t.name)}</td><td class="r">${ms.length}</td><td>${ms.map(m=>esc(m.name)).join(', ')||'-'}</td></tr>`}),'Belum ada trainer.')}${me?'':'<p class="mut">Akun ini belum dikaitkan ke trainer tertentu, jadi semua trainer ditampilkan. Admin bisa mengaitkannya di Manajemen User.</p>'}</div>`};
 const _s=P.tsessions;P.tsessions=()=>{if(!isTr())return _s();try{ptReconcile()}catch(e){}const me=trainerOf(S.user),ym=pym();
  const l=S.tsess.filter(s=>s.status==='done'&&s.date.startsWith(ym)&&(!me||s.tid===me.id)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  return`<div class="card"><h2>Sesi ${ymLbl(ym)}${me?' · '+esc(me.name):''}</h2><p class="mut" style="margin:0 0 10px">Sesi tercatat otomatis saat member paket + trainer check-in. Total bulan ini: <b>${l.length}</b>.</p>${tbl(['Tanggal','Jam','Trainer','Member'],l.map(s=>{const t=S.trainers.find(x=>x.id===s.tid),m=M(s.mid);return`<tr><td>${s.date}</td><td>${s.time}</td><td>${esc(t?t.name:'-')}</td><td>${esc(m.name)}</td></tr>`}),'Belum ada sesi bulan ini.')}</div>`}}
/* pilih trainer terkait untuk akun role Trainer */
{const trOpt=(cur,role)=>`<label class="usertr"${role==='trainer'?'':' hidden'}><span>Trainer terkait (khusus role Trainer)</span><select name="utid"><option value="">- semua trainer -</option>${S.trainers.map(t=>`<option value="${t.id}"${t.id===cur?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`;
 const _u=P.users;P.users=()=>_u().replace('<button class="btn">Tambah User</button>',trOpt('','')+'<button class="btn">Tambah User</button>');
 const _ec=extraClick;extraClick=function(a,v,el){const r=_ec.apply(this,arguments);if(a==='edituser'){const f=document.querySelector('#modal form'),u=S.users.find(x=>x.id===v);if(f&&u&&!f.querySelector('[name=utid]')){const d=document.createElement('div');d.innerHTML=trOpt(u.tid||'',u.role);f.insertBefore(d.firstChild,f.lastElementChild)}}return r};
 const _es=extraSubmit;extraSubmit=function(k,d,f){if(k==='adduser'){const un=String(d.username||'').trim().toLowerCase();const r=_es.apply(this,arguments);if(d.role==='trainer'&&d.utid)setTimeout(()=>{const u=S.users.find(x=>x.username===un);if(u){u.tid=d.utid;persist()}},400);return r}
  if(k==='edituser'){const r=_es.apply(this,arguments);const u=S.users.find(x=>x.id===(f.dataset.id));if(u){if(u.role==='trainer'&&d.utid)u.tid=d.utid;else delete u.tid;persist()}return r}
  return _es.apply(this,arguments)};
 document.addEventListener('change',e=>{const t=e.target;if(t&&t.name==='role'&&t.form){const l=t.form.querySelector('.usertr');if(l)l.hidden=t.value!=='trainer'}});
 document.addEventListener('DOMContentLoaded',()=>{});}
