/* print.js: struk (ukuran kertas 57/58/80 mm), cetak ke printer thermal lewat Bluetooth (BLE), USB, Serial, atau RawBT; cetak lewat browser sebagai cadangan */
const PAPERS={57:{n:'57 mm',w:32,css:57},58:{n:'58 mm',w:32,css:58},80:{n:'80 mm',w:48,css:80}};
const paperDef=()=>PAPERS[S.settings.paper]?+S.settings.paper:58;
const paperNow=()=>PAPERS[S.rcPaper]?+S.rcPaper:paperDef();
const asc=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7e]/g,'?');
const fnum=n=>Math.round(n).toLocaleString('id-ID');
function wrapT(s,w){s=asc(s);const out=[];let cur='';s.split(/\s+/).filter(Boolean).forEach(word=>{while(word.length>w){if(cur){out.push(cur);cur=''}out.push(word.slice(0,w));word=word.slice(w)}
 if(!cur)cur=word;else if((cur+' '+word).length<=w)cur+=' '+word;else{out.push(cur);cur=word}});if(cur)out.push(cur);return out.length?out:['']}
function lr(l,r,w){l=asc(l);r=asc(r);if(l.length+r.length+1>w)l=l.slice(0,Math.max(0,w-r.length-1));return l+' '.repeat(Math.max(1,w-l.length-r.length))+r}

/* data & baris struk */
function rcData(t){const g=t.grp?S.tx.filter(x=>x.grp===t.grp):[t],mid=(g.find(x=>x.mid)||{}).mid,m=mid&&S.members.find(x=>x.id===mid);
 return{gym:S.settings.gym_name,addr:S.settings.gym_address,tel:S.settings.gym_phone,invs:g.map(x=>x.inv),dt:t.date+' '+t.time,kasir:byName(t.by),member:m?m.name+' ('+m.code+')':'',
  items:g.flatMap(x=>x.items),total:g.reduce((a,x)=>a+x.total,0),method:t.method==='cash'?'Tunai':'Non-tunai',voided:g.every(x=>x.voided)}}
function rcLines(d,w){const L=[],rule='-'.repeat(w),add=(t,a,b)=>L.push({t,a:a||'l',b:!!b});
 wrapT(d.gym,w).forEach(x=>add(x,'c',1));wrapT(d.addr,w).forEach(x=>add(x,'c'));if(d.tel)add(asc(d.tel),'c');add(rule);
 d.invs.forEach((v,i)=>add(i===0?lr(v,d.dt.slice(5),w):asc(v)));add(lr('Kasir',d.kasir,w));if(d.member)wrapT('Member: '+d.member,w).forEach(x=>add(x));add(rule);
 d.items.forEach(i=>{wrapT(i.name,w).forEach(x=>add(x));add(lr('  '+i.qty+' x '+fnum(i.price),fnum(i.qty*i.price),w))});
 add(rule);add(lr('TOTAL','Rp '+fnum(d.total),w),'l',1);add(lr('Metode',d.method,w));if(d.voided)add('*** DIBATALKAN ***','c',1);add(rule);add('Terima kasih','c');return L}
function escpos(lines){const o=[0x1b,0x40,0x1b,0x74,0];
 lines.forEach(l=>{o.push(0x1b,0x61,l.a==='c'?1:l.a==='r'?2:0,0x1b,0x45,l.b?1:0);for(const ch of asc(l.t))o.push(ch.charCodeAt(0));o.push(0x0a)});
 o.push(0x1b,0x61,0,0x1b,0x45,0,0x1b,0x64,4,0x1d,0x56,0x42,0x00);return new Uint8Array(o)}
const rcBytes=(t,pp)=>escpos(rcLines(rcData(t),PAPERS[pp||paperNow()].w));
function testLines(pp){const w=PAPERS[pp].w;const L=[{t:asc(S.settings.gym_name),a:'c',b:1},{t:'CETAK UJI PRINTER',a:'c'},{t:'Kertas '+PAPERS[pp].n+' ('+w+' kolom)',a:'c'},{t:'-'.repeat(w),a:'l'},{t:('1234567890'.repeat(5)).slice(0,w),a:'l'},{t:lr('Kiri','Kanan',w),a:'l'},{t:'Jika baris angka tidak terpotong dan teks rapi, printer siap.',a:'l'},{t:'',a:'l'}];return L}

/* ---- koneksi printer ---- */
const Prn=(()=>{
 const K='pinagym.prn',get=()=>{try{return JSON.parse(localStorage.getItem(K)||'{}')}catch(e){return{}}},set=o=>{try{localStorage.setItem(K,JSON.stringify({...get(),...o}))}catch(e){}};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const st={type:'',name:'',ready:false,err:''};let tx=null; // tx: async bytes => void
 const BTS=['000018f0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb','49535343-fe7d-4ae5-8fa9-9fafd205e455','e7810a71-73ae-499d-8c15-faa9aef0c3f2','0000ffe0-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb','000018f1-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb'];
 const sup={bt:!!navigator.bluetooth,usb:!!navigator.usb,serial:!!navigator.serial,rawbt:/Android/i.test(navigator.userAgent)};
 const ok=(type,name,fn)=>{tx=fn;st.type=type;st.name=name;st.ready=true;st.err='';set({type,name})};
 const fail=e=>{st.err=(e&&e.message)||String(e);st.ready=false;tx=null;throw e};
 async function btConnect(){try{const dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:BTS});const srv=await dev.gatt.connect();let ch=null;
   for(const s of await srv.getPrimaryServices()){for(const c of await s.getCharacteristics()){if(c.properties&&(c.properties.write||c.properties.writeWithoutResponse)){ch=c;break}}if(ch)break}
   if(!ch)throw new Error('Perangkat ini tidak punya jalur tulis (bukan printer BLE). Printer Bluetooth klasik: pakai opsi RawBT.');
   dev.addEventListener&&dev.addEventListener('gattserverdisconnected',()=>{st.ready=false;tx=null});
   ok('bt',dev.name||'Printer Bluetooth',async b=>{if(!dev.gatt.connected)await dev.gatt.connect();for(let i=0;i<b.length;i+=100){const part=b.slice(i,i+100);if(ch.properties.writeWithoutResponse&&ch.writeValueWithoutResponse)await ch.writeValueWithoutResponse(part);else await ch.writeValue(part);await sleep(25)}})}catch(e){fail(e)}}
 async function usbOpen(dev){await dev.open();if(!dev.configuration)await dev.selectConfiguration(1);let pick=null;
  for(const itf of dev.configuration.interfaces){for(const al of itf.alternates){const ep=al.endpoints.find(e=>e.direction==='out'&&e.type==='bulk');if(ep&&(!pick||al.interfaceClass===7))pick={n:itf.interfaceNumber,ep:ep.endpointNumber,a:al.alternateSetting,cls:al.interfaceClass}}}
  if(!pick)throw new Error('USB ini tidak punya jalur cetak (endpoint bulk keluar).');
  await dev.claimInterface(pick.n);if(pick.a)await dev.selectAlternateInterface(pick.n,pick.a);
  ok('usb',dev.productName||'Printer USB',async b=>{for(let i=0;i<b.length;i+=4096)await dev.transferOut(pick.ep,b.slice(i,i+4096))});set({vid:dev.vendorId,pid:dev.productId})}
 async function usbConnect(){try{const dev=await navigator.usb.requestDevice({filters:[]});await usbOpen(dev)}catch(e){fail(e)}}
 async function serOpen(port,baud){await port.open({baudRate:+baud||9600});const wr=port.writable.getWriter();ok('serial','Printer serial ('+(baud||9600)+')',async b=>{await wr.write(b)});set({baud:+baud||9600})}
 async function serConnect(baud){try{await serOpen(await navigator.serial.requestPort(),baud)}catch(e){fail(e)}}
 function rawbt(){st.type='rawbt';st.name='RawBT (Bluetooth klasik)';st.ready=true;st.err='';tx=async b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));location.href='intent:base64,'+btoa(s)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;'};set({type:'rawbt',name:st.name})}
 async function reconnect(){const s=get();if(st.ready)return true;
  try{if(s.type==='usb'&&sup.usb){const ds=await navigator.usb.getDevices();const d=ds.find(x=>x.vendorId===s.vid&&x.productId===s.pid)||ds[0];if(d){await usbOpen(d);return true}}
   else if(s.type==='serial'&&sup.serial){const ps=await navigator.serial.getPorts();if(ps[0]){await serOpen(ps[0],s.baud);return true}}
   else if(s.type==='bt'&&sup.bt&&navigator.bluetooth.getDevices){const ds=await navigator.bluetooth.getDevices();if(ds[0]){/* butuh gesture untuk watchAdvertisements; coba langsung */await btFromDevice(ds[0]);return true}}
   else if(s.type==='rawbt'&&sup.rawbt){rawbt();return true}}catch(e){}
  return false}
 async function btFromDevice(dev){const srv=await dev.gatt.connect();let ch=null;for(const s of await srv.getPrimaryServices()){for(const c of await s.getCharacteristics()){if(c.properties&&(c.properties.write||c.properties.writeWithoutResponse)){ch=c;break}}if(ch)break}
  if(!ch)throw new Error('tidak ada jalur tulis');ok('bt',dev.name||'Printer Bluetooth',async b=>{if(!dev.gatt.connected)await dev.gatt.connect();for(let i=0;i<b.length;i+=100){const part=b.slice(i,i+100);if(ch.properties.writeWithoutResponse&&ch.writeValueWithoutResponse)await ch.writeValueWithoutResponse(part);else await ch.writeValue(part);await sleep(25)}})}
 async function send(bytes){if(!st.ready&&!(await reconnect()))throw new Error('Printer belum terhubung');try{await tx(bytes)}catch(e){st.ready=false;tx=null;throw e}}
 async function disconnect(){tx=null;st.ready=false;st.type='';st.name='';set({type:'',name:''})}
 return{st,sup,get,set,btConnect,usbConnect,serConnect,rawbt,reconnect,send,disconnect}})();

/* ---- cetak ---- */
function printBrowser(t){const pp=paperNow(),d=rcData(t),L=rcLines(d,PAPERS[pp].w);
 let box=document.getElementById('printrc');if(box)box.remove();box=document.createElement('div');box.id='printrc';
 box.innerHTML='<pre>'+L.map(l=>{const pad=l.a==='c'?' '.repeat(Math.max(0,Math.floor((PAPERS[pp].w-l.t.length)/2))):'';return(l.b?'<b>':'')+esc(pad+l.t)+(l.b?'</b>':'')}).join('\n')+'</pre>';document.body.appendChild(box);
 let st=document.getElementById('prs');if(st)st.remove();st=document.createElement('style');st.id='prs';st.textContent=`@media print{@page{size:${PAPERS[pp].css}mm auto;margin:0}#printrc{width:${PAPERS[pp].css}mm}}`;document.head.appendChild(st);
 const done=()=>{box.remove();st.remove();removeEventListener('afterprint',done)};addEventListener('afterprint',done);
 setTimeout(()=>{try{window.print()}catch(e){done()}setTimeout(()=>{if(box.isConnected&&!/Android|iPhone|iPad/i.test(navigator.userAgent))done()},1500)},60)}
async function printReceipt(t,mode){
 if(mode==='browser'){printBrowser(t);return}
 try{await Prn.send(rcBytes(t));toast('Struk dikirim ke printer.');log('cetak_struk',t.inv)}
 catch(e){toast('Gagal cetak: '+((e&&e.message)||e)+'. Periksa koneksi printer.');showPrinterPanel('Printer belum terhubung atau gagal. Hubungkan printer lalu cetak lagi.')}}

/* ---- panel printer ---- */
function showPrinterPanel(msg){const s=Prn.st,sp=Prn.sup,b=Prn.get(),pp=paperDef();
 modal(`<div id="prpanel"><h2 style="margin:0 0 8px">Printer struk</h2>${msg?`<div class="note" style="background:var(--warn-bg);color:var(--warn)">${esc(msg)}</div>`:''}
 <p>Status: ${s.ready?badge(['Terhubung: '+esc(s.name),'b-ok']):badge(['Belum terhubung','b-warn'])}${s.err?`<br><small class="mut">${esc(s.err)}</small>`:''}</p>
 <div class="pill" style="flex-wrap:wrap;gap:8px">
  <button class="btn" data-a="prnbt"${sp.bt?'':' disabled'}>Bluetooth (BLE)</button>
  <button class="btn" data-a="prnusb"${sp.usb?'':' disabled'}>USB</button>
  <button class="btn" data-a="prnser"${sp.serial?'':' disabled'}>Serial / COM</button>
  <button class="btn ghost" data-a="prnraw"${sp.rawbt?'':' disabled'}>Bluetooth klasik (RawBT)</button></div>
 <p class="mut" style="margin:8px 0">${sp.bt||sp.usb||sp.serial?'':'Browser ini tidak mendukung koneksi langsung ke printer (Safari/iPhone tidak bisa). Pakai Chrome atau Edge di Android/komputer, atau cetak lewat browser. '}Printer Bluetooth murah umumnya <b>Bluetooth klasik</b>: pakai tombol RawBT (pasang aplikasi RawBT di Android, pasangkan printer di sana). Printer BLE dan USB tersambung langsung.</p>
 <label>Kecepatan serial (baud)<select data-ch="prnbaud">${[9600,19200,38400,57600,115200].map(x=>`<option${(b.baud||9600)===x?' selected':''}>${x}</option>`).join('')}</select></label>
 <label>Ukuran kertas bawaan<select data-ch="prnpaper"${can('settings.manage')?'':' disabled'}>${Object.entries(PAPERS).map(([k,v])=>`<option value="${k}"${+k===pp?' selected':''}>${v.n}</option>`).join('')}</select></label>
 <label class="pm"><input type="checkbox" data-ch="prnauto"${(S.settings.auto_print==1)?' checked':''}${can('settings.manage')?'':' disabled'}><span>Cetak struk otomatis setelah pembayaran (jika printer terhubung)</span></label>
 <p class="pill" style="flex-wrap:wrap;justify-content:flex-end;margin-bottom:0"><button class="btn ghost" data-a="prntest">Cetak uji</button>${s.ready?'<button class="btn red" data-a="prndisc">Putuskan</button>':''}<button class="btn ghost" data-a="mclose">Tutup</button></p></div>`)}
async function prnDo(fn,okMsg){try{await fn();toast(okMsg)}catch(e){if(e&&(e.name==='NotFoundError'||e.name==='AbortError'))toast('Pemilihan perangkat dibatalkan.');else toast('Gagal: '+((e&&e.message)||e))}if(document.getElementById('prpanel'))showPrinterPanel()}

/* ---- hook struk ---- */
{const _rc=receipt;receipt=function(t){_rc.apply(this,arguments);S.rcId=t.id;const m=document.querySelector('#modal .modal');if(!m)return;
  const pp=paperNow(),pr=m.querySelector('p:last-of-type');
  const html=`<div class="rcctl" style="margin-top:12px"><div class="pill" style="flex-wrap:wrap;align-items:center"><span class="mut">Kertas:</span>${Object.entries(PAPERS).map(([k,v])=>`<button class="btn sm ${+k===pp?'':'ghost'}" data-a="rcpaper" data-v="${k}" aria-pressed="${+k===pp}">${v.n}</button>`).join('')}</div>
   <div class="pill" style="flex-wrap:wrap;margin-top:8px"><button class="btn" data-a="rcprint">${ico('print')} Cetak ke printer</button><button class="btn ghost" data-a="rcbrowser">Cetak lewat browser</button><button class="btn ghost" data-a="prnpanel">${Prn.st.ready?esc(Prn.st.name):'Atur printer'}</button></div></div>`;
  if(pr)pr.insertAdjacentHTML('beforebegin',html)}}
{const _ecP=extraClick;extraClick=function(a,v,el){
 const tx=()=>S.tx.find(x=>x.id===S.rcId);
 if(a==='rcpaper'){S.rcPaper=v;const t=tx();if(t)receipt(t);return true}
 if(a==='rcprint'){const t=tx();if(t)printReceipt(t,'printer');return true}
 if(a==='rcbrowser'){const t=tx();if(t)printBrowser(t);return true}
 if(a==='prnpanel'){showPrinterPanel();return true}
 if(a==='prnbt'){prnDo(()=>Prn.btConnect(),'Printer Bluetooth terhubung.');return true}
 if(a==='prnusb'){prnDo(()=>Prn.usbConnect(),'Printer USB terhubung.');return true}
 if(a==='prnser'){prnDo(()=>Prn.serConnect(Prn.get().baud),'Printer serial terhubung.');return true}
 if(a==='prnraw'){Prn.rawbt();toast('RawBT dipilih. Pastikan aplikasi RawBT terpasang.');showPrinterPanel();return true}
 if(a==='prndisc'){Prn.disconnect().then(()=>showPrinterPanel());return true}
 if(a==='prntest'){prnDo(()=>Prn.send(escpos(testLines(paperDef()))),'Cetak uji dikirim.');return true}
 return _ecP.apply(this,arguments)}}
document.addEventListener('change',e=>{const t=e.target,c=t.dataset&&t.dataset.ch;
 if(c==='prnbaud')Prn.set({baud:+t.value});
 else if(c==='prnpaper'&&can('settings.manage')){S.settings.paper=+t.value;log('kertas_struk',t.value);persist();toast('Kertas bawaan: '+PAPERS[t.value].n)}
 else if(c==='prnauto'&&can('settings.manage')){S.settings.auto_print=t.checked?1:0;persist()}});
/* Pengaturan Sistem: kartu printer */
{const _ps=P.system;P.system=()=>_ps()+`<div class="card"><h2>Printer &amp; kertas struk</h2><p class="mut">Kertas bawaan: <b>${PAPERS[paperDef()].n}</b>. ${Prn.st.ready?'Printer: <b>'+esc(Prn.st.name)+'</b>.':'Printer belum terhubung di perangkat ini.'} Koneksi printer tersimpan per perangkat.</p><button class="btn" data-a="prnpanel">${ico('print')} Atur printer &amp; kertas</button></div>`}
/* cetak otomatis setelah bayar di POS */
{const _pp=posPay;posPay=function(){const n=S.tx.length;_pp.apply(this,arguments);if(S.settings.auto_print==1&&Prn.st.ready&&S.tx.length>n){const t=S.tx[S.tx.length-1],f=t.grp?S.tx.find(x=>x.grp===t.grp):t;printReceipt(f,'printer')}}}
addEventListener('DOMContentLoaded',()=>setTimeout(()=>Prn.reconnect().catch(()=>{}),2000));
