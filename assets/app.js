// Fix1 app: preflight camera permission + html5-qrcode start with better errors
const $=s=>document.querySelector(s);
let html5Qr=null, cams=[], curCamId=null, live=false, torchOn=false;
let stability=null, stabRequired=3;

function onScanSuccess(decodedText, decodedResult){
  const code = (decodedText||'').trim();
  if (!code) return;
  if (stability && stability.code===code) stability.count++; else stability={code,count:1};
  $('#outCode').textContent = `${code} (${stability.count}/${stabRequired})`;
  $('#outMeta').textContent = `Formát: ${(decodedResult?.result?.format?.formatName)||decodedResult?.format||'—'} • Kamera: ${curCamId||'—'}`;
  if (stability.count>=stabRequired){
    $('#outCode').textContent = `✓ ${code}`;
    try{ $('#beep').play().catch(()=>{});}catch{}
    stability=null;
  }
}
function onScanFailure(){ /* ignore */ }

async function preflight(){
  try{
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } });
    s.getTracks().forEach(t=>t.stop());
    alert('Povolenie OK. Teraz klikni „Spustiť kameru“.');
  }catch(e){
    alert('Povolenie zlyhalo: '+(e.name||'')+' '+(e.message||'')+'\nSkontroluj HTTPS/localhost a povolenia prehliadača pre kameru.');
  }
}

async function enumerateCameras(){
  try{
    cams = await Html5Qrcode.getCameras();
    return cams;
  }catch(e){
    alert('Kamery sa nenašli: '+(e.message||e));
    return [];
  }
}

async function startCamera(){
  if (!html5Qr) html5Qr = new Html5Qrcode('reader');
  const list = await enumerateCameras();
  if (!list.length) return;
  const idx = list.findIndex(c=>/back|rear|environment/i.test(c.label));
  curCamId = (idx>=0? list[idx] : list[0]).id;
  const formatsToSupport = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODE_39
  ];
  try{
    await html5Qr.start(
      { deviceId: { exact: curCamId } },
      { fps: 15, qrbox: { width: 320, height: 220 }, rememberLastUsedCamera: true, aspectRatio: 1.777, formatsToSupport },
      onScanSuccess, onScanFailure
    );
    live=true;
    $('#btnStart').disabled=true; $('#btnStop').disabled=false;
    $('#btnSwitch').disabled = list.length<2; $('#btnTorch').disabled=false;
  }catch(e){
    alert('Štart kamery zlyhal: '+(e.message||e));
  }
}

async function stopCamera(){
  try{ if(html5Qr && live){ await html5Qr.stop(); live=false; } }catch{}
  $('#btnStart').disabled=false; $('#btnStop').disabled=true; $('#btnSwitch').disabled=true; $('#btnTorch').disabled=true;
  $('#outMeta').textContent='Formát: — • Kamera: —'; $('#outCode').textContent='—'; stability=null;
}

async function switchCamera(){
  const list=cams; if(!list.length) return;
  const i=list.findIndex(c=>c.id===curCamId);
  const next=list[(i+1)%list.length]; await stopCamera(); curCamId=next.id; await startCamera();
}

async function toggleTorch(){
  try{ torchOn=!torchOn; await html5Qr.applyVideoConstraints({advanced:[{torch:torchOn}]}); $('#btnTorch').textContent=torchOn?'🔦 Svetlo (ON)':'🔦 Svetlo'; }catch(e){ alert('Torch nie je podporované na tejto kamere.'); }
}

$('#btnPreflight').addEventListener('click', preflight);
$('#btnStart').addEventListener('click', startCamera);
$('#btnStop').addEventListener('click', stopCamera);
$('#btnSwitch').addEventListener('click', switchCamera);
$('#btnTorch').addEventListener('click', toggleTorch);
$('#fileInput').addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  if(!html5Qr) html5Qr = new Html5Qrcode('reader');
  try{ const { decodedText, result } = await html5Qr.scanFile(f, true); onScanSuccess(decodedText, { result }); }catch(err){ alert('Z fotky sa nepodarilo prečítať kód.'); }
});
