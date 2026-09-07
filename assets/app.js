import {NetworkCharts,windowSamples} from './network.js';
import {n,numeric,percent,fmtPct,ping,loss,bytes,online,uptime,month,avg,total,costs,cycles,region,mergeSample} from './data.js';
import {NodeMap} from './globe.js';
const $ = s => document.querySelector(s);
const set = (el,value) => { const text=String(value??'—'); if(el.textContent!==text)el.textContent=text; };
const state={servers:new Map(),rows:new Map(),regions:new Map(),history:new Map(),config:{},sys:{},selected:'',search:'',sort:'default',ws:null,retry:null,heartbeat:null,attempt:0,loading:false,stopped:false,lastMessage:0};
const map=new NodeMap(selectRegion);
const charts=new NetworkCharts();
const carriers=['cu','ct','cm'];
const names={cu:'联通',ct:'电信',cm:'移动',bd:'BGP'};
const label=key=>state.sys[`custom_${key}_name`]||names[key];
const allowed=key=>state.sys[key]!==false&&state.sys[key]!=='false';
const all=()=>[...state.servers.values()];
function visible(){return all().filter(s=>(!state.selected||region(s.region).code===state.selected)&&(!state.search||`${s.name} ${region(s.region).name} ${s.region} ${s.server_group||''}`.toLowerCase().includes(state.search)));}
function sorted(){return visible().sort((a,b)=>state.sort==='cpu'?n(b.cpu)-n(a.cpu):state.sort==='traffic'?n(month(b))-n(month(a)):state.sort==='name'?String(a.name).localeCompare(String(b.name)):n(a.sort_order)-n(b.sort_order)||String(a.id).localeCompare(String(b.id)));}
function connection(text,live=false){set($('#connection'),text);$('#connection').classList.toggle('live',live);}
function notice(text=''){set($('#notice'),text);$('#notice').hidden=!text;}
function chartSetup(){
  for(const key of [...carriers,'bd']){const div=document.createElement('div');div.className='carrier-line';div.innerHTML='<span></span><strong>—</strong><small>—</small>';div.dataset.carrier=key;$('#carrier-summary').append(div);}
  for(const [key,title] of [['cpu','CPU / 平均占用'],['ram','MEMORY / 内存'],['disk','STORAGE / 磁盘'],['connections','CONNECTIONS / 连接']]){const card=document.createElement('article');card.className='resource-card';card.dataset.resource=key;card.innerHTML='<span class="eyebrow"></span><strong>—</strong><div class="resource-track"><b></b></div><small>等待数据</small>';set(card.firstElementChild,title);$('#resource-overview').append(card);}
}
function renderSummary(){
  const list=all(),live=list.filter(s=>online(s));
  set($('#stat-nodes'),String(list.length).padStart(2,'0'));set($('#stat-online'),`${live.length} 在线 / ${list.length-live.length} 离线`);
  set($('#stat-regions'),String(new Set(list.map(s=>region(s.region).code).filter(c=>c!=='XX')).size).padStart(2,'0'));
  set($('#stat-in'),`↓ ${bytes(live.length?total(live,'net_in_speed'):0,true)}`);set($('#stat-out'),`↑ ${bytes(live.length?total(live,'net_out_speed'):0,true)}`);
  const monthly=list.map(month).filter(numeric);set($('#stat-month'),allowed('show_tf')?bytes(monthly.length?monthly.reduce((a,v)=>a+v,0):null):'未公开');
  const cost=costs(list);set($('#stat-cost'),allowed('show_price')?cost.text:'未公开');set($('#cost-note'),cost.missing?`${cost.missing} 台未配置账单 · 原币种 / 月`:'按原币种折算月费');
  const shown=visible().filter(s=>online(s));set($('#map-online'),shown.length);const values=shown.flatMap(s=>carriers.map(k=>s[`ping_${k}`])).filter(v=>numeric(v)&&n(v)>=0);set($('#map-latency'),`${values.length?Math.round(values.reduce((a,v)=>a+n(v),0)/values.length)+' ms':'—'} AVG`);
}
function renderRegions(){
  const counts=new Map();for(const s of all()){const code=region(s.region).code;const item=counts.get(code)||{count:0,live:0};item.count++;if(online(s))item.live++;counts.set(code,item);}
  set($('#region-count'),String(counts.size).padStart(2,'0'));set($('#all-count'),state.servers.size);$('#all-regions').classList.toggle('active',!state.selected);$('#all-regions').setAttribute('aria-pressed',String(!state.selected));
  for(const [code,count] of [...counts].sort((a,b)=>b[1].count-a[1].count)){
    let button=state.regions.get(code);if(!button){button=document.createElement('button');button.className='region';button.append(document.createElement('span'),document.createElement('b'));button.addEventListener('click',()=>selectRegion(code));state.regions.set(code,button);$('#region-list').append(button);}
    set(button.firstElementChild,`${code} · ${region(code).name}`);set(button.lastElementChild,`${count.live}/${count.count}`);button.classList.toggle('active',state.selected===code);button.setAttribute('aria-pressed',String(state.selected===code));button.title=`${count.live} 在线 / ${count.count} 台`;
  }
  for(const [code,el] of state.regions)if(!counts.has(code)){el.remove();state.regions.delete(code);}
}
function selectRegion(code){state.selected=code;renderRegions();renderRows();renderAggregates();map.focus(code);}
function updateRow(s){
  const row=state.rows.get(s.id);if(!row)return;const live=online(s),r=region(s.region);row.classList.toggle('offline',!live);
  const f=(key,value)=>set(row.fields[key],value);
  f('region',r.code);f('name',s.name||'未命名节点');f('status',live?'在线':'离线');f('meta',`${s.arch||'—'} · ${s.cpu_cores||'—'} 核 · ${bytes(numeric(s.ram_total)?n(s.ram_total)*1048576:null)}`);
  f('cpu_info',s.cpu_info);f('os',`${s.os||'—'} · ${s.kernel_version||'—'}`);f('load',`${s.load_avg||'—'} / ${numeric(s.processes)?s.processes:'—'}`);f('connections',`${numeric(s.tcp_conn)?s.tcp_conn:'—'} / ${numeric(s.udp_conn)?s.udp_conn:'—'}`);
  f('price',allowed('show_price')?(numeric(s.price)?`${s.currency||''}${Math.max(0,n(s.price))} / ${cycles[s.billing_cycle]||'?'} 个月`:'未配置'):'未公开');f('expire',allowed('show_expire')?(s.expire_date||'未配置'):'未公开');
  for(const [key,value] of [['cpu',numeric(s.cpu)?n(s.cpu):null],['ram',percent(s.ram_used,s.ram_total)],['disk',percent(s.disk_used,s.disk_total)]]){f(key,fmtPct(value));const bar=row.bars[key],width=`${Math.min(100,Math.max(0,n(value)))}%`;if(bar.style.width!==width)bar.style.width=width;bar.classList.toggle('hot',n(value)>85);}
  f('download',`${live?bytes(s.net_in_speed,true):'—'}`);f('upload',`${live?bytes(s.net_out_speed,true):'—'}`);f('net-note',live?'实时速率':'离线 · 保留最后上报');
  f('month',allowed('show_tf')?bytes(month(s)):'未公开');f('uptime',`在线 ${uptime(s)}`);f('traffic-limit',allowed('show_tf')?(s.traffic_limit?`配额 ${s.traffic_limit}`:'未配置流量配额'):'');
  for(const k of carriers){f(k,`${label(k)} ${ping(s[`ping_${k}`])}\n丢包 ${loss(s[`loss_${k}`])}`);row.fields[k].classList.toggle('lossy',numeric(s[`loss_${k}`])&&n(s[`loss_${k}`])>0);}
}
function renderRows(){
  const list=sorted(),ids=new Set(all().map(s=>s.id));
  for(const [id,row] of state.rows)if(!ids.has(id)){row.remove();state.rows.delete(id);state.history.delete(id);}
  for(const s of all())if(!state.rows.has(s.id)){const row=$('#node-template').content.firstElementChild.cloneNode(true);row.dataset.id=s.id;row.fields=Object.fromEntries([...row.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e]));row.bars=Object.fromEntries([...row.querySelectorAll('[data-bar]')].map(e=>[e.dataset.bar,e]));state.rows.set(s.id,row);$('#node-list').append(row);}
  const shown=new Set(list.map(s=>s.id));for(const [id,row] of state.rows)row.hidden=!shown.has(id);
  let cursor=$('#node-list').firstElementChild;
  for(const s of list){const row=state.rows.get(s.id);if(row!==cursor)$('#node-list').insertBefore(row,cursor);cursor=row.nextElementSibling;updateRow(s);}
  set($('#node-count'),`${list.length} / ${state.servers.size}`);$('#empty').hidden=list.length>0;set($('#empty'),state.servers.size?'没有符合筛选条件的节点。':'暂无服务器，请在 CFSM 后台添加节点。');
}
function record(s,ts,metrics){
  const samples=state.history.get(s.id)||[];
  if(!numeric(ts)||!metrics||!carriers.some(k=>Object.hasOwn(metrics,'ping_'+k)||Object.hasOwn(metrics,'loss_'+k)))return;
  const sample={ts,...Object.fromEntries(carriers.map(k=>[k,metrics['ping_'+k]])),loss:Object.fromEntries(carriers.map(k=>[k,metrics['loss_'+k]]))};
  state.history.set(s.id,windowSamples([...samples,sample]));
}
function renderNetwork(){
  const list=all(),live=list.filter(s=>online(s));
  for(const key of [...carriers,'bd']){const el=$(`[data-carrier="${key}"]`);set(el.children[0],label(key));set(el.children[1],ping(avg(live,`ping_${key}`)));set(el.children[2],`${loss(avg(live,`loss_${key}`))} loss`);}
  charts.update(list,state.history,Object.fromEntries(carriers.map(k=>[k,label(k)])),state.sys.show_three_net_details!==false&&state.sys.show_three_net_details!=='false');
}
function renderResources(){
  const list=all().filter(s=>online(s));
  const values={cpu:[avg(list,'cpu'),`${n(total(list,'cpu_cores'))} 核 · ${list.length} 台在线`],ram:[percent(total(list,'ram_used'),total(list,'ram_total')),`${bytes(numeric(total(list,'ram_used'))?total(list,'ram_used')*1048576:null)} / ${bytes(numeric(total(list,'ram_total'))?total(list,'ram_total')*1048576:null)}`],disk:[percent(total(list,'disk_used'),total(list,'disk_total')),`${bytes(numeric(total(list,'disk_used'))?total(list,'disk_used')*1048576:null)} / ${bytes(numeric(total(list,'disk_total'))?total(list,'disk_total')*1048576:null)}`],connections:[null,`TCP ${total(list,'tcp_conn')??'—'} / UDP ${total(list,'udp_conn')??'—'}`]};
  for(const [key,[value,note]] of Object.entries(values)){const card=$(`[data-resource="${key}"]`);set(card.querySelector('strong'),key==='connections'?(list.length?String(n(total(list,'tcp_conn'))+n(total(list,'udp_conn'))):'—'):fmtPct(value));set(card.querySelector('small'),note);const track=card.querySelector('.resource-track');track.hidden=key==='connections';track.firstElementChild.style.width=`${n(value)}%`;}
}
function renderAggregates(){renderSummary();renderNetwork();renderResources();map.update(visible(),state.config.theme_options||{},state.selected);}
async function json(url){const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(response.status===401||response.status===403?'站点需要登录，请先打开后台登录':`读取失败（${response.status}）`);return response.json();}
async function refresh(){
  if(state.loading)return;state.loading=true;$('#refresh').disabled=true;
  try{
    const payload=await json('/api/servers');if(!Array.isArray(payload.servers))throw Error('服务器列表格式不正确');state.sys=payload.sysConfig||{};
    const next=new Map();for(const s of payload.servers){if(!s.id)continue;const id=String(s.id),old=state.servers.get(id);next.set(id,old&&n(old.last_updated)>n(s.last_updated)?{...s,...old}:{...s,id});const samples=Array.isArray(s.ping)?s.ping:[];if(samples.length){const losses=Array.isArray(s.loss)?s.loss:[];state.history.set(id,windowSamples([...samples.map(p=>({...p,loss:losses.find(l=>l.ts===p.ts)})),...(state.history.get(id)||[])]));}}
    state.servers=next;if(state.selected&&!all().some(s=>region(s.region).code===state.selected))state.selected='';
    renderRegions();renderRows();renderAggregates();notice();set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);set($('#footer-status'),`${all().length} 个节点 · CFSM`);
    if(state.ws?.readyState===WebSocket.OPEN){subscribe();connection('LIVE · 实时',true);}else if(!state.ws&&!state.retry)connect();
  }catch(e){notice(`${e.message}。${state.servers.size?'保留上次数据，可点击刷新重试。':'可点击刷新重试。'}`);if(!state.servers.size)set($('#empty'),'暂时无法读取节点');connection('数据暂不可用');}
  finally{state.loading=false;$('#refresh').disabled=false;}
}
function subscribe(){const ids=[...state.servers.keys()].filter(id=>/^[a-zA-Z0-9._:-]{1,64}$/.test(id)).slice(0,500);state.ws.send(JSON.stringify({type:'subscribe',scope:'all',ids}));if(state.servers.size>500)notice('超过 500 台的节点通过定时刷新更新。');}
function connect(){
  if(state.stopped||state.ws)return;connection('连接中');let ws;
  try{ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws?subscribe=all`);}catch{reconnect();return;}
  state.ws=ws;const timeout=setTimeout(()=>{if(ws.readyState===WebSocket.CONNECTING)ws.close();},15000);
  ws.onopen=()=>{clearTimeout(timeout);state.attempt=0;state.lastMessage=Date.now();connection('LIVE · 实时',true);subscribe();state.heartbeat=setInterval(()=>{if(Date.now()-state.lastMessage>65000){ws.close();return;}if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ping'}));},25000);};
  ws.onmessage=event=>{state.lastMessage=Date.now();let msg;try{msg=JSON.parse(event.data);}catch{return;}if(msg.type!=='batchUpdate'||!Array.isArray(msg.updates))return;const touched=new Set();
    for(const update of msg.updates){const s=state.servers.get(String(update.serverId));if(!s)continue;for(const sample of Array.isArray(update.samples)?update.samples:[])if(mergeSample(s,sample.data??sample.payload,sample.ts)){touched.add(s.id);record(s,n(sample.ts),sample.data??sample.payload);}}
    if(document.hidden)return;
    for(const id of touched)updateRow(state.servers.get(id));if(touched.size){if(state.sort!=='default')renderRows();renderRegions();renderAggregates();set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);}
  };
  ws.onclose=()=>{clearTimeout(timeout);clearInterval(state.heartbeat);if(state.ws===ws)state.ws=null;reconnect();};ws.onerror=()=>ws.close();
}
function reconnect(){if(state.stopped||state.retry)return;connection('重连中 · 定时刷新');state.retry=setTimeout(()=>{state.retry=null;connect();},Math.min(30000,1000*2**Math.min(state.attempt++,5)));}
function applyTheme(theme){document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#0a0a0a':'#ffffff';$('#theme').setAttribute('aria-label',theme==='dark'?'切换日间主题':'切换夜间主题');map.requestDraw();}
let saved;try{saved=localStorage.getItem('cfsm-line-grid-theme');}catch{}applyTheme(saved|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('#theme').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);try{localStorage.setItem('cfsm-line-grid-theme',theme);}catch{}});
$('#refresh').addEventListener('click',refresh);$('#all-regions').addEventListener('click',()=>selectRegion(''));
$('#search').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();renderRows();renderAggregates();});$('#sort').addEventListener('change',e=>{state.sort=e.target.value;renderRows();});
function showPage(hash=location.hash){
  const page=['#nodes','#network','#resources'].includes(hash)?hash:'#nodes';
  for(const id of ['#nodes','#network','#resources'])$(id).hidden=id!==page;
  $('#overview').hidden=page!=='#nodes';map.active=page==='#nodes';
  document.querySelectorAll('nav a').forEach(a=>{const active=a.getAttribute('href')===page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(map.active)map.requestDraw();
}
addEventListener('hashchange',()=>showPage());
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>showPage(a.getAttribute('href'))));
showPage();
chartSetup();
json('/api/config').then(config=>{state.config=config||{};const title=config.site_title||'WXT · 节点状态';set($('#site-title'),title);document.title=`${title} · line-grid`;renderAggregates();}).catch(()=>{});
refresh().then(()=>{if(all().length)map.focus(region(all()[0].region).code);map.init();});
const poll=setInterval(()=>{if(!document.hidden)refresh();},30000);
const age=setInterval(()=>{if(document.hidden)return;for(const s of all())updateRow(s);renderRegions();renderAggregates();},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){for(const s of all())updateRow(s);renderRegions();renderAggregates();refresh();if(!state.ws&&!state.retry)connect();}});
addEventListener('pagehide',()=>{state.stopped=true;clearInterval(poll);clearInterval(age);clearInterval(state.heartbeat);clearTimeout(state.retry);state.ws?.close();});
addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
