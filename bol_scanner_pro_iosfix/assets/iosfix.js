// iOS-specific start with retries and verbose logging
const $=s=>document.querySelector(s);
const log=(...a)=>{ const el=$('#log'); el.textContent = (el.textContent==='—'?'':el.textContent+'\n') + a.join(' '); console.log(...a); };
if(!window.isSecureContext) $('#httpsNote').style.display='inline-block';

let html5Qr=null, cams=[], curCam=null, live=false, stability=null, stabRequired=3;

function onScanSuccess(decodedText, decodedResult){
  const code = (decodedText||'').trim();
  if (!code) return;
  if (stability && stability.code===code) stability.count++; else stability={code,count:1};
  $('#outCode').textContent = `${code} (${stability.count}/${stabRequired})`;
  const fmt = (decodedResult?.result?.format?.formatName)||decodedResult?.format||'—';
  $('#outMeta').textContent = `Formát: ${fmt} • Režim: ${startMode}`;
  if (stability.count>=stabRequired){
    $('#outCode').textContent = `✓ ${code}`;
    try{ $('#beep').play().catch(()=>{});}catch{}
    stability=null;
  }
}
function onScanFailure(){ /* ignore */ }

async function preflight(){
  try{
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' }, audio:false });
    s.getTracks().forEach(t=>t.stop());
    log('Preflight OK (environment).');
    alert('Povolenie OK. Teraz Spustiť (iOS).');
  }catch(e){
    log('Preflight error:', e.name, e.message);
    alert('Povolenie zlyhalo: '+e.message+'\nSkontroluj HTTPS/localhost a nastavenia kamery pre danú stránku.');
  }
}

async function enumerate(){
  try{
    cams = await Html5Qrcode.getCameras();
    log('Kamery:', JSON.stringify(cams));
  }catch(e){
    log('getCameras error:', e);
  }
}

let startMode = 'env→deviceId→fallback';

async function startIOS(){
  $('#btnStartIOS').disabled = true;
  if (!html5Qr) html5Qr = new Html5Qrcode('reader');

  // 1) Prefer facingMode on iOS (some versions ignore deviceId without labels yet)
  try{
    startMode = 'facingMode:environment (with BarCodeDetector if supported)';
    await html5Qr.start(
      { facingMode: "environment" },
      { fps: 15,
        qrbox: { width: 320, height: 220 },
        aspectRatio: 1.777,
        rememberLastUsedCamera: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      },
      onScanSuccess, onScanFailure
    );
    live = true;
    $('#btnStop').disabled=false;
    await enumerate();
    return;
  }catch(e1){
    log('Start with facingMode failed:', e1.message||e1);
  }

  // 2) If that fails, try explicit deviceId (back camera if known)
  try{
    await enumerate();
    let cam = cams.find(c=>/back|environment|rear/i.test(c.label)) || cams[0];
    if (!cam) throw new Error('Žiadna kamera.');
    curCam = cam.id; startMode = 'deviceId exact';
    await html5Qr.start(
      { deviceId: { exact: curCam } },
      { fps: 15,
        qrbox: { width: 320, height: 220 },
        aspectRatio: 1.777,
        rememberLastUsedCamera: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      },
      onScanSuccess, onScanFailure
    );
    live=true; $('#btnStop').disabled=false; return;
  }catch(e2){
    log('Start with deviceId failed:', e2.message||e2);
  }

  // 3) Fallback: smaller qrbox & no aspectRatio
  try{
    startMode = 'fallback small qrbox';
    await html5Qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 180 },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      },
      onScanSuccess, onScanFailure
    );
    live=true; $('#btnStop').disabled=false; return;
  }catch(e3){
    log('Fallback failed:', e3.message||e3);
    alert('iOS štart skenera zlyhal: '+(e3.message||e3)+"\nPozri LOG a skús v Nastaveniach prehliadača povoliť kameru pre túto stránku.");
    $('#btnStartIOS').disabled=false;
  }
}

async function stop(){
  try{ if(html5Qr && live){ await html5Qr.stop(); live=false; } }catch(e){ log('stop error', e); }
  $('#btnStartIOS').disabled=false; $('#btnStop').disabled=true; $('#btnSwitch').disabled=true;
  $('#outMeta').textContent='Formát: — • Režim: —'; $('#outCode').textContent='—';
  stability=null;
}

$('#btnPreflight').addEventListener('click', preflight);
$('#btnStartIOS').addEventListener('click', startIOS);
$('#btnStop').addEventListener('click', stop);

// photo scan
$('#fileInput').addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  if(!html5Qr) html5Qr = new Html5Qrcode('reader');
  try{
    const { decodedText, result } = await html5Qr.scanFile(f, true);
    onScanSuccess(decodedText, { result });
  }catch(err){ log('scanFile error:', err.message||err); alert('Z fotky sa nepodarilo prečítať kód.'); }
});
