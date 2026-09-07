export const numeric = v => v !== null && v !== undefined && v !== false && v !== '' && Number.isFinite(Number(v));
export const n = v => numeric(v) ? Number(v) : 0;
export const clamp = v => Math.min(100, Math.max(0, v));
export const percent = (used, total) => numeric(used) && n(total) > 0 ? clamp(n(used) / n(total) * 100) : null;
export const fmtPct = v => numeric(v) ? `${Number(v).toFixed(1)}%` : '—';
export const ping = v => numeric(v) && n(v) >= 0 ? `${Math.round(n(v))} ms` : v === false ? '关闭' : '—';
export const loss = v => numeric(v) && n(v) >= 0 ? `${n(v).toFixed(1)}%` : '—';
export function bytes(v, speed = false) {
  if (!numeric(v)) return '—';
  let value = Math.max(0, n(v)), i = 0;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}${speed ? '/s' : ''}`;
}
export function online(s, now = Date.now()) { return s.is_online !== false && n(s.last_updated) > 0 && now - n(s.last_updated) < 300000; }
export function uptime(s, now = Date.now()) {
  if (!numeric(s.boot_time) || n(s.boot_time) <= 0) return '—';
  const elapsed = Math.max(0, now - n(s.boot_time));
  return `${Math.floor(elapsed / 86400000)}d ${Math.floor(elapsed / 3600000) % 24}h`;
}
export function month(s) { return numeric(s.net_rx_monthly) || numeric(s.net_tx_monthly) ? n(s.net_rx_monthly) + n(s.net_tx_monthly) : null; }
export function avg(list, field) { const values = list.map(s => s[field]).filter(v => numeric(v) && n(v) >= 0); return values.length ? values.reduce((a,v) => a + n(v), 0) / values.length : null; }
export function total(list, field) { const values = list.map(s => s[field]).filter(numeric); return values.length ? values.reduce((a,v) => a + n(v), 0) : null; }
export const cycles = {month:1, quarter:3, half_year:6, year:12, two_years:24, three_years:36, four_years:48, five_years:60};
export function costs(list) {
  const groups = new Map(); let missing = 0;
  for (const s of list) {
    if (!numeric(s.price) || !cycles[s.billing_cycle] || !s.currency) { missing++; continue; }
    groups.set(s.currency, (groups.get(s.currency) || 0) + Math.max(0,n(s.price)) / cycles[s.billing_cycle]);
  }
  return {text:[...groups].map(([c,v]) => `${c}${v.toFixed(2)}`).join(' · ') || '—', missing, currencies:groups.size};
}
export function mergeSample(server, patch, ts) {
  if (!patch || typeof patch !== 'object' || !numeric(ts) || n(ts) < n(server.last_updated)) return false;
  // IDs and the public node list remain authoritative from /api/servers.
  const {id, ...metrics} = patch;
  Object.assign(server, metrics, {last_updated:n(ts),is_online:metrics.is_online!==false});
  return true;
}
const coords = {US:[37.1,-95.7],GB:[54.2,-2.8],DE:[51.1,10.4],SG:[1.35,103.82],HK:[22.32,114.17],JP:[36.2,138.25],KR:[36.5,127.9],CN:[35.9,104.2],TW:[23.7,121],NL:[52.1,5.3],FR:[46.2,2.2],CA:[56.1,-106.3],AU:[-25.3,133.8],FI:[61.9,25.7],SE:[60.1,18.6],PL:[51.9,19.1],CH:[46.8,8.2],RU:[61.5,105.3],IN:[20.6,79],BR:[-14.2,-51.9],ZA:[-30.6,22.9],AE:[23.4,53.8],TR:[38.9,35.2],IT:[41.9,12.6],ES:[40.5,-3.7],NO:[60.5,8.5],IE:[53.4,-8.2],ID:[-0.8,113.9],MY:[4.2,101.9],TH:[15.9,100.9],VN:[14.1,108.3],NZ:[-40.9,174.9],MX:[23.6,-102.6],IL:[31,34.8],AT:[47.5,14.6],BE:[50.5,4.5],CZ:[49.8,15.5],DK:[56.3,9.5],PT:[39.4,-8.2],IS:[65,-19],UA:[48.4,31.2]};
const names = new Intl.DisplayNames(['zh-CN'], {type:'region'});
export function region(code) { const key = String(code || 'XX').toUpperCase().replace(/^UK$/, 'GB'); let name = '未知地区'; try { if (/^[A-Z]{2}$/.test(key) && key !== 'XX') name = names.of(key); } catch {} return {code:key, name, coord:coords[key] || null}; }
export function coordinate(s, options = {}) {
  const configured = options.locations?.[s.id];
  if (Array.isArray(configured) && configured.length === 2 && configured.every(numeric) && Math.abs(n(configured[0])) <= 90 && Math.abs(n(configured[1])) <= 180) return configured.map(Number);
  return region(s.region).coord;
}
