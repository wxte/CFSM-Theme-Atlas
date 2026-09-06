import createGlobe from 'https://esm.sh/cobe@2.0.1';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const COUNTRY = {
  US: { name: 'United States', flag: '🇺🇸', coord: [37.1, -95.7] },
  GB: { name: 'United Kingdom', flag: '🇬🇧', coord: [54.2, -2.8] },
  UK: { name: 'United Kingdom', flag: '🇬🇧', coord: [54.2, -2.8] },
  DE: { name: 'Germany', flag: '🇩🇪', coord: [51.1, 10.4] },
  SG: { name: 'Singapore', flag: '🇸🇬', coord: [1.35, 103.82] },
  HK: { name: 'Hong Kong', flag: '🇭🇰', coord: [22.32, 114.17] },
  JP: { name: 'Japan', flag: '🇯🇵', coord: [36.2, 138.25] },
  KR: { name: 'South Korea', flag: '🇰🇷', coord: [36.5, 127.9] },
  CN: { name: 'China', flag: '🇨🇳', coord: [35.9, 104.2] },
  TW: { name: 'Taiwan', flag: '🇹🇼', coord: [23.7, 121.0] },
  NL: { name: 'Netherlands', flag: '🇳🇱', coord: [52.1, 5.3] },
  FR: { name: 'France', flag: '🇫🇷', coord: [46.2, 2.2] },
  CA: { name: 'Canada', flag: '🇨🇦', coord: [56.1, -106.3] },
  AU: { name: 'Australia', flag: '🇦🇺', coord: [-25.3, 133.8] },
  FI: { name: 'Finland', flag: '🇫🇮', coord: [61.9, 25.7] },
  SE: { name: 'Sweden', flag: '🇸🇪', coord: [60.1, 18.6] },
  PL: { name: 'Poland', flag: '🇵🇱', coord: [51.9, 19.1] },
  CH: { name: 'Switzerland', flag: '🇨🇭', coord: [46.8, 8.2] },
  RU: { name: 'Russia', flag: '🇷🇺', coord: [61.5, 105.3] }
};

const state = {
  config: {},
  servers: new Map(),
  stats: {},
  regionStats: {},
  ws: null,
  wsTimer: null,
  reconnectAttempt: 0,
  sort: 'default',
  globe: null,
  globeMarkers: [],
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min = 0, max = 100) { return Math.min(max, Math.max(min, n)); }
function pct(used, total) { return total > 0 ? clamp((used / total) * 100) : 0; }

function fmtBytes(bytes, speed = false) {
  let n = Math.max(0, num(bytes));
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return `${n.toFixed(digits)} ${units[i]}${speed ? '/s' : ''}`;
}

function fmtPct(v) { return `${clamp(num(v)).toFixed(num(v) < 10 ? 1 : 0)}%`; }
function fmtPing(v) { return v === false || v == null || !Number.isFinite(Number(v)) ? '—' : `${Math.round(Number(v))} ms`; }
function fmtLoss(v) { return v === false || v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(Number(v) < 1 ? 1 : 0)}% loss`; }
function fmtUptime(msOrSec) {
  let sec = num(msOrSec);
  if (sec > 1e11) sec = Math.max(0, (Date.now() - sec) / 1000);
  else if (sec > 1e9) sec = Math.max(0, (Date.now() / 1000) - sec);
  const d = Math.floor(sec / 86400); sec %= 86400;
  const h = Math.floor(sec / 3600); sec %= 3600;
  const m = Math.floor(sec / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function serverUptime(s) {
  if (s.boot_time) return fmtUptime(num(s.boot_time));
  return '—';
}

function regionInfo(code) {
  const key = String(code || 'XX').toUpperCase();
  return { code: key, ...(COUNTRY[key] || { name: key, flag: '◌', coord: null }) };
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function bootstrap() {
  try {
    const [config, payload] = await Promise.all([fetchJson('/api/config'), fetchJson('/api/servers')]);
    state.config = config || {};
    state.stats = payload.stats || {};
    state.regionStats = payload.regionStats || {};
    for (const s of payload.servers || []) state.servers.set(s.id, { ...s });
    applyConfig();
    renderAll();
    initGlobe();
    connectWs();
  } catch (err) {
    console.error(err);
    $('#node-grid').innerHTML = `<div class="empty-state">无法读取 CFSM API：${escapeHtml(err.message)}</div>`;
    setWsState('连接失败', false);
  }
}

function applyConfig() {
  const title = state.config.site_title || 'WXT NODE GRID';
  $('#site-title').textContent = title;
  $('#brand-title').textContent = title.toUpperCase();
}

function renderAll() {
  renderSummary();
  renderRegions();
  renderNetwork();
  renderNodes();
  refreshGlobeData();
}

function onlineServers() { return [...state.servers.values()].filter(s => s.is_online !== false); }

function renderSummary() {
  const servers = [...state.servers.values()];
  const online = servers.filter(s => s.is_online !== false).length;
  const liveIn = servers.reduce((a, s) => a + num(s.net_in_speed), 0);
  const liveOut = servers.reduce((a, s) => a + num(s.net_out_speed), 0);
  const month = servers.reduce((a, s) => a + num(s.net_rx_monthly) + num(s.net_tx_monthly), 0);
  $('#stat-nodes').textContent = String(servers.length);
  $('#stat-online').textContent = String(online);
  $('#stat-in').textContent = fmtBytes(liveIn, true);
  $('#stat-out').textContent = fmtBytes(liveOut, true);
  $('#stat-month').textContent = fmtBytes(month);
  $('#globe-online').textContent = String(online);
  const regions = new Set(servers.map(s => String(s.region || 'XX').toUpperCase()));
  $('#globe-regions').textContent = String(regions.size);
  const pings = servers.flatMap(s => [s.ping_cu, s.ping_ct, s.ping_cm].filter(v => v !== false && Number.isFinite(Number(v))).map(Number));
  $('#globe-latency').textContent = pings.length ? `${Math.round(pings.reduce((a,b)=>a+b,0) / pings.length)}ms` : '—';
}

function renderRegions() {
  const count = new Map();
  for (const s of state.servers.values()) {
    const code = String(s.region || 'XX').toUpperCase();
    count.set(code, (count.get(code) || 0) + 1);
  }
  const list = [...count.entries()].sort((a,b) => b[1] - a[1]);
  $('#region-list').innerHTML = list.length ? list.map(([code, n]) => {
    const r = regionInfo(code);
    return `<div class="region-item"><strong>${r.flag} ${escapeHtml(r.name)}</strong><span>${n} node${n > 1 ? 's' : ''}</span></div>`;
  }).join('') : '<div class="empty-state">暂无节点</div>';
}

function avgField(field) {
  const vals = onlineServers().map(s => s[field]).filter(v => v !== false && v != null && Number.isFinite(Number(v))).map(Number);
  return vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
}

function renderNetwork() {
  for (const key of ['cu','ct','cm','bd']) {
    $(`#ping-${key}`).textContent = fmtPing(avgField(`ping_${key}`));
    $(`#loss-${key}`).textContent = fmtLoss(avgField(`loss_${key}`));
  }
}

function sortedServers() {
  const list = [...state.servers.values()];
  if (state.sort === 'cpu') list.sort((a,b) => num(b.cpu) - num(a.cpu));
  else if (state.sort === 'traffic') list.sort((a,b) => (num(b.net_rx_monthly)+num(b.net_tx_monthly)) - (num(a.net_rx_monthly)+num(a.net_tx_monthly)));
  else list.sort((a,b) => num(a.sort_order) - num(b.sort_order));
  return list;
}

function renderNodes() {
  const grid = $('#node-grid');
  const list = sortedServers();
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">还没有服务器。先在 CFSM 后台添加节点并安装 Agent。</div>';
    return;
  }
  const existing = new Map($$('.node-card', grid).map(el => [el.dataset.id, el]));
  const frag = document.createDocumentFragment();
  for (const s of list) {
    let card = existing.get(s.id);
    if (!card) {
      card = $('#node-template').content.firstElementChild.cloneNode(true);
      card.dataset.id = s.id;
    }
    updateCard(card, s);
    frag.appendChild(card);
    existing.delete(s.id);
  }
  grid.replaceChildren(frag);
}

function updateCard(card, s) {
  const online = s.is_online !== false && (Date.now() - num(s.last_updated, Date.now()) < 300000);
  card.classList.toggle('offline', !online);
  const r = regionInfo(s.region);
  $('.node-name', card).textContent = s.name || 'Unnamed';
  $('.node-meta', card).textContent = `${r.flag} ${r.code} · ${s.arch || '—'} · ${s.cpu_cores || '—'}C`;
  $('.node-state', card).textContent = online ? 'ONLINE' : 'OFFLINE';
  $('.speed-in', card).textContent = fmtBytes(s.net_in_speed, true);
  $('.speed-out', card).textContent = fmtBytes(s.net_out_speed, true);
  $('.cpu-text', card).textContent = fmtPct(s.cpu);
  $('.cpu-bar', card).style.width = `${clamp(num(s.cpu))}%`;
  const ram = pct(num(s.ram_used), num(s.ram_total));
  $('.ram-text', card).textContent = fmtPct(ram);
  $('.ram-bar', card).style.width = `${ram}%`;
  const disk = pct(num(s.disk_used), num(s.disk_total));
  $('.disk-text', card).textContent = fmtPct(disk);
  $('.disk-bar', card).style.width = `${disk}%`;
  $('.month-traffic', card).textContent = fmtBytes(num(s.net_rx_monthly)+num(s.net_tx_monthly));
  $('.uptime', card).textContent = serverUptime(s);
  $('.load', card).textContent = String(s.load_avg || '—').split(/\s+/).slice(0,3).join(' / ');
  $('.connections', card).textContent = `${num(s.tcp_conn)} / ${num(s.udp_conn)}`;
  $('.ping', card).textContent = fmtPing(s.ping_cu);
  $('.os', card).textContent = s.os || '—';
}

function mergeServer(id, patch, ts) {
  const current = state.servers.get(id);
  if (!current) return;
  Object.assign(current, patch || {});
  if (ts) current.last_updated = ts;
  current.is_online = true;
  state.servers.set(id, current);
}

function patchDomFor(id) {
  const s = state.servers.get(id);
  const card = document.querySelector(`.node-card[data-id="${CSS.escape(id)}"]`);
  if (s && card) updateCard(card, s);
}

function wsUrl() {
  const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${p}//${location.host}/api/ws?subscribe=all`;
}

function connectWs() {
  if (state.ws) try { state.ws.close(); } catch {}
  setWsState('连接中', false);
  const ws = new WebSocket(wsUrl());
  state.ws = ws;
  ws.onopen = () => {
    state.reconnectAttempt = 0;
    setWsState('实时', true);
    const ids = [...state.servers.keys()];
    ws.send(JSON.stringify({ type: 'subscribe', scope: 'all', ids }));
    clearInterval(state.wsTimer);
    state.wsTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
    }, 25000);
  };
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type !== 'batchUpdate') return;
    const touched = new Set();
    for (const u of msg.updates || []) {
      for (const sample of u.samples || []) mergeServer(u.serverId, sample.data, sample.ts);
      touched.add(u.serverId);
    }
    for (const id of touched) patchDomFor(id);
    renderSummary();
    renderNetwork();
    refreshGlobeData();
    $('#last-update').textContent = `更新于 ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`;
  };
  ws.onclose = () => scheduleReconnect();
  ws.onerror = () => ws.close();
}

function scheduleReconnect() {
  clearInterval(state.wsTimer);
  setWsState('重连中', false);
  const delay = Math.min(15000, 1000 * 2 ** Math.min(state.reconnectAttempt++, 4));
  setTimeout(connectWs, delay);
}

function setWsState(text, connected) {
  $('#ws-state').textContent = text;
  $('.live-dot').classList.toggle('connected', connected);
}

function refreshGlobeData() {
  state.globeMarkers = [...state.servers.values()].map((s, idx) => {
    const r = regionInfo(s.region);
    if (!r.coord) return null;
    const online = s.is_online !== false;
    return { location: r.coord, size: online ? 0.055 : 0.035, id: `n${idx}`, color: online ? [0.39, 0.62, 0.45] : [0.55, 0.35, 0.35] };
  }).filter(Boolean);
}

function themeColors() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark ? {
    dark: 1, baseColor: [0.10,0.12,0.10], markerColor: [0.55,0.72,0.59], glowColor: [0.18,0.24,0.20], mapBrightness: 4
  } : {
    dark: 0, baseColor: [0.86,0.89,0.86], markerColor: [0.37,0.50,0.40], glowColor: [0.96,0.98,0.96], mapBrightness: 4.8
  };
}

function initGlobe() {
  const canvas = $('#globe');
  let phi = 0.25;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, innerWidth < 640 ? 1.2 : 1.6);
  const create = () => {
    if (state.globe) state.globe.destroy();
    const size = Math.max(320, Math.round(canvas.getBoundingClientRect().width * dpr));
    const tc = themeColors();
    state.globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi,
      theta: 0.18,
      dark: tc.dark,
      diffuse: 1.05,
      scale: 1,
      mapSamples: innerWidth < 640 ? 7000 : 11000,
      mapBrightness: tc.mapBrightness,
      baseColor: tc.baseColor,
      markerColor: tc.markerColor,
      glowColor: tc.glowColor,
      markers: state.globeMarkers,
      arcs: [],
      markerElevation: 0.03,
      onRender: obj => {
        obj.phi = phi;
        obj.markers = state.globeMarkers;
        if (!reduce && !document.hidden) phi += 0.0016;
      }
    });
  };
  create();
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(create, 180); }, { passive: true });
  window.__rebuildGlobe = create;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function initUi() {
  const saved = localStorage.getItem('cfsm-line-grid-theme');
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('cfsm-line-grid-theme', next);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#0b0e0c' : '#ffffff');
    setTimeout(() => window.__rebuildGlobe?.(), 30);
  });
  $$('[data-scroll]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
  $$('[data-sort]').forEach(btn => btn.addEventListener('click', () => {
    state.sort = btn.dataset.sort;
    $$('[data-sort]').forEach(x => x.classList.toggle('active', x === btn));
    renderNodes();
  }));
}

initUi();
bootstrap();
