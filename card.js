/* Kartu member: tampilan, cetak, PDF (dibuat langsung di browser, tanpa library), kirim ke WhatsApp. */
const Card=(()=>{
const W=856,H=540; // piksel; rasio kartu CR80 85,6 x 54 mm
const lat=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7e]/g,'?');
const xe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function svg(m,o){ // o: {gym,pkg,end,status}
 const q=QR.matrix(m.code,'M'),n=q.length,cell=Math.floor(250/(n+2)),qs=cell*(n+2),qx=W-qs-56,qy=H-qs-56;
 let mods='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q[r][c])mods+=`M${qx+(c+1)*cell} ${qy+(r+1)*cell}h${cell}v${cell}h-${cell}z`;
 const nm=xe(m.name.length>26?m.name.slice(0,25)+'…':m.name);
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="mcard" role="img" aria-label="Kartu member ${xe(m.name)}">
<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="34" fill="url(#cg)"/><rect x="0" y="0" width="14" height="${H}" fill="#f59e0b"/>
<text x="56" y="92" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="700" fill="#fff">${xe(o.gym)}</text>
<text x="56" y="132" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#94a3b8" letter-spacing="3">KARTU MEMBER</text>
<text x="56" y="268" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700" fill="#fff">${nm}</text>
<text x="56" y="318" font-family="Courier New,monospace" font-size="38" font-weight="700" fill="#f59e0b">${xe(m.code)}</text>
<text x="56" y="400" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#94a3b8">PAKET</text><text x="56" y="432" font-family="Arial,Helvetica,sans-serif" font-size="30" fill="#fff">${xe(o.pkg)}</text>
<text x="300" y="400" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#94a3b8">BERLAKU S/D</text><text x="300" y="432" font-family="Arial,Helvetica,sans-serif" font-size="30" fill="#fff">${xe(o.end)}</text>
<rect x="${qx}" y="${qy}" width="${qs}" height="${qs}" rx="12" fill="#fff"/><path d="${mods}" fill="#0f172a"/></svg>`}

/* PDF satu halaman 85,6 x 54 mm. Font bawaan PDF (Helvetica). */
function pdf(m,o){
 const k=72/25.4,pw=85.6*k,ph=54*k,s=pw/W; // skala piksel -> poin
 const X=x=>(x*s).toFixed(2),Y=y=>((H-y)*s).toFixed(2),L=v=>(v*s).toFixed(2);
 const q=QR.matrix(m.code,'M'),n=q.length,cell=Math.floor(250/(n+2)),qs=cell*(n+2),qx=W-qs-56,qy=H-qs-56;
 let c='';
 c+=`0.059 0.090 0.165 rg 0 0 ${pw.toFixed(2)} ${ph.toFixed(2)} re f\n0.961 0.620 0.043 rg 0 0 ${L(14)} ${ph.toFixed(2)} re f\n`;
 const T=(x,y,size,font,rgb,t)=>`BT /${font} ${(size*s).toFixed(2)} Tf ${rgb} rg ${X(x)} ${Y(y)} Td (${lat(t).replace(/[\\()]/g,'\\$&')}) Tj ET\n`;
 const nm=m.name.length>26?m.name.slice(0,25):m.name;
 c+=T(56,92,46,'F2','1 1 1',o.gym)+T(56,132,22,'F1','0.58 0.64 0.72','KARTU MEMBER')+T(56,268,44,'F2','1 1 1',nm)+T(56,318,38,'F2','0.961 0.620 0.043',m.code)
  +T(56,400,22,'F1','0.58 0.64 0.72','PAKET')+T(56,432,30,'F1','1 1 1',o.pkg)+T(300,400,22,'F1','0.58 0.64 0.72','BERLAKU S/D')+T(300,432,30,'F1','1 1 1',o.end);
 c+=`1 1 1 rg ${X(qx)} ${Y(qy+qs)} ${L(qs)} ${L(qs)} re f\n0.059 0.090 0.165 rg\n`;
 for(let r=0;r<n;r++)for(let cc=0;cc<n;cc++)if(q[r][cc])c+=`${X(qx+(cc+1)*cell)} ${Y(qy+(r+2)*cell)} ${L(cell)} ${L(cell)} re f\n`;
 const objs=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>',
  `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}]/Contents 4 0 R/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>>>`,
  `<</Length ${c.length}>>\nstream\n${c}endstream`,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>','<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>'];
 let out='%PDF-1.4\n',off=[];objs.forEach((b,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${b}\nendobj\n`});
 const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${objs.length+1}/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`;
 const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;
 return new Blob([u],{type:'application/pdf'})}

function print(m,o){
 const d=document.createElement('div');d.id='printcard';d.innerHTML=svg(m,o);document.body.appendChild(d);
 const done=()=>{d.remove();removeEventListener('afterprint',done)};addEventListener('afterprint',done);
 setTimeout(()=>{try{window.print()}catch(e){done()}setTimeout(()=>{if(d.isConnected&&!/Android|iPhone|iPad/i.test(navigator.userAgent))done()},1000)},60)}

function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}

/* Kirim PDF: lembar bagikan perangkat (pilih WhatsApp lalu kontak). Di komputer: unduh PDF dan buka chat nomor member. */
async function share(m,o,text,waUrl){
 const b=pdf(m,o),name='Kartu-'+m.code+'.pdf',f=new File([b],name,{type:'application/pdf'});
 try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text,title:'Kartu Member '+o.gym});return'shared'}}
 catch(e){if(e&&e.name==='AbortError')return'cancel'}
 download(b,name);if(waUrl)window.open(waUrl,'_blank','noopener');return'download'}

return{svg,pdf,print,download,share}})();
