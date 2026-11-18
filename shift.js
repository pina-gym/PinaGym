/* Shift kasir: kas awal, rekap penjualan (produk, member harian/bulanan/tahunan), tunai vs non-tunai/QRIS, kas fisik dan selisih */
const curShift=()=>S.user?S.shifts.find(s=>!s.end&&s.by===S.user.id):null;
const shiftOpen=()=>!!curShift();
function shiftSum(s){
 const a=s.date+' '+s.time,b=s.end?s.end.date+' '+s.end.time:'9999';
 const tx=S.tx.filter(t=>!t.voided&&t.by===s.by&&(t.date+' '+t.time)>=a&&(t.date+' '+t.time)<=b);
 const kind=t=>{if(t.type!=='membership')return'p';if(t.vid)return'h';const p=PKG.find(x=>x.id===t.pk);return p&&p.days>=300?'y':'b'};
 const sm=f=>tx.filter(f).reduce((x,t)=>x+t.total,0),cash=sm(t=>t.method==='cash'),non=sm(t=>t.method!=='cash');
 return{n:tx.length,cn:tx.filter(t=>t.method==='cash').length,nn:tx.filter(t=>t.method!=='cash').length,prod:sm(t=>kind(t)==='p'),hr:sm(t=>kind(t)==='h'),bl:sm(t=>kind(t)==='b'),th:sm(t=>kind(t)==='y'),cash,non,tot:cash+non}}
const shiftData=s=>s.end&&s.snap?s.snap:shiftSum(s);
const shRows=m=>`<table class="rt"><tbody>${m.map(([k,v,b])=>`<tr><td>${k}</td><td class="r">${b?'<b>'+v+'</b>':v}</td></tr>`).join('')}</tbody></table>`;
function shiftRekap(s,x){const exp=(+s.cash0||0)+x.cash,diff=s.counted==null?null:s.counted-exp;
 return shRows([['Penjualan produk (POS)',rp(x.prod)],['Member harian',rp(x.hr)],['Member bulanan',rp(x.bl)],['Member tahunan',rp(x.th)],['Total penjualan',rp(x.tot),1],['Tunai ('+x.cn+' trx)',rp(x.cash)],['Non-tunai / QRIS ('+x.nn+' trx)',rp(x.non)],['Modal awal kas',rp(s.cash0||0)],['Kas seharusnya di laci (modal + tunai)',rp(exp),1]].concat(diff==null?[]:[['Kas fisik dihitung',rp(s.counted)],['Selisih',(diff>0?'+':'')+rp(diff)+(diff===0?' (pas)':diff>0?' (lebih)':' (kurang)'),1]]))}
P.shifts=()=>{
 const mine=curShift(),all=can('shift.manage'),own=can('shift.own');
 let h='';
 if(own){
  if(!mine){const last=S.shifts.filter(s=>s.by===S.user.id&&s.end&&s.counted!=null).sort((a,b)=>(b.end.date+b.end.time).localeCompare(a.end.date+a.end.time))[0];
   h+=`<div class="card"><h2>Shift Saya</h2><p>Status: ${badge(['Tertutup','b-gray'])}</p><form class="form" data-f="shopen"><label>Modal awal kas di laci (Rp)<input name="cash0" type="number" min="0" inputmode="numeric" value="${last?last.counted:0}" required></label><button class="btn">Buka Shift</button></form></div>`}
  else{const x=shiftSum(mine);
   h+=`<div class="card"><h2>Shift Saya</h2><p>Status: ${badge(['Terbuka','b-ok'])} <span class="mut">sejak ${mine.date===T0?'':mine.date+' '}${mine.time}</span></p>${shiftRekap(mine,x)}<form class="form" data-f="shclose" style="margin-top:12px"><label>Kas fisik di laci saat ini (Rp)<input name="counted" type="number" min="0" inputmode="numeric" required></label><label>Catatan (opsional)<input name="note"></label><button class="btn red">Tutup Shift</button></form></div>`}}
 const L=(all?S.shifts:S.shifts.filter(s=>s.by===S.user.id)).slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,60);
 h+=`<div class="card"><h2>Riwayat Shift</h2>${tbl(['Kasir','Buka','Tutup','>Modal','>Tunai','>Non-tunai / QRIS','>Total','>Seharusnya','>Kas fisik','>Selisih',''],L.map(s=>{const x=shiftData(s),exp=(+s.cash0||0)+x.cash,d=s.counted==null?null:s.counted-exp;
  return`<tr><td>${esc(byName(s.by))}</td><td>${s.date} ${s.time}</td><td>${s.end?s.end.date+' '+s.end.time:badge(['Terbuka','b-ok'])}</td><td class="r">${rp(s.cash0||0)}</td><td class="r">${rp(x.cash)}</td><td class="r">${rp(x.non)}</td><td class="r"><b>${rp(x.tot)}</b></td><td class="r">${rp(exp)}</td><td class="r">${s.counted==null?'-':rp(s.counted)}</td><td class="r">${d==null?'-':(d>0?'+':'')+rp(d)}</td><td>${!s.end&&all&&s.by!==(S.user||{}).id?`<button class="btn sm ghost" data-a="shforce" data-v="${s.id}">Tutup paksa</button>`:''}</td></tr>`}),'Belum ada shift.')}</div>`;
 return h};
function shiftClose(s,counted,note,forced){const x=shiftSum(s);s.end={date:T0,time:hhmm()};s.snap=x;s.counted=counted;if(note)s.note=note;if(forced)s.forced=1;log(forced?'shift_tutup_paksa':'shift_tutup',byName(s.by));persist();return x}
{const _x=extraClick;extraClick=function(a,v,el){
 if(a==='shforce'){if(!can('shift.manage'))return true;const s=S.shifts.find(y=>y.id===v);if(s&&!s.end){shiftClose(s,null,'Ditutup admin',1);toast('Shift '+byName(s.by)+' ditutup.');render()}return true}
 return _x.apply(this,arguments)}}
{const _s=extraSubmit;extraSubmit=function(k,d,f){
 if(k==='shopen'){if(!can('shift.own')||curShift())return true;S.shifts.push({id:uid(),by:S.user.id,date:T0,time:hhmm(),cash0:Math.max(0,+d.cash0||0),end:null,counted:null});log('shift_buka',S.user.name);persist();toast('Shift dibuka.');render();return true}
 if(k==='shclose'){const s=curShift();if(!s)return true;const x=shiftClose(s,Math.max(0,+d.counted||0),String(d.note||'').trim());render();
  modal(`<div style="max-width:420px;margin:auto"><h2 style="margin:0 0 8px">Rekap shift ditutup</h2><p class="mut" style="margin:0 0 10px">${esc(S.user.name)} · ${s.date} ${s.time} sampai ${s.end.date} ${s.end.time}</p>${shiftRekap(s,x)}<p style="text-align:right;margin:12px 0 0"><button class="btn" data-a="mclose">Selesai</button></p></div>`);return true}
 return _s.apply(this,arguments)}}
