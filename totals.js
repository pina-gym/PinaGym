/* Total keseluruhan: harian, mingguan, bulanan, tahunan (+ seluruh waktu) */
function periodTotals(){
 const t0=new Date(TODAY),dow=(t0.getDay()+6)%7,wk=iso(addD(t0,-dow)),mo=T0.slice(0,7),yr=T0.slice(0,4);
 const P2=[['Hari ini',d=>d===T0],['Minggu ini',d=>d>=wk&&d<=T0],['Bulan ini',d=>d.slice(0,7)===mo],['Tahun ini',d=>d.slice(0,4)===yr],['Seluruh waktu',()=>true]];
 const prof=can('report.profit');
 return P2.map(([lbl,f])=>{
  const tx=S.tx.filter(t=>!t.voided&&f(t.date)),sm=g=>tx.filter(g).reduce((a,t)=>a+t.total,0);
  const kind=t=>{if(t.type!=='membership')return'';if(t.vid)return'h';const p=PKG.find(x=>x.id===t.pk);return p&&p.days>=300?'y':'b'};
  const prod=sm(t=>t.type==='pos'),hr=sm(t=>kind(t)==='h'),bl=sm(t=>kind(t)==='b'),th=sm(t=>kind(t)==='y'),mem=hr+bl+th,pos=prod;
  const cost=tx.reduce((a,t)=>a+(t.items||[]).reduce((x,i)=>x+(+i.cost||0)*i.qty,0),0);
  return{lbl,mem,pos,prod,hr,bl,th,tot:mem+pos,n:tx.length,cost,visit:new Set(S.checkins.filter(c=>f(c.date)).map(c=>c.m)).size,newm:S.members.filter(m=>m.joined&&f(m.joined)).length,prof}})}
function totalsCard(){
 const L=periodTotals(),prof=can('report.profit');
 return`<div class="card"><h2>Total Keseluruhan</h2><p class="mut" style="margin:0 0 8px">Omzet = penjualan produk + member harian + member bulanan + member tahunan (termasuk perpanjangan), tanpa transaksi yang dibatalkan. Minggu dihitung Senin sampai hari ini.</p>${tbl(['Periode','>Produk (POS)','>Member Harian','>Member Bulanan','>Member Tahunan','>Total','>Transaksi','>Pengunjung','>Member baru',...(prof?['>Keuntungan']:[])],L.map(x=>`<tr><td><b>${x.lbl}</b></td><td class="r">${rp(x.prod)}</td><td class="r">${rp(x.hr)}</td><td class="r">${rp(x.bl)}</td><td class="r">${rp(x.th)}</td><td class="r"><b>${rp(x.tot)}</b></td><td class="r">${x.n}</td><td class="r">${x.visit}</td><td class="r">${x.newm}</td>${prof?`<td class="r">${rp(x.tot-x.cost)}</td>`:''}</tr>`))}</div>`}
{const _r=P.reports;P.reports=()=>totalsCard()+_r()}
{const _d=P.dashboard;if(_d)P.dashboard=()=>{const h=_d();return can('report.view')&&S.user.role==='admin'?totalsCard()+h:h}}
