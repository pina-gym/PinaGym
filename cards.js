/* cards.js: cetak kartu member masal / terpilih ke kertas A4 (10 kartu per lembar) */
S.cs=new Set();S.cq='';S.cf='';
MENU.splice(Math.max(0,MENU.findIndex(x=>x[0]==='extend'))+1,0,['cards','Cetak Kartu Masal','member.view','card','Member']);
const cardList=()=>{const q=S.cq.toLowerCase(),f=S.cf;return S.members.filter(m=>(!q||m.name.toLowerCase().includes(q)||m.code.toLowerCase().includes(q))&&(!f||mstat(m)[0]===f))};
const cardRows=()=>{const L=cardList();return tbl(['','Kode','Nama','Paket','Berakhir','Status'],L.map(m=>`<tr><td class="ck"><input type="checkbox" data-csel="${esc(m.id)}" aria-label="Pilih ${esc(m.name)}"${S.cs.has(m.id)?' checked':''}></td><td>${m.code}</td><td>${esc(m.name)}</td><td>${esc(pkgName(m.pkg))}</td><td>${m.end}</td><td>${badge(mstat(m))}</td></tr>`),'Tidak ada member.')};
const cardSel=()=>S.members.filter(m=>S.cs.has(m.id));
const cardCount=()=>{const n=cardSel().length;return n?`<b>${n}</b> kartu dipilih (${Math.ceil(n/Card.SHEET.per)} lembar A4)`:'Centang member yang kartunya ingin dicetak.'};
P.cards=()=>{const L=cardList();
 return`<div class="note">Kartu dicetak 10 per lembar A4 (ukuran asli kartu 85,6 × 54 mm) lengkap dengan garis potong. Di jendela cetak browser Anda bisa memilih printer atau <b>Simpan sebagai PDF</b>. Atau pakai tombol <b>Simpan PDF A4</b> untuk langsung mengunduh file PDF. Atur skala <b>100%</b> / "Ukuran sebenarnya".</div>
 <div class="tb"><input id="cq" placeholder="Cari nama / kode" value="${esc(S.cq)}"><select id="cf"><option value="">Semua status</option>${['Aktif','Akan Expired','Expired','Freeze'].map(x=>`<option${S.cf===x?' selected':''}>${x}</option>`).join('')}</select></div>
 <div class="card"><div class="bulk"><span id="ccount">${cardCount()}</span><span class="pill" style="flex-wrap:wrap"><button class="btn sm ghost" data-a="csall">Pilih semua tampil (${L.length})</button><button class="btn sm ghost" data-a="csclear">Batal pilih</button><button class="btn sm" data-a="csprint">${ico('print')} Cetak A4</button><button class="btn sm ghost" data-a="cspdf">Simpan PDF A4</button></span></div><div id="clist">${cardRows()}</div></div>`};
const cardItems=()=>{const l=cardSel();return l.map(m=>({m,o:cardOpt(m)}))};
function cardSheetPrint(items){let box=document.getElementById('printrc');if(box)box.remove();box=document.createElement('div');box.id='printrc';box.className='sheet';
 const per=Card.SHEET.per;let h='';for(let i=0;i<items.length;i+=per)h+=`<div class="sh">${items.slice(i,i+per).map(it=>`<div class="sc">${Card.svg(it.m,it.o)}</div>`).join('')}</div>`;
 box.innerHTML=h;document.body.appendChild(box);
 let st=document.getElementById('prs');if(st)st.remove();st=document.createElement('style');st.id='prs';st.textContent='@media print{@page{size:A4;margin:0}}';document.head.appendChild(st);
 const done=()=>{box.remove();st.remove();removeEventListener('afterprint',done)};addEventListener('afterprint',done);
 setTimeout(()=>{try{window.print()}catch(e){done()}setTimeout(()=>{if(box.isConnected&&!/Android|iPhone|iPad/i.test(navigator.userAgent))done()},1500)},120)}
{const _ec=extraClick;extraClick=function(a,v,el){
 if(a==='csall'){cardList().forEach(m=>S.cs.add(m.id));renderView();return true}
 if(a==='csclear'){S.cs.clear();renderView();return true}
 if(a==='csprint'||a==='cspdf'){if(!can('member.view'))return true;const it=cardItems();if(!it.length){toast('Pilih member dahulu.');return true}
  if(a==='csprint'){cardSheetPrint(it);log('kartu_cetak_a4',it.length+' kartu')}
  else{Card.download(Card.sheetPdf(it),'Kartu-Member-A4-'+T0+'.pdf');log('kartu_pdf_a4',it.length+' kartu')}return true}
 return _ec.apply(this,arguments)}}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.csel){t.checked?S.cs.add(t.dataset.csel):S.cs.delete(t.dataset.csel);const c=document.getElementById('ccount');if(c)c.innerHTML=cardCount()}
 else if(t.id==='cf'){S.cf=t.value;renderView()}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='cq'){S.cq=t.value;const b=document.getElementById('clist');if(b)b.innerHTML=cardRows();if(typeof labelTables==='function')labelTables()}});
{const _m=P.members;P.members=()=>{const h=_m();return can('member.view')?h.replace('<div class="tb">','<div class="tb"><button class="btn ghost" data-a="go" data-v="cards">'+ico('card')+' Cetak kartu masal</button>'):h}}
