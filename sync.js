/* PinaGym: cadangan (backup) ke Supabase.
   Data tetap tersimpan di perangkat. Backup mengirim salinan SELURUH isi aplikasi ke tabel app_backups.
   Tanpa library: memakai fetch ke Supabase Auth dan PostgREST. */
const SB=(()=>{
const CK='pinagym.sb',SK='pinagym.sbs',BK='pinagym.bk',KEEP=30;
const jr=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const jw=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let cfg=jr(CK),ses=jr(SK),bk=jr(BK)||{};
const st={busy:false,err:'',msg:'',list:null,loading:false};
const mail=u=>{u=String(u).trim().toLowerCase();return u.includes('@')?u:u+'@pinagym.app'};
const cleanUrl=u=>String(u||'').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/,'').replace(/\/auth\/v1$/,'');
const live=()=>!!(cfg&&ses),hasCfg=()=>!!cfg;
const pub=()=>{try{if(typeof S!=='undefined'&&S.user&&S.page==='backup'&&!document.querySelector('#modal .modal'))renderView()}catch(e){}};

async function refresh(){if(!ses||!ses.refresh)return false;
 try{const r=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:ses.refresh})});
  if(!r.ok){if(r.status===400||r.status===401){ses=null;jw(SK,null)}return false}const d=await r.json();ses={...ses,access:d.access_token,refresh:d.refresh_token||ses.refresh,exp:Date.now()+(d.expires_in||3600)*1000};jw(SK,ses);return true}catch(e){return false}}
async function req(path,o={}){
 if(!cfg)return{ok:false,status:0,err:{message:'Supabase belum diatur'}};
 if(!ses)return{ok:false,status:401,err:{message:'Akun backup belum masuk'}};
 if(ses.exp&&Date.now()>ses.exp-30000)await refresh();
 if(!ses)return{ok:false,status:401,err:{message:'Sesi akun backup berakhir. Masuk lagi di menu Backup Database.'}};
 const go=()=>fetch(cfg.url+path,{method:o.method||'GET',headers:{apikey:cfg.key,Authorization:'Bearer '+ses.access,'Content-Type':'application/json',...(o.prefer?{Prefer:o.prefer}:{})},body:o.body===undefined?undefined:JSON.stringify(o.body)});
 let r;try{r=await go();if(r.status===401&&await refresh())r=await go()}catch(e){return{ok:false,status:0,err:{message:'Tidak ada koneksi ke Supabase'}}}
 let t='',d=null;try{t=await r.text();d=t?JSON.parse(t):null}catch(e){d=t}
 if(r.ok)return{ok:true,status:r.status,data:d};
 const m=d&&typeof d==='object'?(d.message||d.msg||d.error_description||d.error||t):t;
 return{ok:false,status:r.status,err:{code:d&&d.code,message:String(m||('HTTP '+r.status))}}}

function setCfg(url,key){cfg=url&&key?{url:cleanUrl(url),key:String(key).trim()}:null;jw(CK,cfg);if(!cfg){ses=null;jw(SK,null)}}
async function test(){ // URL & kunci benar?
 if(!cfg)return{ok:false,msg:'Isi URL dan anon key dahulu.'};
 let r;try{r=await fetch(cfg.url+'/auth/v1/settings',{headers:{apikey:cfg.key}})}catch(e){return{ok:false,msg:'Tidak ada koneksi ke Supabase. Periksa URL project dan internet.'}}
 if(r.status===401||r.status===403)return{ok:false,msg:'Anon key ditolak. Salin ulang "anon public" atau "publishable key" dari Project Settings → API.'};
 if(!r.ok)return{ok:false,msg:'Supabase menjawab HTTP '+r.status+'. Periksa URL project.'};
 return{ok:true,msg:'URL dan kunci benar.'}}
async function login(email,pw){
 if(!cfg)return{ok:false,msg:'Supabase belum diatur'};
 let r;try{r=await fetch(cfg.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({email:mail(email),password:pw})})}catch(e){return{ok:false,msg:'Tidak ada koneksi ke Supabase'}}
 const d=await r.json().catch(()=>({}));
 if(!r.ok)return{ok:false,msg:'Login ditolak: '+(d.error_description||d.msg||d.message||('HTTP '+r.status))+'. Periksa email/password dan pastikan user dibuat dengan Auto Confirm.'};
 ses={access:d.access_token,refresh:d.refresh_token,exp:Date.now()+(d.expires_in||3600)*1000,email:mail(email)};jw(SK,ses);
 const t=await req('/rest/v1/app_backups?select=id&limit=1');
 if(!t.ok&&(t.status===404||/app_backups/.test(t.err.message)))return{ok:true,warn:'Login berhasil, tetapi tabel app_backups belum ada. Jalankan supabase/backup.sql di SQL Editor.'};
 if(!t.ok)return{ok:true,warn:'Login berhasil, tetapi tabel belum bisa dibaca: '+t.err.message};
 return{ok:true}}
function logout(){ses=null;jw(SK,null)}

const counts=d=>({members:(d.members||[]).length,tx:(d.tx||[]).length,products:(d.products||[]).length,users:(d.users||[]).length,checkins:(d.checkins||[]).length,trainers:(d.trainers||[]).length,visits:(d.visits||[]).length});
async function backupNow(kind){
 if(st.busy)return{ok:false,msg:'Backup sedang berjalan'};
 if(!live())return{ok:false,msg:'Akun backup belum masuk'};
 if(!navigator.onLine)return{ok:false,msg:'Perangkat sedang offline'};
 st.busy=true;st.err='';pub();
 try{const data=snap();
  const r=await req('/rest/v1/app_backups',{method:'POST',body:{device:S.dev,kind:kind||'manual',counts:counts(data),data},prefer:'return=minimal'});
  if(!r.ok){st.err=r.err.message;return{ok:false,msg:r.err.message}}
  bk={last:new Date().toISOString(),date:T0,kind:kind||'manual'};jw(BK,bk);
  await prune();return{ok:true}}
 catch(e){st.err=e.message||String(e);return{ok:false,msg:st.err}}
 finally{st.busy=false;pub()}}
async function list(){st.loading=true;const r=await req('/rest/v1/app_backups?select=id,created_at,device,kind,counts&order=created_at.desc&limit=100');st.loading=false;
 if(r.ok){st.list=r.data;st.err=''}else{st.err=r.err.message}return r}
async function prune(){const r=await req('/rest/v1/app_backups?select=id&order=created_at.desc&limit=500');
 if(r.ok&&r.data.length>KEEP){for(const x of r.data.slice(KEEP))await req('/rest/v1/app_backups?id=eq.'+x.id,{method:'DELETE',prefer:'return=minimal'})}}
async function fetchData(id){const r=await req('/rest/v1/app_backups?id=eq.'+encodeURIComponent(id)+'&select=data,created_at');
 if(!r.ok)return{ok:false,msg:r.err.message};if(!r.data||!r.data[0])return{ok:false,msg:'Backup tidak ditemukan'};return{ok:true,data:r.data[0].data,at:r.data[0].created_at}}
async function remove(id){return req('/rest/v1/app_backups?id=eq.'+encodeURIComponent(id),{method:'DELETE',prefer:'return=minimal'})}

const autoOn=()=>!(S.settings.auto_backup===0||S.settings.auto_backup==='0');
const due=()=>live()&&autoOn()&&bk.date!==T0&&navigator.onLine&&!st.busy;
async function auto(){if(due()){const r=await backupNow('auto');if(!r.ok)st.err=r.msg}}
setInterval(()=>{if(document.visibilityState==='visible')auto()},10*60*1000);
addEventListener('online',()=>setTimeout(auto,1500));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(auto,1000)});
return{req,st,cfg:()=>cfg,hasCfg,live,setCfg,test,login,logout,backupNow,list,fetchData,remove,auto,due,autoOn,last:()=>bk,email:()=>ses&&ses.email,counts,cleanUrl,KEEP}})();
