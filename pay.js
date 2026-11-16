/* pay.js: Trainer, sesi trainer, gaji (trainer: pokok + persen; kasir: pokok), laporan gaji (cetak, PDF, WhatsApp) */
const ymNow=()=>T0.slice(0,7);
const ymLbl=ym=>{try{return new Date(ym+'-01T00:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})}catch(e){return ym}};
const trName=id=>(S.trainers.find(t=>t.id===id)||{name:'(dihapus)'}).name;
const SST={plan:['Terjadwal','b-info'],done:['Selesai','b-ok'],cancel:['Batal','b-gray']};
const pym=()=>S.pym||ymNow();

/* ---- perhitungan gaji ---- */
function adjOf(key,ym){const list=(S.padj||[]).filter(a=>a.key===key&&a.ym===ym);return{list,bonus:list.filter(a=>a.amt>0).reduce((x,a)=>x+a.amt,0),cut:-list.filter(a=>a.amt<0).reduce((x,a)=>x+a.amt,0)}}
function slipT(t,ym){const sess=S.tsess.filter(s=>s.tid===t.id&&s.status==='done'&&s.date.startsWith(ym)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);
 const omzet=sess.reduce((a,s)=>a+(+s.price||0),0),pct=+t.pct||0,com=Math.round(omzet*pct/100),base=+t.base||0,aj=adjOf('trainer:'+t.id,ym);
 return{kind:'trainer',id:t.id,name:t.name,phone:t.phone||'',role:'Trainer',base,pct,count:sess.length,omzet,com,adj:aj.list,bonus:aj.bonus,cut:aj.cut,total:base+com+aj.bonus-aj.cut,sess,on:t.on}}
function slipK(u,ym){const aj=adjOf('kasir:'+u.id,ym),n=S.tx.filter(x=>x.by===u.id&&!x.voided&&x.date.startsWith(ym)).length,base=+u.base||0;
 return{kind:'kasir',id:u.id,name:u.name,phone:u.phone||'',role:'Kasir',base,pct:0,count:n,omzet:0,com:0,adj:aj.list,bonus:aj.bonus,cut:aj.cut,total:base+aj.bonus-aj.cut,sess:[],on:u.on}}
function payees(ym){const o=[];
 S.trainers.forEach(t=>{const sl=slipT(t,ym);if(t.on||sl.count)o.push(sl)});
 S.users.filter(u=>u.role==='kasir'&&(u.on||u.base)).forEach(u=>o.push(slipK(u,ym)));return o}
const findPayee=(v,ym)=>{const [k,id]=String(v).split(':');return k==='trainer'?(S.trainers.find(t=>t.id===id)?slipT(S.trainers.find(t=>t.id===id),ym):null):(S.users.find(u=>u.id===id)?slipK(S.users.find(u=>u.id===id),ym):null)};

/* ---- isi laporan (teks monospace, dipakai cetak dan PDF) ---- */
const PW=64;
const lrp=(l,r,w=PW)=>{l=asc(l);r=asc(r);return l+' '.repeat(Math.max(1,w-l.length-r.length))+r};
function slipLines(s,ym){const L=[],a=(t,b,sz)=>L.push({t,b:!!b,s:sz}),R=(x)=>'Rp '+fnum(x);
 a('SLIP GAJI '+asc(S.settings.gym_name).toUpperCase(),1,15);a('Periode: '+ymLbl(ym),0,10);a('');
 a('Nama    : '+asc(s.name));a('Jabatan : '+s.role);a('-'.repeat(PW));
 a(lrp('Gaji pokok',R(s.base)));
 if(s.kind==='trainer'){a(lrp('Sesi selesai',s.count+' sesi'));a(lrp('Omzet sesi',R(s.omzet)));a(lrp('Komisi '+s.pct+'%',R(s.com)))}
 else a(lrp('Transaksi diproses (info)',s.count+' transaksi'));
 (s.adj||[]).forEach(x=>a(lrp((x.amt>0?'Bonus: ':'Potongan: ')+x.label.slice(0,36),(x.amt>0?'+ ':'- ')+R(Math.abs(x.amt)))));
 a('-'.repeat(PW));a(lrp('TOTAL DITERIMA',R(s.total)),1,11);a('-'.repeat(PW));
 if(s.kind==='trainer'&&s.sess.length){a('');a('Rincian sesi selesai',1);s.sess.forEach(x=>{const m=x.mid?S.members.find(y=>y.id===x.mid):null;a(lrp(x.date.slice(8)+'/'+x.date.slice(5,7)+' '+(x.time||'')+' '+(m?asc(m.name).slice(0,28):'Umum'),fnum(x.price||0)))})}
 a('');a('Dicetak '+T0+' '+hhmm(),0,8);return L}
function rekapLines(ym){const L=[],a=(t,b,sz)=>L.push({t,b:!!b,s:sz}),P=payees(ym);
 a('REKAP GAJI '+asc(S.settings.gym_name).toUpperCase(),1,15);a('Periode: '+ymLbl(ym),0,10);a('');
 a(lrp('Nama (jabatan)','Total'),1);a('-'.repeat(PW));
 P.forEach(s=>{a(lrp(s.name.slice(0,30)+' ('+s.role+')','Rp '+fnum(s.total)));if(s.kind==='trainer')a('   pokok '+fnum(s.base)+' + komisi '+s.pct+'% dari '+fnum(s.omzet)+' ('+s.count+' sesi)',0,9);else a('   gaji pokok',0,9)});
 a('-'.repeat(PW));a(lrp('TOTAL GAJI','Rp '+fnum(P.reduce((x,s)=>x+s.total,0))),1,11);a('');a('Dicetak '+T0+' '+hhmm(),0,8);return L}

/* ---- PDF teks A4 (Courier + Helvetica-Bold), tanpa library ---- */
function pdfDoc(lines){const pw=595.28,ph=841.89,m=48,pages=[],lg=S.settings.logo?Card.jpg(S.settings.logo_j||S.settings.logo):null;let cur=[],y=ph-m;
 if(lg){const f=Math.min(60/lg.w,60/lg.h),dw=lg.w*f,dh=lg.h*f;cur.push(`q ${dw.toFixed(1)} 0 0 ${dh.toFixed(1)} ${m} ${(y-dh).toFixed(1)} cm /Im0 Do Q`);y-=dh+8}
 lines.forEach(l=>{const sz=l.s||10,lh=sz*1.45;if(y-lh<m){pages.push(cur);cur=[];y=ph-m}y-=lh;if(l.t!=='')cur.push(`BT /${l.b&&sz>=11?'F3':l.b?'F2':'F1'} ${sz} Tf ${m} ${y.toFixed(1)} Td (${asc(l.t).replace(/[\\()]/g,'\\$&')}) Tj ET`)});
 pages.push(cur);const objs=['<</Type/Catalog/Pages 2 0 R>>',null,'<</Type/Font/Subtype/Type1/BaseFont/Courier>>','<</Type/Font/Subtype/Type1/BaseFont/Courier-Bold>>','<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>'];
 if(lg)objs.push(`<</Type/XObject/Subtype/Image/Width ${lg.w}/Height ${lg.h}/ColorSpace/${lg.c===1?'DeviceGray':'DeviceRGB'}/BitsPerComponent 8/Filter/DCTDecode/Length ${lg.bin.length}>>\nstream\n${lg.bin}\nendstream`);
 const kids=[];pages.forEach((p,i)=>{const pi=objs.length+1,ci=pi+1;kids.push(pi+' 0 R');objs.push(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw} ${ph}]/Contents ${ci} 0 R/Resources<</Font<</F1 3 0 R/F2 4 0 R/F3 5 0 R>>${lg?'/XObject<</Im0 6 0 R>>':''}>>>>`);const c=p.join('\n');objs.push(`<</Length ${c.length}>>\nstream\n${c}\nendstream`)});
 objs[1]=`<</Type/Pages/Kids[${kids.join(' ')}]/Count ${pages.length}>>`;
 let out='%PDF-1.4\n',off=[];objs.forEach((b,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${b}\nendobj\n`});
 const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${objs.length+1}/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`;
 const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return new Blob([u],{type:'application/pdf'})}
function printLines(L){let box=document.getElementById('printrc');if(box)box.remove();box=document.createElement('div');box.id='printrc';box.className='doc';
 box.innerHTML='<pre>'+L.map(l=>(l.b?'<b>':'')+esc(l.t)+(l.b?'</b>':'')).join('\n')+'</pre>';document.body.appendChild(box);
 let st=document.getElementById('prs');if(st)st.remove();st=document.createElement('style');st.id='prs';st.textContent='@media print{@page{size:A4;margin:14mm}#printrc.doc pre{font-size:12px}}';document.head.appendChild(st);
 const done=()=>{box.remove();st.remove();removeEventListener('afterprint',done)};addEventListener('afterprint',done);
 setTimeout(()=>{try{window.print()}catch(e){done()}setTimeout(()=>{if(box.isConnected&&!/Android|iPhone|iPad/i.test(navigator.userAgent))done()},1500)},60)}
async function shareFile(blob,name,text,waUrl){const f=new File([blob],name,{type:'application/pdf'});
 try{if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text,title:name});return'shared'}}catch(e){if(e&&e.name==='AbortError')return'cancel'}
 Card.download(blob,name);if(waUrl)window.open(waUrl,'_blank','noopener');return'download'}
const slipName=(s,ym)=>'Slip-Gaji-'+asc(s.name).replace(/\W+/g,'-')+'-'+ym+'.pdf';
function slipText(s,ym){return'Halo '+s.name+', berikut slip gaji '+ymLbl(ym)+' dari '+S.settings.gym_name+'. Total diterima: Rp '+fnum(s.total)+(s.kind==='trainer'?' (gaji pokok Rp '+fnum(s.base)+' + komisi '+s.pct+'% Rp '+fnum(s.com)+' dari '+s.count+' sesi)':' (gaji pokok)')+'.'}

/* ---- halaman ---- */
P.trainers=()=>`<form class="card form wide" data-f="addtrainer"><h2>Daftarkan trainer</h2>${fld('Nama','name','','text','required')}${fld('No. HP (WhatsApp)','phone','','tel')}${fld('Gaji pokok / bulan (Rp)','base','0','number','min="0"')}${fld('Persentase dari omzet sesi (%)','pct','0','number','min="0" max="100" step="0.5"')}${fld('Tarif per sesi (Rp)','rate','0','number','min="0"')}<button class="btn">Tambah Trainer</button></form>
 <div class="card">${tbl(['Nama','No. HP','>Gaji pokok','>Persen','>Tarif/sesi','Status',''],S.trainers.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.phone||'-')}</td><td class="r">${rp(t.base||0)}</td><td class="r">${+t.pct||0}%</td><td class="r">${rp(t.rate||0)}</td><td>${badge(t.on?['Aktif','b-ok']:['Nonaktif','b-gray'])}</td><td><span class="pill" style="flex-wrap:wrap"><button class="btn sm" data-a="edittrainer" data-v="${t.id}">Ubah</button><button class="btn sm ghost" data-a="trtoggle" data-v="${t.id}">${t.on?'Nonaktifkan':'Aktifkan'}</button>${cfl('dtr'+t.id,'deltrainer',t.id)}</span></td></tr>`),'Belum ada trainer. Daftarkan di atas.')}</div>`;
const sessRows=()=>{const ym=pym(),f=S.stf||'';return S.tsess.filter(s=>s.date.startsWith(ym)&&(!f||s.tid===f)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1)};
P.tsessions=()=>{const ym=pym(),rows=sessRows(),act=S.trainers.filter(t=>t.on);
 return`<form class="card form wide" data-f="addsess"><h2>Atur sesi dengan trainer</h2><label>Trainer<select name="tid" required>${act.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>${fld('Tanggal','date',T0,'date','required')}${fld('Jam','time','09:00','time','required')}<label>Member (opsional)<input name="mem" list="memlist" placeholder="Ketik nama atau kode" autocomplete="off"></label><datalist id="memlist">${S.members.map(m=>`<option value="${m.code} - ${esc(m.name)}">`).join('')}</datalist>${fld('Harga sesi (Rp), kosongkan = tarif trainer','price','','number','min="0"')}${fld('Catatan','note','')}<button class="btn"${act.length?'':' disabled'}>Jadwalkan</button>${act.length?'':'<p class="mut">Daftarkan trainer dahulu di menu Trainer.</p>'}</form>
 <div class="tb"><input type="month" data-ch="pym" value="${ym}" aria-label="Bulan"><select data-ch="stf"><option value="">Semua trainer</option>${S.trainers.map(t=>`<option value="${t.id}"${S.stf===t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
 <div class="card"><h2>Sesi ${ymLbl(ym)}</h2>${tbl(['Tanggal','Trainer','Member','>Harga','Status',''],rows.map(s=>{const m=s.mid?S.members.find(x=>x.id===s.mid):null;return`<tr><td>${s.date.slice(8)}/${s.date.slice(5,7)} ${esc(s.time||'')}</td><td>${esc(trName(s.tid))}</td><td>${m?esc(m.name)+' <small class="mut">'+m.code+'</small>':'<span class="mut">Umum</span>'}${s.note?'<br><small class="mut">'+esc(s.note)+'</small>':''}</td><td class="r">${rp(s.price||0)}</td><td>${badge(SST[s.status]||SST.plan)}</td><td><span class="pill" style="flex-wrap:wrap">${s.status==='plan'?`<button class="btn sm" data-a="sessdone" data-v="${s.id}">Selesai</button><button class="btn sm ghost" data-a="sesscancel" data-v="${s.id}">Batal</button>`:`<button class="btn sm ghost" data-a="sessplan" data-v="${s.id}">Jadwalkan ulang</button>`}<button class="btn sm ghost" data-a="editsess" data-v="${s.id}">Ubah</button>${cfl('dss'+s.id,'delsess',s.id)}</span></td></tr>`}),'Belum ada sesi bulan ini.')}</div>`};
P.payroll=()=>{const ym=pym(),P_=payees(ym),tot=P_.reduce((a,s)=>a+s.total,0);
 return`<div class="tb"><input type="month" data-ch="pym" value="${ym}" aria-label="Bulan"><button class="btn ghost" data-a="payall" data-v="print">${ico('print')} Cetak rekap</button><button class="btn ghost" data-a="payall" data-v="pdf">Rekap PDF</button></div>
 <div class="note">Trainer: gaji pokok + persentase dari omzet sesi yang berstatus <b>Selesai</b>. Kasir: gaji pokok saja. Atur angka lewat tombol <b>Atur gaji</b>.</div>
 <div class="card"><h2>Gaji ${ymLbl(ym)}</h2>${tbl(['Nama','Jabatan','>Sesi/Trx','>Gaji pokok','>Komisi','>Bonus/Potongan','>Total',''],P_.map(s=>`<tr><td>${esc(s.name)}${s.on?'':' '+badge(['Nonaktif','b-gray'])}</td><td>${s.role}</td><td class="r">${s.count}</td><td class="r">${rp(s.base)}</td><td class="r">${s.kind==='trainer'?rp(s.com)+' <small class="mut">('+s.pct+'%)</small>':'-'}</td><td class="r">${s.bonus-s.cut?(s.bonus-s.cut>0?'+':'-')+rp(Math.abs(s.bonus-s.cut)):'-'}</td><td class="r"><b>${rp(s.total)}</b></td><td><span class="pill" style="flex-wrap:wrap"><button class="btn sm" data-a="paycfg" data-v="${s.kind}:${s.id}">Atur gaji</button><button class="btn sm ghost" data-a="payadj" data-v="${s.kind}:${s.id}">Bonus/Potongan</button><button class="btn sm ghost" data-a="payprint" data-v="${s.kind}:${s.id}">Cetak</button><button class="btn sm ghost" data-a="paypdf" data-v="${s.kind}:${s.id}">PDF</button><button class="btn sm ghost" data-a="paywa" data-v="${s.kind}:${s.id}">WhatsApp</button></span></td></tr>`),'Belum ada trainer atau kasir.')}
 <p style="text-align:right;margin:10px 0 0">Total gaji: <b style="font:700 20px var(--f-head)">${rp(tot)}</b></p></div>`};

/* ---- aksi ---- */
const trMod=(t)=>fld('Nama','name',t.name||'','text','required')+fld('No. HP (WhatsApp)','phone',t.phone||'','tel')+fld('Gaji pokok / bulan (Rp)','base',t.base||0,'number','min="0"')+fld('Persentase dari omzet sesi (%)','pct',t.pct||0,'number','min="0" max="100" step="0.5"')+fld('Tarif per sesi (Rp)','rate',t.rate||0,'number','min="0"');
{const _ecT=extraClick;extraClick=function(a,v,el){CUR={a,v,d:{...el.dataset}};
 const gt=()=>S.trainers.find(x=>x.id===v),gs=()=>S.tsess.find(x=>x.id===v);
 if(a==='edittrainer'){if(!can('trainer.manage'))return true;const t=gt();if(t)fm('Ubah trainer','edittrainer',v,trMod(t));return true}
 if(a==='trtoggle'){if(!can('trainer.manage'))return true;const t=gt();if(t){t.on=t.on?0:1;log('trainer_status',t.name);render()}return true}
 if(a==='deltrainer'){if(!can('trainer.manage'))return true;const t=gt();if(!t)return true;const n=S.tsess.filter(s=>s.tid===v).length;
  if(n){toast('Trainer punya '+n+' sesi. Gunakan Nonaktifkan agar riwayat gaji tetap utuh.');return true}
  if(!ask('dtr'+v,'Hapus trainer <b>'+esc(t.name)+'</b>?'))return true;S.trainers=S.trainers.filter(x=>x.id!==v);log('trainer_hapus',t.name);render();toast('Trainer dihapus.');return true}
 if(a==='sessdone'||a==='sesscancel'||a==='sessplan'){if(!can('trainer.manage'))return true;const s=gs();if(s){s.status=a==='sessdone'?'done':a==='sesscancel'?'cancel':'plan';log('sesi_'+s.status,trName(s.tid)+' '+s.date);render()}return true}
 if(a==='editsess'){if(!can('trainer.manage'))return true;const s=gs();if(!s)return true;const m=s.mid?S.members.find(x=>x.id===s.mid):null;
  fm('Ubah sesi','editsess',v,`<label>Trainer<select name="tid">${S.trainers.map(t=>`<option value="${t.id}"${t.id===s.tid?' selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`+fld('Tanggal','date',s.date,'date','required')+fld('Jam','time',s.time||'','time','required')+`<label>Member (opsional)<input name="mem" list="memlist" value="${m?esc(m.code+' - '+m.name):''}" autocomplete="off"></label><datalist id="memlist">${S.members.map(x=>`<option value="${x.code} - ${esc(x.name)}">`).join('')}</datalist>`+fld('Harga sesi (Rp)','price',s.price||0,'number','min="0"')+fld('Catatan','note',s.note||'')+`<label>Status<select name="status">${Object.entries(SST).map(([k,x])=>`<option value="${k}"${k===s.status?' selected':''}>${x[0]}</option>`).join('')}</select></label>`);return true}
 if(a==='delsess'){if(!can('trainer.manage'))return true;if(!ask('dss'+v,'Hapus sesi ini?'))return true;S.tsess=S.tsess.filter(x=>x.id!==v);log('sesi_hapus');render();toast('Sesi dihapus.');return true}
 if(a==='paycfg'){if(!can('payroll.manage'))return true;const [k,id]=String(v).split(':');
  if(k==='trainer'){const t=S.trainers.find(x=>x.id===id);if(t)fm('Atur gaji: '+esc(t.name),'paycfg',v,fld('Gaji pokok / bulan (Rp)','base',t.base||0,'number','min="0"')+fld('Persentase dari omzet sesi (%)','pct',t.pct||0,'number','min="0" max="100" step="0.5"')+fld('Tarif per sesi (Rp)','rate',t.rate||0,'number','min="0"'))}
  else{const u=S.users.find(x=>x.id===id);if(u)fm('Atur gaji: '+esc(u.name),'paycfg',v,fld('Gaji pokok / bulan (Rp)','base',u.base||0,'number','min="0"')+fld('No. HP (WhatsApp)','phone',u.phone||'','tel'))}return true}
 if(a==='payprint'||a==='paypdf'||a==='paywa'){if(!can('payroll.manage'))return true;const ym=pym(),s=findPayee(v,ym);if(!s)return true;const L=slipLines(s,ym);
  if(a==='payprint')printLines(L);
  else if(a==='paypdf'){Card.download(pdfDoc(L),slipName(s,ym));log('slip_pdf',s.name)}
  else{const n=waNum(s.phone);if(!n){toast('Isi nomor HP '+s.name+' dahulu (Atur gaji).');return true}const tx=slipText(s,ym);
   shareFile(pdfDoc(L),slipName(s,ym),tx,'https://wa.me/'+n+'?text='+encodeURIComponent(tx+' (PDF slip terlampir)')).then(r=>{log('slip_wa',s.name);if(r==='download')toast('PDF diunduh. Lampirkan ke chat WhatsApp yang terbuka.')})}
  return true}
 if(a==='payall'){if(!can('payroll.manage'))return true;const ym=pym(),L=rekapLines(ym);if(v==='print')printLines(L);else Card.download(pdfDoc(L),'Rekap-Gaji-'+ym+'.pdf');return true}
 return _ecT.apply(this,arguments)}}
const memFrom=t=>{const m=/GYM\d+/i.exec(String(t||''));return m?(S.members.find(x=>x.code===m[0].toUpperCase())||{}).id||null:null};
{const _esT=extraSubmit;extraSubmit=function(k,d,f){const id=f.dataset.id;
 if(k==='addtrainer'){if(!can('trainer.manage'))return true;const n=String(d.name).trim();if(!n)return true;S.trainers.push({id:uid(),name:n,phone:String(d.phone||'').trim(),base:Math.max(0,+d.base||0),pct:Math.min(100,Math.max(0,+d.pct||0)),rate:Math.max(0,+d.rate||0),on:1});log('trainer_tambah',n);render();toast('Trainer didaftarkan.');return true}
 if(k==='edittrainer'){if(!can('trainer.manage'))return true;const t=S.trainers.find(x=>x.id===id);if(!t)return true;t.name=String(d.name).trim()||t.name;t.phone=String(d.phone||'').trim();t.base=Math.max(0,+d.base||0);t.pct=Math.min(100,Math.max(0,+d.pct||0));t.rate=Math.max(0,+d.rate||0);log('trainer_ubah',t.name);modal('');render();toast('Trainer disimpan.');return true}
 if(k==='addsess'){if(!can('trainer.manage'))return true;const t=S.trainers.find(x=>x.id===d.tid);if(!t){toast('Pilih trainer.');return true}
  if(d.mem&&!memFrom(d.mem)){toast('Member tidak ditemukan. Pilih dari daftar atau kosongkan.');return true}
  S.tsess.push({id:uid(),date:d.date,time:d.time,tid:t.id,mid:memFrom(d.mem),price:d.price===''||d.price==null?(+t.rate||0):Math.max(0,+d.price||0),status:'done',src:'manual',note:String(d.note||'').trim()});
  log('sesi_tambah',t.name+' '+d.date);if(d.date.startsWith(ymNow())||true)S.pym=d.date.slice(0,7);render();toast('Sesi dijadwalkan.');return true}
 if(k==='editsess'){if(!can('trainer.manage'))return true;const s=S.tsess.find(x=>x.id===id);if(!s)return true;
  if(d.mem&&!memFrom(d.mem)){toast('Member tidak ditemukan.');return true}
  Object.assign(s,{tid:d.tid,date:d.date,time:d.time,mid:memFrom(d.mem),price:Math.max(0,+d.price||0),note:String(d.note||'').trim(),status:SST[d.status]?d.status:s.status});log('sesi_ubah',trName(s.tid));modal('');render();toast('Sesi disimpan.');return true}
 if(k==='paycfg'){if(!can('payroll.manage'))return true;const [kind,rid]=String(id).split(':');
  if(kind==='trainer'){const t=S.trainers.find(x=>x.id===rid);if(t){t.base=Math.max(0,+d.base||0);t.pct=Math.min(100,Math.max(0,+d.pct||0));t.rate=Math.max(0,+d.rate||0)}}
  else{const u=S.users.find(x=>x.id===rid);if(u){u.base=Math.max(0,+d.base||0);if('phone'in d)u.phone=String(d.phone).trim()}}
  log('gaji_atur',id);modal('');render();toast('Pengaturan gaji disimpan.');return true}
 return _esT.apply(this,arguments)}}
document.addEventListener('change',e=>{const t=e.target,c=t.dataset&&t.dataset.ch;
 if(c==='pym'&&/^\d{4}-\d{2}$/.test(t.value)){S.pym=t.value;renderView()}
 else if(c==='stf'){S.stf=t.value;renderView()}});
