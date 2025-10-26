const $ = s => document.querySelector(s);

// zvuk pri úspešnom skene
const beep = () => {
  try {
    document.getElementById('beep').play().catch(() => {});
  } catch {}
};

const pad = n => String(n).padStart(2,'0');
const fmtHMS = ms => {
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

// DOM prvky
const btnLive = $('#btnLive');
const btnStopLive = $('#btnStopLive');
const btnFlip = $('#btnFlip');
const video = $('#video');
const inpCode = $('#inpCode');
const btnClear = $('#btnClear');
const inpName = $('#inpName');
const btnStart = $('#btnStart');
const btnPause = $('#btnPause');
const btnResume = $('#btnResume');
const btnStop = $('#btnStop');
const activeBox = $('#activeBox');
const lblMeta = $('#lblMeta');
const lblTimer = $('#lblTimer');
const btnReload = $('#btnReload');
const btnExportCSV = $('#btnExportCSV');
const tbl = $('#tbl');
const adminModal = $('#adminModal');
const btnAdmin = $('#btnAdmin');
const btnSyncNow = $('#btnSyncNow');
const btnClearAll = $('#btnClearAll');
const btnCloseAdmin = $('#btnCloseAdmin');
const tblAdmin = $('#tblAdmin');
const leftModal = $('#leftModal');
const inpLeft = $('#inpLeft');
const btnLeftSave = $('#btnLeftSave');

// ======== SKENER ========
// používa tvoje ZXing WASM súbory (index.js + zxing_reader.wasm)
let codeReader = null;
let devices = [];
let devIdx = 0;
let activeStream = null;
let stability = null;
const stabRequired = 3;

function onDetected(text) {
  const code = (text || '').trim();
  if (!code) return;
  if (stability && stability.code === code) {
    stability.count++;
  } else {
    stability = { code, count: 1 };
  }

  if (stability.count >= stabRequired) {
    inpCode.value = code;
    beep();
    stability = null;
  }
}

async function startLive() {
  try {
    const devicesList = await navigator.mediaDevices.enumerateDevices();
    devices = devicesList.filter(d => d.kind === 'videoinput');
    devIdx = devices.findIndex(d => /back|environment/i.test(d.label));
    if (devIdx < 0) devIdx = 0;

    const constraints = {
      video: { deviceId: { exact: devices[devIdx].deviceId } }
    };
    activeStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = activeStream;
    video.play();
    btnLive.style.display = 'none';
    btnStopLive.style.display = 'inline-block';
    scanLoop();
  } catch (e) {
    alert('Kamera zlyhala: ' + e.message);
  }
}

function stopLive() {
  if (activeStream) {
    activeStream.getTracks().forEach(t => t.stop());
    activeStream = null;
  }
  btnLive.style.display = 'inline-block';
  btnStopLive.style.display = 'none';
}

function flipCam() {
  if (!devices.length) return;
  devIdx = (devIdx + 1) % devices.length;
  stopLive();
  startLive();
}

// jednoduchá slučka na čítanie cez ZXing (z index.js)
async function scanLoop() {
  if (!video || video.readyState < 2) {
    requestAnimationFrame(scanLoop);
    return;
  }
  try {
    const code = await window.decodeZXing(video); // decodeZXing musí byť v index.js
    if (code) onDetected(code);
  } catch (e) {}
  requestAnimationFrame(scanLoop);
}

btnLive.addEventListener('click', startLive);
btnStopLive.addEventListener('click', stopLive);
btnFlip.addEventListener('click', flipCam);
btnClear.addEventListener('click', () => inpCode.value = '');

// ======== TIMER / MERANIE ČASU ========
let active = null;
let intervalId = null;

function updateTimer() {
  if (!active) return;
  const now = Date.now();
  const pausedMs = active.running
    ? active.pausedAccumMs
    : (active.pausedAccumMs + (now - (active.pauseStartMs || now)));
  const clean = Math.max(0, now - active.startMs - pausedMs);
  lblTimer.textContent = fmtHMS(clean);
}

function setBtns(isRunningNow){
  btnStart.style.display  = active ? 'none'           : 'inline-block';
  btnPause.style.display  = (!active || !isRunningNow)? 'none' : 'inline-block';
  btnResume.style.display = (!active || isRunningNow) ? 'none' : 'inline-block';
  btnStop.style.display   = active ? 'inline-block'   : 'none';
  activeBox.style.display = active ? 'flex' : 'none';
}

btnStart.addEventListener('click', () => {
  const code = inpCode.value.trim();
  const name = inpName.value.trim();
  if (!code || !name) {
    alert('Zadaj kód a meno.');
    return;
  }
  active = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    code,
    name,
    startMs: Date.now(),
    pausedAccumMs: 0,
    pauseStartMs: null,
    running: true,
    pauses: 0
  };
  lblMeta.textContent = `${code} • ${name}`;
  setBtns(true);
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(updateTimer, 500);
  updateTimer();
});

btnPause.addEventListener('click', () => {
  if (!active || !active.running) return;
  active.running = false;
  active.pauseStartMs = Date.now();
  active.pauses++;
  setBtns(false);
});

btnResume.addEventListener('click', () => {
  if (!active || active.running) return;
  active.running = true;
  if (active.pauseStartMs) {
    active.pausedAccumMs += Date.now() - active.pauseStartMs;
    active.pauseStartMs = null;
  }
  setBtns(true);
});

btnStop.addEventListener('click', () => {
  if (!active) return;
  leftModal.style.display = 'flex';
  inpLeft.focus();
});

// uloženie po zadaní kartónov
btnLeftSave.addEventListener('click', async () => {
  const leftover = Math.max(0, parseInt(inpLeft.value || '0', 10) || 0);
  const now = Date.now();
  const pausedMs = active.running
    ? active.pausedAccumMs
    : (active.pausedAccumMs + (now - (active.pauseStartMs || now)));
  const clean = Math.max(0, now - active.startMs - pausedMs);

  const record = {
    id: active.id,
    code: active.code,
    name: active.name,
    startISO: new Date(active.startMs).toISOString(),
    endISO: new Date(now).toISOString(),
    cleanMs: clean,
    pauses: active.pauses,
    leftoverCartons: leftover
  };

  active = null;
  if (intervalId) clearInterval(intervalId);
  lblTimer.textContent = '00:00:00';
  leftModal.style.display = 'none';
  setBtns(false);

  try {
    const resp = await fetch('api/save.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(record)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    await loadRows();
  } catch (e) {
    alert('Ukladanie zlyhalo: ' + e.message);
  }
});

// ======== TABUĽKA / EXPORT ========
async function loadRows() {
  const resp = await fetch('api/list.php');
  const data = await resp.json();
  const rows = data.rows || [];
  renderTable(rows);
  renderAdmin(rows);
}

function renderTable(rows) {
  if (!tbl) return;
  tbl.innerHTML = rows.map(r => `
    <tr>
      <td>${r.code}</td>
      <td>${r.name}</td>
      <td>${r.startHuman}</td>
      <td>${r.endHuman}</td>
      <td style="color:#e41e26;font-weight:700">${r.cleanHMS}</td>
      <td>${r.pauses}</td>
      <td>${r.leftoverCartons}</td>
    </tr>
  `).join('');
}

btnReload && btnReload.addEventListener('click', loadRows);

btnExportCSV && btnExportCSV.addEventListener('click', async () => {
  const resp = await fetch('api/list.php');
  const data = await resp.json();
  const rows = data.rows || [];
  const header = ['Code','Name','Start','End','CleanHMS','Pauses','Leftover'];
  const csv = [header.join(',')].concat(rows.map(r => [
    r.code, `"${r.name}"`, r.startHuman, r.endHuman, r.cleanHMS, r.pauses, r.leftoverCartons
  ].join(',')));
  const blob = new Blob([csv.join('\\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bol_view.csv';
  a.click();
});

// ======== ADMIN ========
btnAdmin.addEventListener('click', () => {
  adminModal.style.display = 'flex';
  loadRows();
});
btnCloseAdmin.addEventListener('click', () => adminModal.style.display = 'none');
btnSyncNow && btnSyncNow.addEventListener('click', loadRows);
btnClearAll && btnClearAll.addEventListener('click', async () => {
  if (!confirm('Vymazať všetky záznamy?')) return;
  await fetch('api/clear.php', {method:'POST'});
  await loadRows();
});

function renderAdmin(rows) {
  if (!tblAdmin) return;
  tblAdmin.innerHTML = rows.slice().reverse().map(r => `
    <tr>
      <td>${r.code}</td>
      <td>${r.name}</td>
      <td>${r.startISO}</td>
      <td>${r.endISO}</td>
      <td>${r.cleanHMS}</td>
      <td>${r.pauses}</td>
      <td>${r.leftoverCartons}</td>
    </tr>
  `).join('');
}

loadRows();
