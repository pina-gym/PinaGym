/* logo.js: logo gym (unggah di Pengaturan Gym) tampil di struk, kartu member, slip gaji, sidebar, login, TV */
const LG=()=>S.settings&&S.settings.logo||'';
const lgImg=(cls,st)=>LG()?`<img class="${cls}" src="${LG()}" alt="Logo ${esc(S.settings.gym_name)}"${st?' style="'+st+'"':''}>`:'';
function logoMono(cv){ // bitmap hitam-putih (Floyd-Steinberg) untuk printer thermal, lebar kelipatan 8
 const w=192,h=Math.max(8,Math.min(96,Math.round(cv.height*w/cv.width/8)*8)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);
 const f=Math.min(w/cv.width,h/cv.height),dw=Math.round(cv.width*f),dh=Math.round(cv.height*f);x.drawImage(cv,(w-dw)>>1,(h-dh)>>1,dw,dh);
 const id=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=id[i*4]*.3+id[i*4+1]*.59+id[i*4+2]*.11;
 const out=new Uint8Array(w/8*h);
 for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){const i=y*w+xx,o=g[i],n=o<140?0:255,e=o-n;if(n===0)out[y*(w/8)+(xx>>3)]|=0x80>>(xx&7);
  if(xx+1<w)g[i+1]+=e*7/16;if(y+1<h){if(xx>0)g[i+w-1]+=e*3/16;g[i+w]+=e*5/16;if(xx+1<w)g[i+w+1]+=e/16}}
 let b='';for(let i=0;i<out.length;i++)b+=String.fromCharCode(out[i]);return{w,h,d:btoa(b)}}
function logoLoad(file){return new Promise((res,rej)=>{if(!file||!/^image\//.test(file.type))return rej(new Error('Pilih file gambar (PNG atau JPG).'));
 const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);try{const M=320,f=Math.min(1,M/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.width*f));cv.height=Math.max(1,Math.round(im.height*f));
  const mkc=bg=>{const k=document.createElement('canvas');k.width=cv.width;k.height=cv.height;const y=k.getContext('2d');if(bg){y.fillStyle=bg;y.fillRect(0,0,k.width,k.height)}y.drawImage(im,0,0,k.width,k.height);return k};
  const tp=mkc(null),wh=mkc('#ffffff'),dk=mkc('#0f172a');
  res({logo:tp.toDataURL('image/png'),logo_j:wh.toDataURL('image/jpeg',.9),logo_c:dk.toDataURL('image/jpeg',.9),m:logoMono(wh)})}catch(e){rej(e)}};
 im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Gambar tidak bisa dibaca.'))};im.src=u})}
{const _g=P.gym;P.gym=()=>_g()+`<div class="card form" id="lgcard"><h2>Logo gym</h2><p class="mut">Logo tampil di struk, kartu member, slip gaji, menu samping dan halaman login. Gambar otomatis dikecilkan; PNG transparan tetap transparan. Logo ikut tercadang di Backup Database.</p>
 ${LG()?`<div class="lgprev"><img src="${LG()}" alt="Logo saat ini"></div>`:'<p class="mut">Belum ada logo.</p>'}
 ${can('settings.manage')?`<label>${LG()?'Ganti logo':'Unggah logo'}<input type="file" id="logofile" accept="image/png,image/jpeg,image/webp"></label>${LG()?`<label class="chk" style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" data-a="logobox"${S.settings.logo_box?' checked':''}> Beri kotak putih di belakang logo pada kartu member (untuk logo yang gelap)</label><button type="button" class="btn red" data-a="logodel">Hapus logo</button>`:''}`:''}</div>`}
document.addEventListener('change',async e=>{const t=e.target;if(t.id!=='logofile'||!can('settings.manage'))return;
 try{const r=await logoLoad(t.files[0]);S.settings.logo=r.logo;S.settings.logo_j=r.logo_j;S.settings.logo_c=r.logo_c;S.settings.logo_m=r.m;log('logo_ubah','');render();toast('Logo disimpan.')}catch(err){toast(err.message||'Logo gagal diproses.')}});
{const _ec=extraClick;extraClick=function(a,v,el){if(a==='logobox'){if(can('settings.manage')){S.settings.logo_box=!S.settings.logo_box;log('logo_kotak',S.settings.logo_box?'ya':'tidak');render()}return true}
 if(a==='logodel'){if(can('settings.manage')){delete S.settings.logo;delete S.settings.logo_j;delete S.settings.logo_c;delete S.settings.logo_m;delete S.settings.logo_box;log('logo_hapus','');render();toast('Logo dihapus.')}return true}return _ec.apply(this,arguments)}}
/* tampilan: sidebar, login, TV */
{const _rv=renderView;renderView=function(){_rv.apply(this,arguments);if(!LG())return;
 document.querySelectorAll('.brand b').forEach(b=>{if(b.textContent.trim()==='P'){const i=document.createElement('img');i.className='blg';i.src=LG();i.alt='';b.replaceWith(i)}});
 const h=document.querySelector('.tv h1');if(h&&!h.querySelector('img'))h.insertAdjacentHTML('afterbegin',lgImg('tvlg'))}}
/* struk di layar */
{const _r=receipt;receipt=function(t){_r.apply(this,arguments);const d=document.querySelector('#modal .rc>div');if(d&&LG()&&!d.querySelector('img'))d.insertAdjacentHTML('afterbegin',lgImg('rclg')+'<br>')}}
/* struk & dokumen cetak lewat browser */
{const pre=()=>{const b=document.getElementById('printrc');if(b&&LG()&&!b.querySelector('img.dlg'))b.insertAdjacentHTML('afterbegin',lgImg('dlg'))};
 const _pb=printBrowser;printBrowser=function(){_pb.apply(this,arguments);pre()};
 const _pl=printLines;printLines=function(){_pl.apply(this,arguments);pre()}}
/* struk thermal ESC/POS: logo raster di atas */
{const _e=escpos;escpos=function(l){const b=_e(l),m=S.settings.logo_m;if(!m||!m.d)return b;
 const bin=atob(m.d),n=m.w/8,h=[0x1b,0x61,1,0x1d,0x76,0x30,0,n&255,n>>8,m.h&255,m.h>>8];for(let i=0;i<bin.length;i++)h.push(bin.charCodeAt(i));h.push(0x0a);
 const o=new Uint8Array(b.length+h.length);o.set(b.subarray(0,5));o.set(h,5);o.set(b.subarray(5),5+h.length);return o}}
