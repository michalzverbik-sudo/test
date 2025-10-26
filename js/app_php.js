// Frontend (PHP backend)
const $ = s => document.querySelector(s);
const beep = ()=>{ try{ document.getElementById('beep').play().catch(()=>{});}catch{} };
const pad = n => String(n).padStart(2,'0');
const fmtHMS = ms => { const s=Math.floor(ms/1000); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return `${pad(h)}:${pad(m)}:${pad(sec)}`; };

const secureWarn = document.getElementById('secureWarn');
if (!window.isSecureContext) secureWarn && (secureWarn.style.display='block');

const btnLive=$('#btnLive'), btnStopLive=$('#btnStopLive'), btnFlip=$('#btnFlip'), btnPhoto=$('#btnPhoto');
const video=$('#video'), detBadge=$('#detBadge');
const inpCode=$('#inpCode'), meta=$('#meta'), btnClear=$('#btnClear');
const inpName=$('#inpName'), btnStart=$('#btnStart'), btnPause=$('#btnPause'), btnResume=$('#btnResume'), btnStop=$('#btnStop');
const activeBox=$('#activeBox'), lblMeta=$('#lblMeta'), lblTimer=$('#lblTimer');
const btnReload=$('#btnReload'), btnExportCSV=$('#btnExportCSV'), tbl=$('#tbl');
const adminModal=$('#adminModal'), btnAdmin=$('#btnAdmin'), btnSyncNow=$('#btnSyncNow'), btnClearAll=$('#btnClearAll'), btnCloseAdmin=$('#btnCloseAdmin'), tblAdmin=$('#tblAdmin');
const leftModal=$('#leftModal'), inpLeft=$('#inpLeft'), btnLeftSave=$('#btnLeftSave');

// Live scan via ZXing + photo OCR fallback
let reader=null, devices=[], devIdx=0, stability=null, stabRequired=3;
function setLiveUI(on){ document.getElementById('liveWrap').style.display = on ? 'block':'none'; btnLive.style.display = on ? 'none':'inline-block'; btnStopLive.style.display = on ? 'inline-block':'none'; btnFlip.style.display = on ? 'inline-block':'none'; }
async function startLive(){ if (!window.isSecureContext) return alert('Živá kamera potrebuje HTTPS alebo localhost.'); setLiveUI(true); try{ if (!reader) reader = new ZXing.BrowserMultiFormatReader(); devices = await reader.listVideoInputDevices(); if (!devices.length) throw new Error('Žiadna kamera'); devIdx = devices.findIndex(d=>/back|environment|rear/i.test(d.label)); if (devIdx<0) devIdx=0; await reader.decodeFromVideoDevice(devices[devIdx].deviceId, video, (res,err)=>{ if(res){ onDetected(res.text, (res.getBarcodeFormat && String(res.getBarcodeFormat()))||res.format||'ZXing', 'live'); } }); }catch(e){ alert('Kamera zlyhala: '+e); stopLive(); } }
function stopLive(){ try{ reader && reader.reset(); }catch{} setLiveUI(false); detBadge.style.display='none'; stability=null; }
function flipCam(){ if(!devices.length) return; devIdx=(devIdx+1)%devices.length; stopLive(); startLive(); }
function onDetected(text, fmt, src){ const code=(text||'').trim(); if(!code) return; if (stability && stability.code===code) stability.count++; else stability={code,count:1}; detBadge.style.display='inline-block'; detBadge.textContent = `${code} (${stability.count}/${stabRequired})`; meta.textContent = `Formát: ${fmt} • Zdroj: ${src}`; if (stability.count>=stabRequired){ inpCode.value=code; beep(); detBadge.textContent=`✓ ${code}`; stability=null; } }
btnLive.addEventListener('click', startLive); btnStopLive.addEventListener('click', stopLive); btnFlip.addEventListener('click', flipCam);
btnPhoto.addEventListener('click', ()=>{ const f=document.createElement('input'); f.type='file'; f.accept='image/*'; f.capture='environment'; f.onchange = async ()=>{ const file=f.files&&f.files[0]; if(!file) return; try{ const r=new ZXing.BrowserMultiFormatReader(); const img=document.createElement('img'); img.src=URL.createObjectURL(file); await new Promise(rf=>img.onload=rf); const out=await r.decodeOnceFromImageElement(img); if(out){ onDetected(out.text, (out.getBarcodeFormat && String(out.getBarcodeFormat()))||out.format||'ZXing', 'photo'); return; } }catch(e){} try{ const { createWorker } = Tesseract; const worker = await createWorker('eng'); const ocr = await worker.recognize(URL.createObjectURL(file), { tessedit_char_whitelist:'0123456789' }); await worker.terminate(); const digits=(ocr.data.text||'').replace(/\D+/g,''); if(digits.length>=8){ onDetected(digits,'OCR-digits','photo-ocr'); return; } }catch(e){} alert('Nepodarilo sa prečítať kód z fotky.'); }; f.click(); });
btnClear.addEventListener('click', ()=>{ inpCode.value=''; detBadge.style.display='none'; meta.textContent='Formát: — • Zdroj: —'; });

// Timer
let active=null, intervalId=null;
function updateTimer(){ if(!active) return; const now=Date.now(); const paused = active.running ? active.pausedAccumMs : (active.pausedAccumMs + (now - (active.pauseStartMs||now))); const clean = Math.max(0, now - active.startMs - paused); lblTimer.textContent = fmtHMS(clean); }
function setBtns(run){ btnStart.style.display = active?'none':'inline-block'; btnPause.style.display = (!active||!run)?'none':'inline-block'; btnResume.style.display = (!active||run)?'none':'inline-block'; btnStop.style.display = !active?'none':'inline-block'; activeBox.style.display = active?'flex':'none'; }
btnStart.addEventListener('click', ()=>{ const code=inpCode.value.trim(), name=inpName.value.trim(); if(!code||!name) return alert('Zadaj kód a meno.'); active = { id: Date.now().toString(36)+Math.random().toString(36).slice(2), code, name, startMs: Date.now(), pausedAccumMs:0, pauseStartMs:null, running:true, pauses:0 }; lblMeta.textContent=`${code} • ${name}`; setBtns(true); if(intervalId) clearInterval(intervalId); intervalId=setInterval(updateTimer,500); updateTimer(); });
btnPause.addEventListener('click', ()=>{ if(!active||!active.running) return; active.running=false; active.pauseStartMs=Date.now(); active.pauses++; setBtns(false); });
btnResume.addEventListener('click', ()=>{ if(!active||active.running) return; active.running=true; if(active.pauseStartMs){ active.pausedAccumMs += Date.now()-active.pauseStartMs; active.pauseStartMs=null; } setBtns(true); });
btnStop.addEventListener('click', ()=>{ leftModal.style.display='flex'; inpLeft.focus(); });
btnLeftSave.addEventListener('click', async ()=>{ const leftover = Math.max(0, parseInt(inpLeft.value||'0',10) || 0); const now=Date.now(); const paused = active.running ? active.pausedAccumMs : (active.pausedAccumMs + (now - (active.pauseStartMs||now))); const clean = Math.max(0, now - active.startMs - paused); const record = { id: active.id, code: active.code, name: active.name, startISO: new Date(active.startMs).toISOString(), endISO: new Date(now).toISOString(), cleanMs: clean, pauses: active.pauses, leftoverCartons: leftover }; active=null; if(intervalId){ clearInterval(intervalId); intervalId=null; } setBtns(false); lblTimer.textContent='00:00:00'; leftModal.style.display='none'; try{ const resp = await fetch('api/save.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(record) }); if(!resp.ok) throw new Error('HTTP '+resp.status); await loadRows(); } catch(e){ alert('Ukladanie zlyhalo: '+e.message); } });

// Load & render
async function loadRows(){ const resp = await fetch('api/list.php'); const data = await resp.json(); renderTable(data.rows||[]); renderAdmin(data.rows||[]); }
function renderTable(rows){ tbl.innerHTML = rows.map(r=>`<tr><td>${r.code}</td><td>${r.name}</td><td>${r.startHuman}</td><td>${r.endHuman}</td><td style="color:#e41e26;font-weight:800">${r.cleanHMS}</td><td>${r.pauses}</td><td>${r.leftoverCartons}</td></tr>`).join(''); }
btnReload.addEventListener('click', loadRows);
btnExportCSV.addEventListener('click', async ()=>{ const resp = await fetch('api/list.php'); const data = await resp.json(); const rows = data.rows||[]; const h=['Code','Name','Start','End','CistyMs','CistyHMS','Pauses','Leftover']; const out=[h.join(',')].concat(rows.map(r=>[r.code,`"${(r.name||'').replace(/"/g,'""')}"`,r.startHuman,r.endHuman,r.cleanMs,r.cleanHMS,r.pauses,r.leftoverCartons].join(','))); const blob=new Blob([out.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='bol_view.csv'; a.click(); });

// Admin modal
btnAdmin.addEventListener('click', ()=>{ adminModal.style.display='flex'; loadRows(); });
btnCloseAdmin.addEventListener('click', ()=>{ adminModal.style.display='none'; });
btnSyncNow.addEventListener('click', loadRows);
btnClearAll.addEventListener('click', async ()=>{ if(!confirm('Vymazať celý súbor?')) return; const r = await fetch('api/clear.php', { method:'POST' }); if(!r.ok) return alert('Chyba pri mazaní'); await loadRows(); });

function renderAdmin(rows){ tblAdmin.innerHTML = rows.slice().reverse().map(r=>`<tr><td>${r.code}</td><td>${r.name}</td><td>${r.startISO}</td><td>${r.endISO}</td><td>${r.cleanHMS}</td><td>${r.pauses}</td><td>${r.leftoverCartons}</td></tr>`).join(''); }

// init
loadRows();
