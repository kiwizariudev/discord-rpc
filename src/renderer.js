const { ipcRenderer } = require('electron');

/* ─── State ─────────────────────────────────────────────── */
let isRunning        = false;
let uptimeInterval   = null;
let startTime        = null;
let previewTimerInterval = null;
let activityType     = 0;
let imgSourceMode    = 'key';
let saveDebounce     = null;

const SAVE_KEY = 'discordrpc_autosave';

/* ─── DOM refs ──────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const startBtn      = $('startBtn');
const startBtnIcon  = $('startBtnIcon');
const startBtnText  = $('startBtnText');
const clearBtn      = $('clearBtn');
const logMsg        = $('logMessage');
const statusDot     = $('statusDot');
const statusText    = $('statusText');
const uptimeBadge   = $('uptimeBadge');
const uptimeText    = $('uptimeText');

const clientIdInput  = $('clientId');
const detailsInput   = $('details');
const stateInput     = $('state');
const timestampToggle = $('showTimestamp');
const largeImgKey    = $('largeImageKey');
const largeImgText   = $('largeImageText');
const smallImgKey    = $('smallImageKey');
const smallImgText   = $('smallImageText');
const largeImgId     = $('largeImageId');
const largeImgTextId = $('largeImageTextId');
const smallImgId     = $('smallImageId');
const smallImgTextId = $('smallImageTextId');
const btn1Label      = $('button1Label');
const btn1Url        = $('button1Url');
const btn2Label      = $('button2Label');
const btn2Url        = $('button2Url');

/* ─── Window Controls ───────────────────────────────────── */
$('minimizeBtn').addEventListener('click', () => ipcRenderer.send('minimize-window'));
$('closeBtn').addEventListener('click', () => ipcRenderer.send('close-window'));

/* ═══════════════════════════════════════════════════════════
   AUTO-SAVE
   Saves all fields to localStorage, debounced 600ms
   ═══════════════════════════════════════════════════════════ */
function getFormData() {
  return {
    clientId:       clientIdInput.value,
    details:        detailsInput.value,
    state:          stateInput.value,
    showTimestamp:  timestampToggle.checked,
    activityType,
    imgSourceMode,
    largeImageKey:  largeImgKey.value,
    largeImageText: largeImgText.value,
    smallImageKey:  smallImgKey.value,
    smallImageText: smallImgText.value,
    largeImageId:   largeImgId.value,
    largeImageTextId: largeImgTextId.value,
    smallImageId:   smallImgId.value,
    smallImageTextId: smallImgTextId.value,
    button1Label:   btn1Label.value,
    button1Url:     btn1Url.value,
    button2Label:   btn2Label.value,
    button2Url:     btn2Url.value,
  };
}

function autoSave() {
  clearTimeout(saveDebounce);
  saveDebounce = setTimeout(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(getFormData()));
    // Small flash on the log
    const prev = logMsg.textContent;
    logMsg.textContent = 'Auto-saved.';
    setTimeout(() => { if (logMsg.textContent === 'Auto-saved.') logMsg.textContent = prev; }, 1200);
  }, 600);
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);

    if (d.clientId)       clientIdInput.value   = d.clientId;
    if (d.details)        detailsInput.value     = d.details;
    if (d.state)          stateInput.value       = d.state;
    if (typeof d.showTimestamp === 'boolean') {
      timestampToggle.checked = d.showTimestamp;
      $('timestampLabel').textContent = d.showTimestamp ? 'Enabled' : 'Disabled';
    }

    // Activity type
    if (typeof d.activityType === 'number') {
      activityType = d.activityType;
      $('activityType').value = String(d.activityType);
      const labels = { 0:'Playing', 1:'Streaming', 2:'Listening to', 3:'Watching', 5:'Competing in' };
      const previewLabel = document.querySelector('.preview-app-name');
      if (previewLabel) previewLabel.textContent = labels[activityType] || 'Playing';
    }

    // Image mode
    if (d.imgSourceMode) {
      imgSourceMode = d.imgSourceMode;
      document.querySelectorAll('.source-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.source === imgSourceMode);
      });
      $('imgModeKey').style.display = imgSourceMode === 'key' ? '' : 'none';
      $('imgModeId').style.display  = imgSourceMode === 'id'  ? '' : 'none';
    }

    if (d.largeImageKey)    largeImgKey.value     = d.largeImageKey;
    if (d.largeImageText)   largeImgText.value    = d.largeImageText;
    if (d.smallImageKey)    smallImgKey.value     = d.smallImageKey;
    if (d.smallImageText)   smallImgText.value    = d.smallImageText;
    if (d.largeImageId)     largeImgId.value      = d.largeImageId;
    if (d.largeImageTextId) largeImgTextId.value  = d.largeImageTextId;
    if (d.smallImageId)     smallImgId.value      = d.smallImageId;
    if (d.smallImageTextId) smallImgTextId.value  = d.smallImageTextId;
    if (d.button1Label)     btn1Label.value       = d.button1Label;
    if (d.button1Url)       btn1Url.value         = d.button1Url;
    if (d.button2Label)     btn2Label.value       = d.button2Label;
    if (d.button2Url)       btn2Url.value         = d.button2Url;

    // Trigger clientId validation state
    const cid = clientIdInput.value.trim();
    if (cid.length > 0) {
      clientIdInput.classList.toggle('valid',   /^\d{17,21}$/.test(cid));
      clientIdInput.classList.toggle('invalid', !/^\d{17,21}$/.test(cid));
    }

    updateCharCounters();
    return !!d.clientId;
  } catch (e) {
    return false;
  }
}

// Hook all inputs to auto-save
const ALL_INPUTS = [
  clientIdInput, detailsInput, stateInput,
  largeImgKey, largeImgText, smallImgKey, smallImgText,
  largeImgId, largeImgTextId, smallImgId, smallImgTextId,
  btn1Label, btn1Url, btn2Label, btn2Url,
];
ALL_INPUTS.forEach(el => el.addEventListener('input', autoSave));
timestampToggle.addEventListener('change', autoSave);

/* ═══════════════════════════════════════════════════════════
   CHARACTER COUNTERS  (Details & State, max 128)
   ═══════════════════════════════════════════════════════════ */
function attachCharCounter(input) {
  const max    = parseInt(input.getAttribute('maxlength')) || 128;
  const wrap   = input.closest('.form-group');
  if (!wrap) return;

  const counter = document.createElement('span');
  counter.className = 'char-counter';
  counter.textContent = `0 / ${max}`;
  wrap.appendChild(counter);

  function update() {
    const len = input.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('char-warn',  len >= max * 0.85 && len < max);
    counter.classList.toggle('char-limit', len >= max);
  }

  input.addEventListener('input', update);
  return update;
}

function updateCharCounters() {
  // Re-trigger all counter updates after loading saved data
  document.querySelectorAll('.char-counter').forEach(c => {
    const input = c.closest('.form-group')?.querySelector('input');
    if (input) {
      const max = parseInt(input.getAttribute('maxlength')) || 128;
      const len = input.value.length;
      c.textContent = `${len} / ${max}`;
      c.classList.toggle('char-warn',  len >= max * 0.85 && len < max);
      c.classList.toggle('char-limit', len >= max);
    }
  });
}

/* ─── Tab Navigation ─────────────────────────────────────── */

function switchTab(newTab) {
  const current = document.querySelector('.panel.active');
  const next    = $(`tab-${newTab}`);
  if (!next || current === next) return;

  if (current) current.classList.remove('active');
  next.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === newTab)
  );
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ─── Activity Type ─────────────────────────────────────── */
$('activityType').addEventListener('change', (e) => {
  activityType = parseInt(e.target.value);
  const labels = { 0:'Playing', 1:'Streaming', 2:'Listening to', 3:'Watching', 5:'Competing in' };
  const previewLabel = document.querySelector('.preview-app-name');
  if (previewLabel) previewLabel.textContent = labels[activityType] || 'Playing';
  autoSave();
});

/* ─── Image Source Toggle ────────────────────────────────── */
document.querySelectorAll('.source-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    imgSourceMode = btn.dataset.source;
    document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('imgModeKey').style.display = imgSourceMode === 'key' ? '' : 'none';
    $('imgModeId').style.display  = imgSourceMode === 'id'  ? '' : 'none';
    autoSave();
  });
});

/* ─── Presets ────────────────────────────────────────────── */
const PRESETS = {
  valorant: {
    details: 'Playing Valorant', state: 'In a match',
    largeImageKey: 'val_banner', largeImageText: 'Valorant',
    smallImageKey: 'val_logo',  smallImageText: 'VALORANT',
    showTimestamp: true,
  }
};

document.querySelectorAll('.preset-use-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;

    detailsInput.value      = p.details      || '';
    stateInput.value        = p.state        || '';
    timestampToggle.checked = p.showTimestamp !== false;
    $('timestampLabel').textContent = timestampToggle.checked ? 'Enabled' : 'Disabled';

    imgSourceMode = 'key';
    document.querySelectorAll('.source-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.source === 'key')
    );
    $('imgModeKey').style.display = '';
    $('imgModeId').style.display  = 'none';

    largeImgKey.value  = p.largeImageKey   || '';
    largeImgText.value = p.largeImageText  || '';
    smallImgKey.value  = p.smallImageKey   || '';
    smallImgText.value = p.smallImageText  || '';

    updatePreview();
    updateCharCounters();
    autoSave();

    switchTab('presence');
    showToast('Valorant preset loaded!', 'success', 3000);
    setLog('Preset loaded — set Client ID and hit Start.');
  });
});

/* ─── Live Preview ───────────────────────────────────────── */
function updatePreview() {
  const details = detailsInput.value.trim();
  const state   = stateInput.value.trim();
  $('previewDetails').textContent = details || 'Details will appear here';
  $('previewState').textContent   = state   || 'State will appear here';
  $('previewDetails').style.color = details ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.25)';
  $('previewState').style.color   = state   ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.20)';
  $('previewTime').style.display  = timestampToggle.checked ? 'flex' : 'none';
}

detailsInput.addEventListener('input', updatePreview);
stateInput.addEventListener('input', updatePreview);
timestampToggle.addEventListener('change', () => {
  $('timestampLabel').textContent = timestampToggle.checked ? 'Enabled' : 'Disabled';
  updatePreview();
});

function startPreviewTimer() {
  let secs = 0;
  if (previewTimerInterval) clearInterval(previewTimerInterval);
  previewTimerInterval = setInterval(() => {
    secs++;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    const el = $('previewTime')?.querySelector('span');
    if (el) el.textContent = `${m}:${s} elapsed`;
  }, 1000);
}

function stopPreviewTimer() {
  if (previewTimerInterval) clearInterval(previewTimerInterval);
  previewTimerInterval = null;
  const el = $('previewTime')?.querySelector('span');
  if (el) el.textContent = '00:00 elapsed';
}

/* ─── Client ID Validation ───────────────────────────────── */
clientIdInput.addEventListener('input', () => {
  const val = clientIdInput.value.trim();
  if (!val.length) {
    clientIdInput.classList.remove('valid', 'invalid');
  } else if (/^\d{17,21}$/.test(val)) {
    clientIdInput.classList.add('valid');
    clientIdInput.classList.remove('invalid');
  } else {
    clientIdInput.classList.add('invalid');
    clientIdInput.classList.remove('valid');
  }
});

/* ─── Status / Log helpers ───────────────────────────────── */
function setStatus(type, text) {
  statusDot.className = 'status-dot' + (type ? ` ${type}` : '');
  statusText.textContent = text;
}
function setLog(msg) { logMsg.textContent = msg; }

/* ─── Uptime ─────────────────────────────────────────────── */
function startUptime() {
  startTime = Date.now();
  uptimeBadge.style.display = 'flex';
  if (uptimeInterval) clearInterval(uptimeInterval);
  uptimeInterval = setInterval(() => {
    const e = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(e / 3600)).padStart(2, '0');
    const m = String(Math.floor((e % 3600) / 60)).padStart(2, '0');
    const s = String(e % 60).padStart(2, '0');
    uptimeText.textContent = `${h}:${m}:${s}`;
  }, 1000);
}
function stopUptime() {
  if (uptimeInterval) clearInterval(uptimeInterval);
  uptimeInterval = null;
  uptimeBadge.style.display = 'none';
  uptimeText.textContent = '00:00:00';
}

/* ─── Toasts ─────────────────────────────────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  const icons = {
    success: 'fa-solid fa-circle-check',
    error:   'fa-solid fa-circle-xmark',
    info:    'fa-solid fa-circle-info',
    warn:    'fa-solid fa-triangle-exclamation',
  };
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="${icons[type] || icons.info} toast-icon"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ─── Build RPC Config ───────────────────────────────────── */
function buildConfig() {
  return {
    clientId:     clientIdInput.value.trim(),
    activityType,
    details:      detailsInput.value,
    state:        stateInput.value,
    largeImageKey: imgSourceMode === 'id'
      ? (largeImgId.value.trim() ? `mp:attachments/${largeImgId.value.trim()}` : '')
      : largeImgKey.value,
    largeImageText: imgSourceMode === 'id' ? largeImgTextId.value : largeImgText.value,
    smallImageKey: imgSourceMode === 'id'
      ? (smallImgId.value.trim() ? `mp:attachments/${smallImgId.value.trim()}` : '')
      : smallImgKey.value,
    smallImageText: imgSourceMode === 'id' ? smallImgTextId.value : smallImgText.value,
    showTimestamp: timestampToggle.checked,
    button1Label:  btn1Label.value,
    button1Url:    btn1Url.value,
    button2Label:  btn2Label.value,
    button2Url:    btn2Url.value,
  };
}

/* ═══════════════════════════════════════════════════════════
   START / STOP RPC
   ═══════════════════════════════════════════════════════════ */
async function startRPC(silent = false) {
  const clientId = clientIdInput.value.trim();

  if (!clientId) {
    switchTab('connection');
    clientIdInput.classList.add('invalid');
    clientIdInput.focus();
    showToast('Please enter your Client ID first.', 'warn');
    setLog('Client ID is required.');
    return false;
  }
  if (!/^\d{17,21}$/.test(clientId)) {
    switchTab('connection');
    clientIdInput.classList.add('invalid');
    clientIdInput.focus();
    showToast('Client ID must be 17–21 digits.', 'error');
    setLog('Invalid Client ID format.');
    return false;
  }

  startBtn.classList.add('loading');
  startBtnIcon.className = 'fa-solid fa-circle-notch spin';
  startBtnText.textContent = 'Connecting…';
  setStatus('connecting', 'Connecting…');
  setLog(`Connecting to Discord with ID ${clientId}…`);

  const result = await ipcRenderer.invoke('start-rpc', buildConfig());
  startBtn.classList.remove('loading');

  if (result.success) {
    isRunning = true;
    startBtn.classList.add('running');
    startBtnIcon.className = 'fa-solid fa-stop';
    startBtnText.textContent = 'Stop RPC';
    setStatus('connected', 'Connected');
    setLog('Rich Presence is now active.');
    if (!silent) showToast('Rich Presence started!', 'success');
    startUptime();
    if (timestampToggle.checked) startPreviewTimer();
    return true;
  } else {
    isRunning = false;
    startBtnIcon.className = 'fa-solid fa-play';
    startBtnText.textContent = 'Start RPC';
    setStatus('error', 'Failed');
    const err = result.error || 'Unknown error';
    setLog(`Error: ${err}`);
    if (!silent) showToast(`Failed: ${truncate(err, 60)}`, 'error', 5000);
    return false;
  }
}

async function stopRPC() {
  startBtn.classList.add('loading');
  startBtnIcon.className = 'fa-solid fa-circle-notch spin';
  startBtnText.textContent = 'Stopping…';
  setStatus('connecting', 'Disconnecting…');

  const result = await ipcRenderer.invoke('stop-rpc');
  startBtn.classList.remove('loading');
  isRunning = false;
  startBtn.classList.remove('running');
  startBtnIcon.className = 'fa-solid fa-play';
  startBtnText.textContent = 'Start RPC';
  setStatus('', 'Disconnected');
  stopUptime();
  stopPreviewTimer();

  if (result.success) {
    setLog('Rich Presence stopped.');
    showToast('Rich Presence stopped.', 'info');
  } else {
    setLog('Stopped (with error).');
    showToast('Stopped (may have had an error).', 'warn');
  }
}

startBtn.addEventListener('click', async () => {
  if (startBtn.classList.contains('loading')) return;
  if (isRunning) await stopRPC(); else await startRPC();
});

/* ─── Reset ──────────────────────────────────────────────── */
clearBtn.addEventListener('click', async () => {
  if (isRunning) await stopRPC();

  ALL_INPUTS.forEach(el => el.value = '');
  timestampToggle.checked = true;
  activityType = 0;
  $('activityType').value = '0';
  document.querySelector('.preview-app-name').textContent = 'Playing';
  imgSourceMode = 'key';
  document.querySelectorAll('.source-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.source === 'key')
  );
  $('imgModeKey').style.display = '';
  $('imgModeId').style.display  = 'none';
  clientIdInput.classList.remove('valid', 'invalid');
  $('timestampLabel').textContent = 'Enabled';

  updatePreview();
  updateCharCounters();
  localStorage.removeItem(SAVE_KEY);
  setLog('Fields cleared — ready to configure.');
  showToast('All fields have been reset.', 'info', 2500);
});

/* ─── IPC: Disconnected ──────────────────────────────────── */
ipcRenderer.on('rpc-disconnected', () => {
  if (!isRunning) return;
  isRunning = false;
  startBtn.classList.remove('running', 'loading');
  startBtnIcon.className = 'fa-solid fa-play';
  startBtnText.textContent = 'Start RPC';
  setStatus('error', 'Disconnected');
  stopUptime();
  stopPreviewTimer();
  setLog('Discord disconnected the session.');
  showToast('Discord disconnected the presence.', 'warn', 5000);
});

/* ─── Utility ────────────────────────────────────────────── */
function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
// 1. Attach char counters to Details & State
attachCharCounter(detailsInput);
attachCharCounter(stateInput);

// 2. Load saved data
const hadSaved = loadSaved();

// 3. Update preview
updatePreview();

// 4. Auto-start if saved clientId exists and valid
if (hadSaved && /^\d{17,21}$/.test(clientIdInput.value.trim())) {
  setLog('Auto-start: launching saved RPC…');
  showToast('Auto-starting saved RPC…', 'info', 2500);
  setTimeout(() => startRPC(true), 1200); // small delay so Discord has time to init
} else {
  setLog('Ready — fill in your settings and press Start.');
}

// 5. Force video
const bgVideo = document.querySelector('.bg-video');
if (bgVideo) { bgVideo.muted = true; bgVideo.play().catch(() => {}); }
