/* xlsx.js: export riwayat transaksi ke Excel (.xlsx) tanpa library: ZIP tanpa kompresi + XML SpreadsheetML. */
const Xlsx=(()=>{
const te=new TextEncoder();
const CT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const xe=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const col=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
/* sel: angka | teks | {v,b:1 tebal,n:1 angka rupiah,h:1 judul kolom} */
function sheetXml(rows,widths){
 const R=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((c,ci)=>{const o=c!==null&&typeof c==='object'?c:{v:c},ref=col(ci)+(ri+1),v=o.v;
  const s=o.h?1:o.b&&o.n?3:o.b?2:o.n?4:0;
  if(v===''||v==null)return s?`<c r="${ref}" s="${s}"/>`:'';
  return typeof v==='number'?`<c r="${ref}"${s?` s="${s}"`:''}><v>${v}</v></c>`:`<c r="${ref}"${s?` s="${s}"`:''} t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`}).join('')+'</row>').join('');
 return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${rows.length>1?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':''}</sheetView></sheetViews><cols>${(widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${R}</sheetData></worksheet>`}
const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function zip(files){const parts=[],cen=[];let off=0;
 files.forEach(([name,txt])=>{const n=te.encode(name),d=te.encode(txt),c=crc(d);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,0,true);h.setUint16(12,0x21,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,n.length,true);h.setUint16(28,0,true);
  parts.push(new Uint8Array(h.buffer),n,d);
  const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(10,0,true);e.setUint16(12,0,true);e.setUint16(14,0x21,true);e.setUint32(16,c,true);e.setUint32(20,d.length,true);e.setUint32(24,d.length,true);e.setUint16(28,n.length,true);e.setUint32(42,off,true);
  cen.push(new Uint8Array(e.buffer),n);off+=30+n.length+d.length});
 const cl=cen.reduce((a,x)=>a+x.length,0),z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,files.length,true);z.setUint16(10,files.length,true);z.setUint32(12,cl,true);z.setUint32(16,off,true);
 return new Blob([...parts,...cen,new Uint8Array(z.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
/* sheets: [{name,rows,widths}] */
function build(sheets){const f=[];
 f.push(['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`]);
 f.push(['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
 f.push(['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xe(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`]);
 f.push(['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
 f.push(['xl/styles.xml',STYLES]);
 sheets.forEach((s,i)=>f.push([`xl/worksheets/sheet${i+1}.xml`,sheetXml(s.rows,s.widths)]));
 return zip(f)}
return{build,crc}})();

/* ---------- laporan transaksi: pilih periode lalu unduh ---------- */
const mondayOf=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
function xRange(){const m=S.xm||'month',f=S.xf,t=S.xt;
 if(m==='today')return[T0,T0];
 if(m==='week'){const a=mondayOf(TODAY);return[iso(a),iso(addD(a,6))]}
 if(m==='7d')return[iso(addD(TODAY,-6)),T0];
 if(m==='lastmonth'){const a=new Date(TODAY.getFullYear(),TODAY.getMonth()-1,1),b=new Date(TODAY.getFullYear(),TODAY.getMonth(),0);return[iso(a),iso(b)]}
 if(m==='custom'&&f&&t)return f<=t?[f,t]:[t,f];
 const a=new Date(TODAY.getFullYear(),TODAY.getMonth(),1),b=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0);return[iso(a),iso(b)]}
const xTx=()=>{const[a,b]=xRange();return myTx().filter(t=>t.date>=a&&t.date<=b).sort((p,q)=>(p.date+p.time)<(q.date+q.time)?-1:1)};
const TJ={membership:'Membership',pos:'POS'};
function xSheets(){const tx=xTx(),[a,b]=xRange(),prof=can('report.profit'),ok=tx.filter(t=>!t.voided);
 const days={};for(let d=new Date(a+'T00:00:00');iso(d)<=b;d=addD(d,1))days[iso(d)]={n:0,mem:0,pos:0,cash:0,non:0};
 ok.forEach(t=>{const o=days[t.date];if(!o)return;o.n++;o[t.type==='membership'?'mem':'pos']+=t.total;o[t.method==='cash'?'cash':'non']+=t.total});
 const H=a=>a.map(v=>({v,h:1})),sum=k=>Object.values(days).reduce((x,o)=>x+o[k],0);
 const rows1=[H(['Tanggal','Jumlah transaksi','Membership (Rp)','POS (Rp)','Total (Rp)','Tunai (Rp)','Non-tunai (Rp)'])];
 Object.entries(days).forEach(([d,o])=>rows1.push([d,o.n,{v:o.mem,n:1},{v:o.pos,n:1},{v:o.mem+o.pos,n:1},{v:o.cash,n:1},{v:o.non,n:1}]));
 rows1.push([{v:'TOTAL',b:1},{v:sum('n'),b:1},{v:sum('mem'),b:1,n:1},{v:sum('pos'),b:1,n:1},{v:sum('mem')+sum('pos'),b:1,n:1},{v:sum('cash'),b:1,n:1},{v:sum('non'),b:1,n:1}]);
 const rows2=[H(['Invoice','Tanggal','Jam','Jenis','Kasir','Metode','Member','Total (Rp)','Status'])];
 tx.forEach(t=>{const m=t.mid?M(t.mid):null;rows2.push([t.inv,t.date,t.time,TJ[t.type]||t.type,byName(t.by),t.method==='cash'?'Tunai':'Non-tunai',m?m.name+' ('+m.code+')':'',{v:t.total,n:1},t.voided?'Batal':'Sah'])});
 const rows3=[H(['Invoice','Tanggal','Item','Qty','Harga (Rp)','Subtotal (Rp)',...(prof?['Modal (Rp)','Laba (Rp)']:[])])];
 ok.forEach(t=>t.items.forEach(i=>{const st=i.qty*i.price;rows3.push([t.inv,t.date,i.name,i.qty,{v:i.price,n:1},{v:st,n:1},...(prof?[{v:i.cost*i.qty,n:1},{v:st-i.cost*i.qty,n:1}]:[])])}));
 return[{name:'Ringkasan harian',rows:rows1,widths:[13,18,18,14,14,14,16]},{name:'Transaksi',rows:rows2,widths:[20,12,8,13,18,12,28,14,9]},{name:'Item terjual',rows:rows3,widths:[20,12,30,7,14,15,14,14]}]}
function xExport(){const[a,b]=xRange(),bl=Xlsx.build(xSheets());Card.download(bl,'Transaksi-'+a+(a===b?'':'_sd_'+b)+'.xlsx');log('export_excel',a+' s/d '+b)}
{const _pt=P.transactions;
 P.transactions=()=>{const[a,b]=xRange(),n=xTx().length,m=S.xm||'month',ex=can('transaction.export');
  const box=ex?`<div class="card"><h2>Export ke Excel</h2><div class="tb"><select data-ch="xm" aria-label="Periode">${[['today','Hari ini'],['week','Minggu ini (Sen-Min)'],['7d','7 hari terakhir'],['month','Bulan ini'],['lastmonth','Bulan lalu'],['custom','Pilih tanggal']].map(([k,v])=>`<option value="${k}"${m===k?' selected':''}>${v}</option>`).join('')}</select>${m==='custom'?`<input type="date" data-ch="xf" value="${esc(S.xf||a)}" aria-label="Dari"><input type="date" data-ch="xt" value="${esc(S.xt||b)}" aria-label="Sampai">`:''}<button class="btn" data-a="xexport">${ico('receipt')} Unduh Excel</button></div><p class="mut">Periode ${a}${a===b?'':' s/d '+b}: <b>${n}</b> transaksi. Berisi sheet ringkasan harian, daftar transaksi, dan item terjual.</p></div>`:'';
  return box+_pt()};
 const _ecX=extraClick;extraClick=function(a,v,el){if(a==='xexport'){if(!can('transaction.export'))return true;if(!xTx().length){toast('Tidak ada transaksi pada periode ini.');return true}xExport();return true}return _ecX.apply(this,arguments)};
 document.addEventListener('change',e=>{const t=e.target,c=t.dataset&&t.dataset.ch;if(c==='xm'){S.xm=t.value;renderView()}else if(c==='xf'||c==='xt'){S[c]=t.value;renderView()}})}
