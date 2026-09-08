import {highLoad,expiring,ActivityObserver} from './insights.js?v=0.2.9';
import {ViewRouter,pages,pageFromHash} from './router.js?v=0.2.9';
import {flag} from './flags.js?v=0.2.9';
import {NetworkCharts,windowSamples,historyFromArrays,aggregateHistory} from './network.js?v=0.2.9';
import {n,numeric,percent,fmtPct,ping,loss,bytes,online,uptime,month,avg,total,costs,cycles,region,mergeSample} from './data.js?v=0.2.9';
import {NodeMap} from './globe.js?v=0.2.9';
const $ = s => document.querySelector(s);
const icons={
 sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.3"/><path d="M12 2v2.1M12 19.9V22M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2.1M19.9 12H22M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>',
 moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.3 15.3A7.8 7.8 0 0 1 8.7 4.7 8.2 8.2 0 1 0 19.3 15.3Z"/></svg>',
 spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.2 5.7L19 9l-5.8 1.3L12 16l-1.2-5.7L5 9l5.8-1.3L12 2Zm7 12 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14ZM5 14l.5 2L7 16.5 5.5 17 5 19l-.5-2-1.5-.5 1.5-.5L5 14Z"/></svg>',
 pulse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h3l2-6 4 12 2-6h7"/></svg>',
 activity:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
 gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm8 3.3-2-.7a6.8 6.8 0 0 0-.5-1.3l.9-1.9-1.8-1.8-1.9.9a6.8 6.8 0 0 0-1.3-.5l-.7-2h-2.5l-.7 2a6.8 6.8 0 0 0-1.3.5l-1.9-.9L4.5 8.1l.9 1.9a6.8 6.8 0 0 0-.5 1.3l-2 .7v2.5l2 .7c.1.5.3.9.5 1.3l-.9 1.9 1.8 1.8 1.9-.9c.4.2.9.4 1.3.5l.7 2h2.5l.7-2c.5-.1.9-.3 1.3-.5l1.9.9 1.8-1.8-.9-1.9c.2-.4.4-.9.5-1.3l2-.7v-2.5Z"/></svg>'
};
if($('#activity-toggle'))$('#activity-toggle').innerHTML=icons.activity;
if(!$('#activity-badge')){const badge=document.createElement('span');badge.id='activity-badge';badge.hidden=true;$('#activity-toggle')?.append(badge);}
document.title='WXT Atlas · Cloudflare Server Monitor';
const set = (el,value) => { const text=String(value??'—'); if(el.textContent!==text)el.textContent=text; };
const state={servers:new Map(),rows:new Map(),regions:new Map(),history:new Map(),config:{},sys:{},selected:'',search:'',status:'all',quick:'',sort:'default',page:'overview',ws:null,retry:null,heartbeat:null,attempt:0,loading:false,stopped:false,lastMessage:0};
const map=new NodeMap(selectRegion);
const charts=new NetworkCharts();
const activityObserver=new ActivityObserver(),activityRows=[],filterChips=new Map();
function renderActivity(){
 const kind=$('#activity-kind').value||'all',search=$('#activity-search').value.trim().toLowerCase();let count=0;
 for(const row of activityRows){row.hidden=!(kind==='all'||row.dataset.kind===kind)||!row.searchText.includes(search);if(!row.hidden)count++;}
 set($('#activity-count'),count+' / '+activityRows.length+' 条');$('#activity-empty').hidden=count>0;
 set($('#activity-empty'),activityRows.length?'没有符合条件的活动':'等待状态变化');
 const pop=$('#activity-popover-list'),empty=$('#activity-popover-empty'),badge=$('#activity-badge');
 if(pop){pop.replaceChildren(...activityRows.slice(0,5).map(row=>{const copy=row.cloneNode(true);copy.hidden=false;return copy;}));}
 if(empty)empty.hidden=activityRows.length>0;
 if(badge){badge.hidden=activityRows.length===0;set(badge,activityRows.length>99?'99+':activityRows.length);}
}
function addEvent(text,kind='connection',node='',ts=Date.now()){
 const li=document.createElement('li'),dot=document.createElement('i'),body=document.createElement('span'),tag=document.createElement('b'),description=document.createElement('span'),time=document.createElement('time');
 dot.className='status-dot'+(kind==='offline'?' is-offline':kind==='warning'?' is-warning':kind==='connection'?' is-neutral':'');dot.setAttribute('aria-hidden','true');body.className='event-body';tag.className='event-kind';
 set(tag,({offline:'离线',warning:'异常',recovery:'恢复',connection:'连接'})[kind]||'变化');set(description,(node?node+' · ':'')+text);body.append(tag,description);time.dateTime=new Date(ts).toISOString();set(time,new Date(ts).toLocaleTimeString('zh-CN'));li.append(dot,body,time);li.dataset.kind=kind;li.searchText=((node||'')+' '+text).toLowerCase();
 $('#activity-list').prepend(li);activityRows.unshift(li);if(activityRows.length>100)activityRows.pop().remove();renderActivity();
}
function observeStatus(){for(const event of activityObserver.scan(all()))addEvent(event.message,event.kind,event.node,event.ts);}
const carriers=['cu','ct','cm'];
const names={cu:'联通',ct:'电信',cm:'移动',bd:'BGP'};
const label=key=>state.sys[`custom_${key}_name`]||names[key];
const allowed=key=>state.sys[key]!==false&&state.sys[key]!=='false';
const all=()=>[...state.servers.values()];
function visible(){return all().filter(s=>(state.status==='all'||(state.status==='online')===online(s))&&(!state.quick||(state.quick==='load'?highLoad(s):allowed('show_expire')&&expiring(s)))&&(!state.selected||region(s.region).code===state.selected)&&(!state.search||`${s.name} ${region(s.region).name} ${s.region} ${s.server_group||''}`.toLowerCase().includes(state.search)));}
function sorted(){return visible().sort((a,b)=>state.sort==='cpu'?n(b.cpu)-n(a.cpu):state.sort==='traffic'?n(month(b))-n(month(a)):state.sort==='name'?String(a.name).localeCompare(String(b.name)):n(a.sort_order)-n(b.sort_order)||String(a.id).localeCompare(String(b.id)));}
function connection(text,live=false){$('#connection').title=text;if(state.connectionText!==text){if(state.connectionText)addEvent(text,'connection');state.connectionText=text;}set($('#connection'),text);$('#connection').classList.toggle('live',live);}
function loading(active){document.documentElement.classList.toggle('is-loading',active);$('main').setAttribute('aria-busy',String(active));$('#table-skeleton').hidden=!active;if(active)$('#empty').hidden=true;else if(!state.ready)$('#empty').hidden=false;}
function notice(text=''){set($('#notice'),text);$('#notice').hidden=!text;}
function chartSetup(){
  for(const key of [...carriers,'bd']){const div=document.createElement('div');div.className='carrier-line';div.innerHTML='<span></span><strong>—</strong><svg viewBox="0 0 240 28" preserveAspectRatio="none" role="img"><title></title><path/><circle r="2"/></svg><small class="trend-note"></small><small class="trend-loss">—</small>';div.dataset.carrier=key;$('#carrier-summary').append(div);}
  for(const [key,title] of [['cpu','CPU / 平均占用'],['ram','MEMORY / 内存'],['disk','STORAGE / 磁盘'],['connections','CONNECTIONS / 连接']]){const card=document.createElement('article');card.className='resource-card';card.dataset.resource=key;card.innerHTML='<span class="eyebrow"></span><strong>—</strong><div class="resource-track"><b></b></div><small>等待数据</small>';set(card.firstElementChild,title);$('#resource-overview').append(card);}
}
function renderSummary(){
  const list=all(),live=list.filter(s=>online(s));
  set($('#stat-nodes'),String(list.length).padStart(2,'0'));set($('#stat-online'),`${live.length} 在线 / ${list.length-live.length} 离线`);
  set($('#stat-regions'),String(new Set(list.map(s=>region(s.region).code).filter(c=>c!=='XX')).size).padStart(2,'0'));
  set($('#stat-in'),`${bytes(live.length?total(live,'net_in_speed'):0,true)}`);set($('#stat-out'),`${bytes(live.length?total(live,'net_out_speed'):0,true)}`);
  const monthly=list.map(month).filter(numeric);set($('#stat-month'),allowed('show_tf')?bytes(monthly.length?monthly.reduce((a,v)=>a+v,0):null):'未公开');
  const cost=costs(list);set($('#stat-cost'),allowed('show_price')?cost.text:'未公开');$('#stat-cost').classList.toggle('multi-currency',cost.currencies>1);set($('#cost-note'),cost.missing?`${list.length-cost.missing}/${list.length} 台已配置 · 各币种分别计费`:'已配置节点 · 各币种分别计费');
  $('#online-bar').style.width=`${list.length?live.length/list.length*100:0}%`;set($('#availability'),list.length?`${Math.round(live.length/list.length*100)}%`:'—');const pattern=live.length+'/'+list.length;if($('#availability-track').dataset.pattern!==pattern){$('#availability-track').dataset.pattern=pattern;$('#availability-track').replaceChildren();for(let i=0;i<32;i++){const segment=document.createElement('i');segment.classList.toggle('off',!list.length||i>=Math.round(live.length/list.length*32));$('#availability-track').append(segment);}}
  const shown=visible().filter(s=>online(s));set($('#map-online'),shown.length);const values=shown.flatMap(s=>carriers.map(k=>s[`ping_${k}`])).filter(v=>numeric(v)&&n(v)>=0);set($('#map-latency'),`${values.length?Math.round(values.reduce((a,v)=>a+n(v),0)/values.length)+' ms':'—'} AVG`);
}
function renderRegions(){
  observeStatus();
  const groups=new Map();for(const server of all()){const code=region(server.region).code;if(!groups.has(code))groups.set(code,[]);groups.get(code).push(server);}
  set($('#region-count'),groups.size);set($('#all-count'),state.servers.size);$('#all-regions').classList.toggle('active',!state.selected);$('#all-regions').setAttribute('aria-pressed',String(!state.selected));$('#clear-region').hidden=true;
  for(const [code,list]of [...groups].sort((a,b)=>b[1].length-a[1].length)){
    let button=state.regions.get(code);if(!button){button=document.createElement('button');button.className='region';button.innerHTML='<span class="flag"></span><span class="region-info"><strong></strong><small></small></span><span class="region-count"><b></b><small></small></span>';button.querySelector('.flag').innerHTML=flag(code);button.addEventListener('click',()=>selectRegion(code));state.regions.set(code,button);$('#region-list').append(button);}
    set(button.querySelector('strong'),region(code).name);const samples=list.filter(s=>online(s)).flatMap(s=>carriers.map(k=>s['ping_'+k])).filter(v=>numeric(v)&&n(v)>=0).map(Number);set(button.querySelector('.region-info small'),samples.length?'均值 '+Math.round(samples.reduce((a,b)=>a+b,0)/samples.length)+' ms · 最低 '+Math.min(...samples)+' ms':'暂无延迟数据');set(button.querySelector('b'),list.length+' 台');set(button.querySelector('.region-count small'),Math.round(list.length/state.servers.size*100)+'%');button.setAttribute('aria-pressed',String(state.selected===code));
  }
  for(const [code,el] of state.regions)if(!groups.has(code)){el.remove();state.regions.delete(code);}
}
function selectRegion(code){state.selected=code;renderRegions();renderRows();renderAggregates();map.focus(code);}
function updateRow(s){
  const row=state.rows.get(s.id);if(!row)return;const live=online(s),r=region(s.region);row.classList.toggle('offline',!live);row.querySelector('.status-cell').setAttribute('aria-label',live?'在线':'离线');
  const f=(key,value)=>set(row.fields[key],value);
  f('region',r.code);const emblem=row.querySelector('[data-flag]');if(emblem.dataset.code!==r.code){emblem.dataset.code=r.code;emblem.innerHTML=flag(r.code);}f('name',s.name||'未命名节点');f('status',live?'在线':'离线');f('meta',`${s.server_group?s.server_group+' · ':''}${s.arch||'—'} · ${s.cpu_cores||'—'} 核 · ${bytes(numeric(s.ram_total)?n(s.ram_total)*1048576:null)}`);
  f('cpu_info',s.cpu_info);f('os',`${s.os||'—'} · ${s.kernel_version||'—'}`);f('load',`${s.load_avg||'—'} / ${numeric(s.processes)?s.processes:'—'}`);f('connections',`${numeric(s.tcp_conn)?s.tcp_conn:'—'} / ${numeric(s.udp_conn)?s.udp_conn:'—'}`);
  f('price',allowed('show_price')?(numeric(s.price)?`${s.currency||''}${Math.max(0,n(s.price))} / ${cycles[s.billing_cycle]||'?'} 个月`:'未配置'):'未公开');f('expire',allowed('show_expire')?(s.expire_date||'未配置'):'未公开');
  for(const [key,value] of [['cpu',numeric(s.cpu)?n(s.cpu):null],['ram',percent(s.ram_used,s.ram_total)],['disk',percent(s.disk_used,s.disk_total)]]){f(key,fmtPct(value));const bar=row.bars[key],width=`${Math.min(100,Math.max(0,n(value)))}%`;if(bar.style.width!==width)bar.style.width=width;bar.classList.toggle('hot',n(value)>85);}
  f('download',`${live?bytes(s.net_in_speed,true):'—'}`);f('upload',`${live?bytes(s.net_out_speed,true):'—'}`);f('net-note',live?'实时速率':'离线 · 保留最后上报');
  f('month',allowed('show_tf')?bytes(month(s)):'未公开');f('uptime',uptime(s));f('traffic-limit',allowed('show_tf')?(s.traffic_limit?`配额 ${s.traffic_limit}`:'未配置流量配额'):'');
  for(const k of carriers){f(k,`${label(k)} ${ping(s[`ping_${k}`])}${n(s[`loss_${k}`])>0?' / '+loss(s[`loss_${k}`]):''}`);row.fields[k].classList.toggle('lossy',numeric(s[`loss_${k}`])&&n(s[`loss_${k}`])>0);}
}
function renderRows(){
  renderFilters();
  const list=sorted(),ids=new Set(all().map(s=>s.id));
  for(const [id,row] of state.rows)if(!ids.has(id)){row.remove();state.rows.delete(id);state.history.delete(id);}
  for(const s of all())if(!state.rows.has(s.id)){const row=$('#node-template').content.firstElementChild.cloneNode(true);row.dataset.id=s.id;const detail=row.querySelector('details');for(const b of row.querySelectorAll('[data-detail-toggle]'))b.addEventListener('click',()=>{detail.open=!detail.open;if(detail.parentElement.classList.contains('node-detail-cell'))detail.parentElement.hidden=false;row.querySelectorAll('[data-detail-toggle]').forEach(el=>{el.setAttribute('aria-expanded',String(detail.open));if(el.classList.contains('detail-button')){el.setAttribute('aria-label',detail.open?'收起节点详情':'展开节点详情');set(el,detail.open?'收起':'详情');}});});row.fields=Object.fromEntries([...row.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e]));row.bars=Object.fromEntries([...row.querySelectorAll('[data-bar]')].map(e=>[e.dataset.bar,e]));state.rows.set(s.id,row);$('#node-list').append(row);}
  const shown=new Set(list.map(s=>s.id));for(const [id,row] of state.rows)row.hidden=!shown.has(id);
  let cursor=$('#node-list').firstElementChild;
  for(const s of list){const row=state.rows.get(s.id);if(row!==cursor)$('#node-list').insertBefore(row,cursor);cursor=row.nextElementSibling;updateRow(s);}
  set($('#node-count'),`${list.length} / ${state.servers.size}`);$('#empty').hidden=list.length>0;set($('#empty'),state.servers.size?'没有符合筛选条件的节点。':'暂无服务器，请在 CFSM 后台添加节点。');$('#reset-filters').hidden=list.length>0||!state.servers.size;
}
function record(s,ts,metrics){
  const samples=state.history.get(s.id)||[];
  if(!numeric(ts)||!metrics||![...carriers,'bd'].some(k=>Object.hasOwn(metrics,'ping_'+k)||Object.hasOwn(metrics,'loss_'+k)))return;
  const sample={ts,...Object.fromEntries([...carriers,'bd'].map(k=>[k,metrics['ping_'+k]])),loss:Object.fromEntries([...carriers,'bd'].map(k=>[k,metrics['loss_'+k]]))};
  state.history.set(s.id,windowSamples([...samples,sample]));
}
function renderNetwork(){
 const live=visible().filter(s=>online(s)),now=Date.now(),enabled=allowed('show_three_net_details');
 for(const key of [...carriers,'bd']){
  const el=$('[data-carrier="'+key+'"]'),value=avg(live,'ping_'+key);
  set(el.children[0],label(key));set(el.children[1],ping(value));set(el.querySelector('.trend-loss'),'丢包 '+loss(avg(live,'loss_'+key)));
  const {points,sources}=aggregateHistory(enabled?live.map(s=>s.id):[],state.history,key,now),svg=el.querySelector('svg'),path=el.querySelector('path'),dot=el.querySelector('circle');
  const maximum=Math.max(50,Math.ceil(Math.max(0,...points.map(p=>p.value))/50)*50);
  const x=p=>2+Math.max(0,Math.min(1,(p.ts-(now-7200000))/7200000))*236,y=p=>25-p.value/maximum*22;
  const d=points.map((p,i)=>(i&&p.bucket-points[i-1].bucket===1?'L':'M')+x(p).toFixed(1)+','+y(p).toFixed(1)).join(' ');
  if(path.getAttribute('d')!==d)path.setAttribute('d',d);
  if(points.length)svg.removeAttribute('hidden');else svg.setAttribute('hidden','');
  if(points.length){dot.setAttribute('cx',x(points.at(-1)));dot.setAttribute('cy',y(points.at(-1)));}
  set(el.querySelector('.trend-note'),!enabled?'历史未公开':points.length?'近 2 小时 · '+sources+'/'+live.length+' 台':'暂无历史');
  const description=label(key)+'延迟趋势，纵轴 0–'+maximum+' ms；每 6 分钟汇总有采样节点的均值，不补齐缺失时段。'+points.map(p=>new Date(p.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' '+Math.round(p.value)+' ms（'+p.count+'台）').join('；');
  svg.setAttribute('aria-label',description);set(svg.querySelector('title'),description);
 }
 if(state.page==='network')charts.update(all(),state.history,Object.fromEntries(carriers.map(k=>[k,label(k)])),enabled);
}
function renderResources(){
  const list=all().filter(s=>online(s));
  const values={cpu:[avg(list,'cpu'),`${n(total(list,'cpu_cores'))} 核 · ${list.length} 台在线`],ram:[percent(total(list,'ram_used'),total(list,'ram_total')),`${bytes(numeric(total(list,'ram_used'))?total(list,'ram_used')*1048576:null)} / ${bytes(numeric(total(list,'ram_total'))?total(list,'ram_total')*1048576:null)}`],disk:[percent(total(list,'disk_used'),total(list,'disk_total')),`${bytes(numeric(total(list,'disk_used'))?total(list,'disk_used')*1048576:null)} / ${bytes(numeric(total(list,'disk_total'))?total(list,'disk_total')*1048576:null)}`],connections:[null,`TCP ${total(list,'tcp_conn')??'—'} / UDP ${total(list,'udp_conn')??'—'}`]};
  for(const [key,[value,note]] of Object.entries(values)){const card=$(`[data-resource="${key}"]`);set(card.querySelector('strong'),key==='connections'?(list.length?String(n(total(list,'tcp_conn'))+n(total(list,'udp_conn'))):'—'):fmtPct(value));set(card.querySelector('small'),note);const track=card.querySelector('.resource-track');track.hidden=key==='connections';track.firstElementChild.style.width=`${n(value)}%`;}
}
function renderAggregates(){renderSummary();renderNetwork();renderResources();map.update(visible(),state.config.theme_options||{},state.selected);}
async function json(url){const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(response.status===401||response.status===403?'站点需要登录，请先打开后台登录':`读取失败（${response.status}）`);return response.json();}
async function refresh(){
  if(state.loading)return;state.loading=true;if(!state.ready)loading(true);$('#refresh').disabled=true;
  try{
    const payload=await json('/api/servers');if(!Array.isArray(payload.servers))throw Error('服务器列表格式不正确');state.sys=payload.sysConfig||{};
    const next=new Map();for(const s of payload.servers){if(!s.id)continue;const id=String(s.id),old=state.servers.get(id);next.set(id,old&&n(old.last_updated)>n(s.last_updated)?{...s,...old}:{...s,id});const samples=historyFromArrays(Array.isArray(s.ping)?s.ping:[],Array.isArray(s.loss)?s.loss:[]);state.history.set(id,windowSamples([...samples,...(state.history.get(id)||[])]));}
    state.servers=next;state.ready=true;if(state.selected&&!all().some(s=>region(s.region).code===state.selected))state.selected='';
    renderRegions();renderRows();renderAggregates();notice();set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);set($('#footer-status'),`${all().length} 个节点 · CFSM`);
    if(!state.activityBootstrapped){state.activityBootstrapped=true;addEvent(`已读取 ${all().length} 个节点`,'connection','CFSM');}
    if(state.ws?.readyState===WebSocket.OPEN){subscribe();connection('LIVE · 实时',true);}else if(!state.ws&&!state.retry)connect();
  }catch(e){notice(`${e.message}。${state.servers.size?'保留上次数据，可点击刷新重试。':'可点击刷新重试。'}`);if(!state.servers.size)set($('#empty'),'暂时无法读取节点');connection('数据暂不可用');}
  finally{state.loading=false;loading(false);$('#refresh').disabled=false;}
}
function subscribe(){const ids=[...state.servers.keys()].filter(id=>/^[a-zA-Z0-9._:-]{1,64}$/.test(id)).slice(0,500);state.ws.send(JSON.stringify({type:'subscribe',scope:'all',ids}));if(state.servers.size>500)notice('超过 500 台的节点通过定时刷新更新。');}
function connect(){
  if(state.stopped||document.hidden||state.ws)return;connection('连接中');let ws;
  try{ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws?subscribe=all`);}catch{reconnect();return;}
  state.ws=ws;const timeout=setTimeout(()=>{if(ws.readyState===WebSocket.CONNECTING)ws.close();},15000);
  ws.onopen=()=>{clearTimeout(timeout);state.attempt=0;state.lastMessage=Date.now();connection('LIVE · 实时',true);subscribe();state.heartbeat=setInterval(()=>{if(Date.now()-state.lastMessage>65000){ws.close();return;}if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ping'}));},25000);};
  ws.onmessage=event=>{state.lastMessage=Date.now();let msg;try{msg=JSON.parse(event.data);}catch{return;}if(msg.type!=='batchUpdate'||!Array.isArray(msg.updates))return;const touched=new Set();
    for(const update of msg.updates){const s=state.servers.get(String(update.serverId));if(!s)continue;for(const sample of Array.isArray(update.samples)?update.samples:[])if(mergeSample(s,sample.data??sample.payload??sample.metrics,sample.ts)){touched.add(s.id);record(s,n(sample.ts),sample.data??sample.payload??sample.metrics);}}
    if(document.hidden)return;
    for(const id of touched)updateRow(state.servers.get(id));if(touched.size){if(state.sort!=='default'||state.status!=='all'||state.quick)renderRows();renderRegions();renderAggregates();set($('#last-update'),`更新于 ${new Date().toLocaleTimeString('zh-CN')}`);}
  };
  ws.onclose=()=>{clearTimeout(timeout);clearInterval(state.heartbeat);if(state.ws===ws)state.ws=null;reconnect();};ws.onerror=()=>ws.close();
}
function reconnect(){if(state.stopped||document.hidden||state.retry)return;connection('重连中 · 定时刷新');state.retry=setTimeout(()=>{state.retry=null;connect();},Math.min(30000,1000*2**Math.min(state.attempt++,5)));}
const settings={appearance:'system',globe:'auto',motion:'normal'};try{Object.assign(settings,JSON.parse(localStorage.getItem('wxt-atlas-settings')||'{}'));}catch{}
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function applySettings(){const theme=settings.appearance==='system'?(systemTheme.matches?'dark':'light'):settings.appearance==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.dataset.motion=settings.motion;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#15191d':'#ffffff';$('#theme').innerHTML=theme==='dark'?icons.sun:icons.moon;$('#theme').setAttribute('aria-label',theme==='dark'?'切换日间主题':'切换夜间主题');$('#theme').title=theme==='dark'?'切换日间主题':'切换夜间主题';const reduced=settings.motion==='reduced';$('#motion-toggle').innerHTML=icons.spark;$('#motion-toggle').setAttribute('aria-pressed',String(reduced));$('#motion-toggle').setAttribute('aria-label',reduced?'启用动态效果':'减少动态效果');$('#motion-toggle').title=reduced?'启用动态效果':'减少动态效果';map.mode=settings.globe;map.reduced=reduced;$('.map-panel').hidden=settings.globe==='off';$('.observatory').classList.toggle('no-globe',settings.globe==='off');map.requestDraw();}
function saveSettings(){try{localStorage.setItem('wxt-atlas-settings',JSON.stringify(settings));}catch{}applySettings();}
systemTheme.addEventListener?.('change',()=>{if(settings.appearance==='system')applySettings();});
$('#theme').addEventListener('click',()=>{settings.appearance=document.documentElement.dataset.theme==='dark'?'light':'dark';saveSettings();});
$('#motion-toggle').addEventListener('click',()=>{settings.motion=settings.motion==='reduced'?'normal':'reduced';saveSettings();});
$('#activity-toggle').addEventListener('click',()=>{const button=$('#activity-toggle'),panel=$('#activity-popover'),open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)renderActivity();});
document.addEventListener('click',event=>{const panel=$('#activity-popover'),button=$('#activity-toggle');if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button&&!button.contains(event.target)){panel.hidden=true;button.setAttribute('aria-expanded','false');}});
applySettings();
$('#refresh').addEventListener('click',refresh);$('#all-regions').addEventListener('click',()=>selectRegion(''));
$('#reset-filters').addEventListener('click',()=>{state.search='';state.status='all';state.quick='';$('#search').value='';document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.status==='all')));selectRegion('');});
function renderFilters(){
 if(!allowed('show_expire')&&state.quick==='expiry')state.quick='';
 document.querySelectorAll('[data-quick]').forEach(b=>{b.setAttribute('aria-pressed',String(state.quick===b.dataset.quick));b.hidden=b.dataset.quick==='expiry'&&!allowed('show_expire');});
 const selected=new Map();if(state.status!=='all')selected.set('status',state.status==='offline'?'离线':'在线');if(state.quick)selected.set('quick',state.quick==='load'?'高负载 ≥85%':'14 天内到期（含已到期）');if(state.selected)selected.set('selected',region(state.selected).name);if(state.search)selected.set('search','搜索：'+state.search);
 for(const [key,text] of selected){let b=filterChips.get(key);if(!b){b=document.createElement('button');b.addEventListener('click',()=>{state[key]=key==='status'?'all':'';if(key==='search')$('#search').value='';document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.status===state.status)));renderRegions();renderRows();renderAggregates();});filterChips.set(key,b);$('#active-filters').append(b);}set(b,text+' ×');b.setAttribute('aria-label','清除'+text+'筛选');}
 for(const [key,b] of filterChips)if(!selected.has(key)){b.remove();filterChips.delete(key);}$('#active-filters').hidden=selected.size===0;
}
document.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>{state.quick=state.quick===b.dataset.quick?'':b.dataset.quick;renderRows();renderAggregates();}));
$('#activity-kind').addEventListener('change',renderActivity);$('#activity-search').addEventListener('input',renderActivity);
$('#search').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();renderRows();renderAggregates();});$('#clear-region').addEventListener('click',()=>selectRegion(''));document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.status;document.querySelectorAll('[data-status]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));renderRows();renderAggregates();}));$('#sort').addEventListener('change',e=>{state.sort=e.target.value;renderRows();});
function showPage(key,animate=false){
 const page=pageFromHash('#'+key),displayPage=page==='resources'?'overview':page;state.page=page;map.clearTip();
 for(const id of Object.keys(pages))if($('#'+id))$('#'+id).hidden=id!==displayPage&&!(id==='nodes'&&displayPage==='overview');set($('#page-title'),pages[displayPage]);map.active=displayPage==='overview';
 document.querySelectorAll('nav a').forEach(a=>{const active=a.getAttribute('href')==='#'+displayPage;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(map.active)map.requestDraw();if(state.servers.size)renderAggregates();
 if(animate&&settings.motion!=='reduced'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('main').animate?.([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:130,easing:'ease-out'});
}
chartSetup();
new ViewRouter(showPage);
json('/api/config').then(config=>{state.config=config||{};const title=config.site_title||'CFSM';set($('#site-title'),title);if(state.ready)renderAggregates();}).catch(()=>{});
refresh().then(()=>{if(all().length)map.focus(region(all()[0].region).code);map.init();});
const poll=setInterval(()=>{if(!document.hidden)refresh();},30000);
const age=setInterval(()=>{if(document.hidden||!state.ready)return;if(state.status!=='all'||state.quick)renderRows();else for(const s of all())updateRow(s);renderRegions();renderAggregates();},15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(state.retry);state.retry=null;clearInterval(state.heartbeat);state.ws?.close();return;}if(!document.hidden){for(const s of all())updateRow(s);renderRegions();renderAggregates();refresh();if(!state.ws&&!state.retry)connect();}});
addEventListener('pagehide',()=>{state.stopped=true;clearInterval(poll);clearInterval(age);clearInterval(state.heartbeat);clearTimeout(state.retry);state.ws?.close();});
addEventListener('pageshow',e=>{if(e.persisted)location.reload();});

const compact=matchMedia('(max-width:800px)');const foldPanels=()=>document.querySelectorAll('.regions-panel,.quality-panel').forEach(el=>el.open=!compact.matches);foldPanels();compact.addEventListener?.('change',foldPanels);
