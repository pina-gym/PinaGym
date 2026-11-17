/* scan.js: QR check-in di latar belakang (scanner USB/Bluetooth mode keyboard, scanner serial, kamera) + pop-up di semua menu */
const canScan=()=>!!S.user&&can('attendance.checkin');
const sget=()=>{try{return JSON.parse(localStorage.getItem('pinagym.scan')||'{}')}catch(e){return{}}};
const sset=o=>{try{localStorage.setItem('pinagym.scan',JSON.stringify({...sget(),...o}))}catch(e){}};

/* ---- logika check-in (dipakai semua sumber) ---- */
function checkinCode(raw){
 const mm=/GYM\d+/i.exec(String(raw||'')),code=(mm?mm[0]:String(raw||'').trim()).toUpperCase();
 const m=S.members.find(x=>x.code===code);
 if(!m)return{st:'unknown',code};
 const s=mstat(m)[0];
 if(s==='Freeze')return{st:'freeze',m};
 if(s==='Expired')return{st:'expired',m,left:daysLeft(m)};
 const soon=s==='Akan Expired',left=daysLeft(m),ci=S.checkins.find(c=>c.date===T0&&c.m===m.id);
 if(ci)return{st:'dup',m,soon,left,time:ci.time};
 const cin={id:uid(),date:T0,time:hhmm(),m:m.id};S.checkins.push(cin);log('checkin',m.code);
 const tr=typeof ptSession==='function'?ptSession(m,cin.id):null;persist();
 return{st:'in',m,soon,left,tr}}

/* ---- bunyi ---- */
let AC=null;
function beep(kind){if(sget().mute)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const seq=kind==='ok'?[[880,.11]]:kind==='warn'?[[660,.1],[660,.1]]:[[220,.35]];let t=AC.currentTime;
 seq.forEach(([f,d])=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.type='sine';g.gain.value=.12;o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d);t+=d+.07})}catch(e){}}

/* ---- pop-up ---- */
let ciTimer=0;
const CIST={in:['ok','Selamat datang','ok'],dup:['info','Sudah check-in hari ini','ok'],freeze:['gray','Membership di-FREEZE. Belum boleh masuk','bad'],expired:['err','Membership TIDAK AKTIF. Belum boleh masuk','bad'],unknown:['err','Kode tidak dikenal','bad']};
function showCI(r){
 let [cls,title,snd]=CIST[r.st];if((r.st==='in'||r.st==='dup')&&r.soon){cls='warn';snd='warn';title=r.st==='in'?'Silakan masuk. Masa aktif hampir habis':'Sudah check-in. Masa aktif hampir habis'}
 beep(snd);
 const m=r.m;let b='';
 if(m)b=`<div class="ci-n">${esc(m.name)}</div><div class="mut">${esc(m.code)} · ${esc(pkgName(m.pkg))}</div><div>Berlaku s/d <b>${m.end}</b>${r.st==='expired'?` <span class="mut">(sudah berakhir ${-r.left} hari)</span>`:r.left>=0&&r.st!=='freeze'?` <span class="mut">(${r.left===0?'berakhir hari ini':r.left+' hari lagi'})</span>`:''}</div>`;
 else b=`<div class="ci-n">${esc(r.code||'')}</div><div class="mut">Tidak ada member dengan kode ini.</div>`;
 if(r.tr)b+=`<div>Trainer: <b>${esc(r.tr.t.name)}</b> · sesi ke-${r.tr.used}${r.tr.max?' dari '+r.tr.max:''}</div>`+(r.tr.max&&r.tr.used>r.tr.max?'<div class="ci-w">Kuota sesi trainer sudah habis. Tawarkan perpanjangan paket.</div>':'');
 if(r.st==='dup')b+=`<div class="mut">Check-in pertama hari ini pukul ${r.time}.</div>`;
 if(r.soon)b+=`<div class="ci-w">Masa aktif tinggal ${r.left} hari. Tawarkan perpanjangan.</div>`;
 const posOk=can('pos.access'),btn=[];
 if(m&&(r.st==='in'||r.st==='dup')&&posOk)btn.push(`<button class="btn" data-a="cipos" data-v="${m.id}">${ico('cart')} Tambah produk</button>`);
 if(m&&(r.st==='in'||r.st==='dup')&&r.soon&&posOk)btn.push(`<button class="btn ghost" data-a="cipos" data-v="${m.id}" data-x="1">Perpanjang</button>`);
 if(m&&r.st==='expired'&&posOk)btn.push(`<button class="btn" data-a="cipos" data-v="${m.id}" data-x="1">Perpanjang di POS</button>`);
 if(m&&r.st==='freeze'&&can('membership.freeze'))btn.push(`<button class="btn" data-a="ciunfreeze" data-v="${m.id}">Aktifkan kembali</button>`);
 btn.push(`<button class="btn ghost" data-a="ciclose">${r.st==='in'||r.st==='dup'?'Langsung masuk':'Tutup'}</button>`);
 let el=document.getElementById('ci');if(!el){el=document.createElement('div');el.id='ci';document.body.appendChild(el)}
 el.className='ci ci-'+cls;el.setAttribute('role','alertdialog');el.setAttribute('aria-live','assertive');
 el.innerHTML=`<div class="ci-h"><b>${title}</b><button class="ci-x" data-a="ciclose" aria-label="Tutup">×</button></div><div class="ci-b">${b}</div><div class="ci-f">${btn.join('')}</div>`;
 clearTimeout(ciTimer);ciTimer=setTimeout(closeCI,r.st==='in'?25000:40000)}
function closeCI(){clearTimeout(ciTimer);const el=document.getElementById('ci');if(el)el.remove()}

let lastScan={code:'',t:0,src:''};
function doScan(raw,src){
 if(!canScan())return false;
 const code=String(raw||'').trim();if(!code)return false;
 const now=Date.now();if(src==='camera'&&code.toUpperCase()===lastScan.code&&now-lastScan.t<4000)return false; // kamera membaca QR yang sama berulang
 lastScan={code:code.toUpperCase(),t:now,src};S.lastScan={code:code.toUpperCase(),src,at:hhmm()};
 const r=checkinCode(code);showCI(r);
 if(S.page==='checkin'||S.page==='visits'||S.page==='dashboard'||S.page==='tv')renderView();
 return true}

/* ---- scanner keyboard (USB atau Bluetooth HID) ---- */
let buf='',gaps=[],lastT=0,idleT=0;
const fastOK=()=>buf.length>=4&&gaps.length>=3&&gaps.every(g=>g<=140)&&gaps.reduce((a,b)=>a+b,0)/gaps.length<=70;
function finish(e,tgt){const code=buf,ok=fastOK()&&/GYM\d+/i.test(code);buf='';gaps=[];clearTimeout(idleT);
 if(!ok)return false;
 if(tgt&&(tgt.tagName==='INPUT'||tgt.tagName==='TEXTAREA')&&typeof tgt.value==='string'&&tgt.type!=='checkbox'){tgt.value=tgt.value.replace(code,'');tgt.dispatchEvent(new Event('input',{bubbles:true}))}
 if(e){e.preventDefault();e.stopPropagation()}
 doScan(code,'keyboard');return true}
addEventListener('keydown',e=>{
 if(!canScan()||e.ctrlKey||e.metaKey||e.altKey)return;
 const t=performance.now();
 if(e.key==='Enter'||e.key==='Tab'){finish(e,e.target);return}
 if(e.key.length!==1)return;
 if(t-lastT>200){buf='';gaps=[]}else gaps.push(t-lastT);
 buf+=e.key;lastT=t;
 clearTimeout(idleT);idleT=setTimeout(()=>{if(/^GYM\d+$/i.test(buf))finish(null,document.activeElement);else{buf='';gaps=[]}},160)},true);

/* ---- scanner serial (USB COM / Bluetooth serial) ---- */
let ser={port:null,on:false,name:''};
async function serRead(port){
 try{const dec=new TextDecoderStream(),done=port.readable.pipeTo(dec.writable).catch(()=>{}),rd=dec.readable.getReader();let acc='';
  ser.rd=rd;for(;;){const{value,done:d}=await rd.read();if(d)break;acc+=value;let i;while((i=acc.search(/[\r\n]/))>=0){const line=acc.slice(0,i).trim();acc=acc.slice(i+1);if(line)doScan(line,'serial')}
   if(acc.length>=7&&/^GYM\d+$/i.test(acc.trim())&&!/[\r\n]/.test(acc)){/* tanpa akhiran baris */setTimeout(()=>{if(acc.trim()){doScan(acc.trim(),'serial');acc=''}},200)}}
 }catch(e){}
 ser.on=false;ser.port=null;uiRefresh()}
async function serOpen(port){await port.open({baudRate:+(sget().baud||9600)});ser={port,on:true,name:(port.getInfo&&JSON.stringify(port.getInfo()))||'serial'};serRead(port);uiRefresh()}
async function serConnect(){if(!('serial'in navigator)){toast('Browser ini tidak mendukung scanner serial. Pakai scanner mode keyboard atau kamera.');return}
 try{const p=await navigator.serial.requestPort();await serOpen(p);toast('Scanner serial terhubung.')}catch(e){if(e&&e.name!=='NotFoundError')toast('Gagal menghubungkan: '+(e.message||e))}}
async function serDisc(){try{if(ser.rd)await ser.rd.cancel();if(ser.port)await ser.port.close()}catch(e){}ser={port:null,on:false,name:''};uiRefresh()}
async function serAuto(){try{if('serial'in navigator){const ps=await navigator.serial.getPorts();if(ps[0]&&!ser.on)await serOpen(ps[0])}}catch(e){}}

/* ---- kamera ---- */
const cam={on:false,stream:null,timer:0,det:null,canvas:null,err:''};
async function loadJsQR(){if(window.jsQR)return true;return new Promise(r=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';s.onload=()=>r(!!window.jsQR);s.onerror=()=>r(false);document.head.appendChild(s)})}
/* jendela kamera: bisa digeser ke mana saja dan dikecilkan; posisi diingat */
function campInit(box){const K='pinagym.camp';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
 const place=()=>{box.classList.toggle('min',!!st.min);if(st.x!=null){const x=Math.min(Math.max(0,st.x),Math.max(0,innerWidth-box.offsetWidth)),y=Math.min(Math.max(0,st.y),Math.max(0,innerHeight-box.offsetHeight));box.style.left=x+'px';box.style.top=y+'px';box.style.right='auto';box.style.bottom='auto'}};
 box.querySelector('.ci-m').onclick=e=>{e.stopPropagation();st.min=true;save();place()};
 let d=null;
 box.addEventListener('pointerdown',e=>{if(e.target.closest('.ci-x')||(e.target.closest('.ci-m')&&!box.classList.contains('min')))return;const r=box.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,moved:false};try{box.setPointerCapture(e.pointerId)}catch(x){}});
 box.addEventListener('pointermove',e=>{if(!d)return;if(Math.abs(e.clientX-d.sx)+Math.abs(e.clientY-d.sy)>5)d.moved=true;if(!d.moved)return;st.x=e.clientX-d.dx;st.y=e.clientY-d.dy;place()});
 box.addEventListener('pointerup',()=>{if(d&&d.moved)save();else if(d&&box.classList.contains('min')){st.min=false;save();place()}d=null});
 addEventListener('resize',place);place()}
async function camStart(){
 if(cam.on)return true;cam.err='';
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){cam.err='Browser ini tidak bisa mengakses kamera (butuh HTTPS).';uiRefresh();return false}
 try{cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:sget().facing||'environment'},width:{ideal:1280}},audio:false})}
 catch(e){cam.err='Kamera ditolak atau tidak ada: '+(e.message||e.name);uiRefresh();return false}
 if('BarcodeDetector' in window){try{cam.det=new BarcodeDetector({formats:['qr_code']})}catch(e){cam.det=null}}
 if(!cam.det&&!(await loadJsQR())){cam.err='Browser tidak punya pembaca QR bawaan dan pustaka cadangan gagal dimuat (butuh internet sekali). Pakai scanner USB/Bluetooth.';camStop();uiRefresh();return false}
 let box=document.getElementById('camp');if(!box){box=document.createElement('div');box.id='camp';box.innerHTML='<video playsinline muted autoplay></video><button class="ci-x" data-a="camoff" aria-label="Matikan kamera">×</button><button class="ci-m" type="button" aria-label="Kecilkan kamera">–</button><small>Kamera check-in aktif · geser untuk memindah</small>';document.body.appendChild(box);campInit(box)}
 const v=box.querySelector('video');v.srcObject=cam.stream;await v.play().catch(()=>{});cam.on=true;sset({cam:1});
 cam.timer=setInterval(async()=>{if(!cam.on||v.readyState<2||!canScan())return;
  try{if(cam.det){const r=await cam.det.detect(v);if(r&&r[0]&&r[0].rawValue)doScan(r[0].rawValue,'camera')}
   else{cam.canvas=cam.canvas||document.createElement('canvas');const w=v.videoWidth,h=v.videoHeight;if(!w)return;cam.canvas.width=w;cam.canvas.height=h;const c=cam.canvas.getContext('2d',{willReadFrequently:true});c.drawImage(v,0,0,w,h);const q=window.jsQR(c.getImageData(0,0,w,h).data,w,h);if(q&&q.data)doScan(q.data,'camera')}}catch(e){}},300);
 uiRefresh();return true}
function camStop(keepPref){clearInterval(cam.timer);if(cam.stream)cam.stream.getTracks().forEach(t=>t.stop());cam.stream=null;cam.on=false;const b=document.getElementById('camp');if(b)b.remove();if(!keepPref)sset({cam:0});uiRefresh()}

/* ---- panel scanner ---- */
function uiRefresh(){if(document.getElementById('scpanel'))showScanPanel();if(S.user)try{renderView()}catch(e){}}
function showScanPanel(){
 const sp=sget(),L=S.lastScan;
 modal(`<div id="scpanel"><h2 style="margin:0 0 8px">Scanner QR Check-in</h2>
 <p class="mut">Check-in berjalan di latar belakang. Scan QR kartu member dari menu mana pun, pop-up hasilnya muncul langsung.</p>
 <div class="card" style="margin:0 0 10px"><b>Scanner USB / Bluetooth (mode keyboard)</b> ${badge(['Siap','b-ok'])}
  <p class="mut" style="margin:6px 0 0">Colokkan scanner USB, atau pasangkan scanner Bluetooth lewat pengaturan Bluetooth tablet (pilih mode HID/keyboard). Tidak perlu tombol lain: kode yang di-scan otomatis dikenali di halaman mana pun.</p></div>
 <div class="card" style="margin:0 0 10px"><b>Scanner serial (USB COM / Bluetooth serial)</b> ${ser.on?badge(['Terhubung','b-ok']):badge(['Tidak terhubung','b-gray'])}
  <p class="mut" style="margin:6px 0">Untuk scanner yang bukan mode keyboard. Butuh Chrome/Edge ${'serial'in navigator?'':'(browser ini tidak mendukung)'}.</p>
  <p class="pill">${ser.on?'<button class="btn sm red" data-a="serdisc">Putuskan</button>':'<button class="btn sm" data-a="serconn"'+('serial'in navigator?'':' disabled')+'>Hubungkan scanner serial</button>'}</p></div>
 <div class="card" style="margin:0 0 10px"><b>Kamera</b> ${cam.on?badge(['Aktif','b-ok']):badge(['Mati','b-gray'])}
  ${cam.err?`<div class="note" style="background:var(--err-bg);color:var(--err);margin:6px 0">${esc(cam.err)}</div>`:''}
  <p class="pill" style="margin:6px 0">${cam.on?'<button class="btn sm red" data-a="camoff">Matikan kamera</button>':'<button class="btn sm" data-a="camon">Nyalakan kamera</button>'}<select data-ch="camface" aria-label="Kamera"><option value="environment"${sp.facing!=='user'?' selected':''}>Kamera belakang</option><option value="user"${sp.facing==='user'?' selected':''}>Kamera depan</option></select></p>
  <p class="mut" style="margin:0">Kamera tetap aktif di semua menu selama aplikasi terbuka. ${'BarcodeDetector'in window?'Pembaca QR bawaan browser dipakai.':'Browser ini tidak punya pembaca QR bawaan: pustaka jsQR dimuat dari internet saat pertama dipakai.'}</p></div>
 <label class="pm"><input type="checkbox" data-ch="scanmute"${sp.mute?' checked':''}><span>Matikan bunyi bip</span></label>
 <p class="mut">Scan terakhir: ${L?`<b>${esc(L.code)}</b> lewat ${L.src==='keyboard'?'scanner keyboard':L.src==='camera'?'kamera':L.src==='serial'?'scanner serial':'ketik manual'} pukul ${L.at}`:'belum ada'}</p>
 <p style="text-align:right;margin:0"><button class="btn ghost" data-a="mclose">Tutup</button></p></div>`)}

/* ---- hook: tombol di header, aksi klik, perubahan ---- */
{const _rv=renderView;renderView=function(){const r=_rv.apply(this,arguments);
  if(S.user&&canScan()){const net=document.getElementById('net');if(net&&!document.getElementById('scbtn')){net.insertAdjacentHTML('beforebegin',`<button class="btn ghost sm" id="scbtn" data-a="scanpanel" aria-label="Scanner check-in" title="Scanner check-in">${ico('scan')}<span class="sdot ${cam.on||ser.on?'on':'kb'}"></span></button>`)}}
  if(!S.user){if(cam.on)camStop(true);closeCI()}
  return r}}
{const _ecS=extraClick;extraClick=function(a,v,el){
 if(a==='scanpanel'){showScanPanel();return true}
 if(a==='ciclose'){closeCI();return true}
 if(a==='cipos'){closeCI();if(!can('pos.access'))return true;S.pmem=v;S.pnew=null;S.pq='';S.ppk=el.dataset.x?(S.members.find(x=>x.id===v)||{}).pkg||'':'';if(S.ppk&&!PKG.some(p=>p.id===S.ppk&&p.on))S.ppk='';go('pos');return true}
 if(a==='ciunfreeze'){closeCI();const m=S.members.find(x=>x.id===v);if(m&&can('membership.freeze')){m.freeze=false;log('member_freeze',m.code);render();toast(m.name+' diaktifkan kembali. Scan ulang untuk check-in.')}return true}
 if(a==='camon'){camStart();return true}
 if(a==='camoff'){camStop();return true}
 if(a==='serconn'){serConnect();return true}
 if(a==='serdisc'){serDisc();return true}
 return _ecS.apply(this,arguments)}}
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset&&t.dataset.ch==='camface'){sset({facing:t.value});if(cam.on){camStop(true);camStart()}}
 else if(t.dataset&&t.dataset.ch==='scanmute'){sset({mute:t.checked})}});
{const _esS=extraSubmit;extraSubmit=function(k,d,f){
 if(k==='checkin'){if(!canScan())return true;doScan(d.code,'manual');const i=f.querySelector('input[name=code]');if(i){i.value='';i.focus()}return true}
 return _esS.apply(this,arguments)}}
/* halaman Check-in: ringkas dan arahkan ke scanner */
{const _pc=P.checkin;P.checkin=()=>{const h=_pc();return`<div class="card"><h2>Scanner di latar belakang</h2><p class="mut">Scan QR kartu member dari menu mana pun. Di sini Anda juga bisa mengetik kode manual.</p><p class="pill" style="flex-wrap:wrap"><button class="btn" data-a="scanpanel">${ico('scan')} Atur scanner &amp; kamera</button>${cam.on?badge(['Kamera aktif','b-ok']):''}${ser.on?badge(['Scanner serial terhubung','b-ok']):''}</p></div>`+h.replace(/<p class="mut">Coba kode[^]*?<\/p>/,'')}}
/* mulai: lanjutkan kamera jika sebelumnya aktif dan izin sudah diberikan; sambungkan ulang scanner serial */
function scanBoot(){serAuto();if(sget().cam&&navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:'camera'}).then(r=>{if(r.state==='granted'&&S.user&&canScan())camStart()}).catch(()=>{})}}
{const _al=afterLogin;afterLogin=function(){_al.apply(this,arguments);scanBoot()}}
addEventListener('DOMContentLoaded',()=>setTimeout(scanBoot,1500));
