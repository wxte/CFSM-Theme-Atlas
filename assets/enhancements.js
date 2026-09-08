const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const svg={
 search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 server:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></svg>',
 filter:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
 activity:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
 refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3.8L3 10m0 0V5m0 5h5M4 13a8 8 0 0 0 14.9 3.8L21 14m0 0v5m0-5h-5"/></svg>',
 moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.3 15.3A7.8 7.8 0 0 1 8.7 4.7 8.2 8.2 0 1 0 19.3 15.3Z"/></svg>',
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
 chart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6"/></svg>'
};

document.documentElement.dataset.atlasEnhanced='0.3.0';

/* ---------- Toasts ---------- */
const toastHost=document.createElement('div');
toastHost.id='toast-host';toastHost.className='toast-host';toastHost.setAttribute('aria-live','polite');toastHost.setAttribute('aria-relevant','additions');
document.body.append(toastHost);
const toastSeen=new Map();
function toast(text,kind='connection'){
 if(!text||/已读取\s*\d+\s*个节点/.test(text))return;
 const key=kind+'|'+text,now=Date.now();if(now-(toastSeen.get(key)||0)<4500)return;toastSeen.set(key,now);
 const el=document.createElement('div');el.className='atlas-toast '+kind;el.innerHTML='<i class="status-dot" aria-hidden="true"></i><span></span>';el.querySelector('span').textContent=text;toastHost.prepend(el);
 while(toastHost.children.length>4)toastHost.lastElementChild.remove();requestAnimationFrame(()=>el.classList.add('show'));
 setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),180);},4200);
 for(const [k,t] of toastSeen)if(now-t>30000)toastSeen.delete(k);
}
const activity=$('#activity-list');
if(activity)new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){
 if(!(node instanceof HTMLElement)||node.tagName!=='LI')continue;
 const kind=node.dataset.kind||'connection';const text=node.querySelector('.event-body span:last-child')?.textContent.trim()||node.textContent.trim();toast(text,kind);
}}).observe(activity,{childList:true});

/* ---------- Command palette ---------- */
function installHeaderSearch(){
 const actions=$('.header-actions');if(!actions||$('#command-open'))return;
 const button=document.createElement('button');button.id='command-open';button.className='icon-button command-open';button.type='button';button.innerHTML=svg.search;
 button.setAttribute('aria-label','搜索与快捷命令');button.setAttribute('aria-keyshortcuts','Control+K Meta+K');button.title='搜索与快捷命令 · ⌘K / Ctrl K';
 actions.insertBefore(button,$('#refresh')||actions.firstChild);button.addEventListener('click',openPalette);
 for(const span of $$('.search > span')){span.classList.add('search-icon');span.innerHTML=svg.search;}
}

const palette=document.createElement('dialog');palette.id='command-palette';palette.className='command-palette';palette.setAttribute('aria-label','搜索与快捷命令');
palette.innerHTML=`<div class="command-shell"><div class="command-input-row">${svg.search}<input id="command-input" type="search" autocomplete="off" spellcheck="false" placeholder="搜索节点或执行命令…" aria-label="搜索节点或执行命令"><kbd>ESC</kbd></div><div id="command-results" class="command-results" role="listbox"></div><div class="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 执行</span><span><kbd>⌘</kbd><kbd>K</kbd> 打开</span></div></div>`;
document.body.append(palette);
const commandInput=$('#command-input'),commandResults=$('#command-results');let commandItems=[],commandIndex=0;

function clickSelector(selector){const el=$(selector);if(!el||el.disabled)return false;el.click();return true;}
function navigate(hash){location.hash=hash;setTimeout(()=>$(hash)?.scrollIntoView({behavior:'smooth',block:'start'}),40);}
function setSearch(value){const input=$('#search');if(!input)return;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));navigate('#nodes');}
function clearFilters(){
 const input=$('#search');if(input&&input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
 const all=$('[data-status="all"]');if(all?.getAttribute('aria-pressed')!=='true')all.click();
 for(const b of $$('[data-quick][aria-pressed="true"]'))b.click();
 const regions=$('#all-regions');if(regions?.getAttribute('aria-pressed')!=='true')regions.click();
}
function staticCommands(){return [
 {title:'跳到概览',meta:'页面',keywords:'overview 首页',icon:svg.arrow,run:()=>navigate('#overview')},
 {title:'跳到节点',meta:'页面',keywords:'nodes server',icon:svg.arrow,run:()=>navigate('#nodes')},
 {title:'跳到网络',meta:'页面',keywords:'network latency ping',icon:svg.arrow,run:()=>navigate('#network')},
 {title:'刷新节点数据',meta:'操作',keywords:'refresh reload',icon:svg.refresh,run:()=>clickSelector('#refresh')},
 {title:'切换明暗主题',meta:'外观',keywords:'theme dark light 夜间 日间',icon:svg.moon,run:()=>clickSelector('#theme')},
 {title:'切换动态效果',meta:'外观',keywords:'motion 动画 reduced',icon:svg.activity,run:()=>clickSelector('#motion-toggle')},
 {title:'查看最近活动',meta:'观测',keywords:'activity event 活动',icon:svg.activity,run:()=>clickSelector('#activity-toggle')},
 {title:'只看在线节点',meta:'筛选',keywords:'online',icon:svg.filter,run:()=>{clickSelector('[data-status="online"]');navigate('#nodes');}},
 {title:'只看离线节点',meta:'筛选',keywords:'offline',icon:svg.filter,run:()=>{clickSelector('[data-status="offline"]');navigate('#nodes');}},
 {title:'高负载节点',meta:'CPU / RAM / DISK ≥85%',keywords:'load cpu ram disk',icon:svg.activity,run:()=>{const b=$('[data-quick="load"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();navigate('#nodes');}},
 {title:'14 天内到期',meta:'含已到期',keywords:'expiry expire 到期',icon:svg.activity,run:()=>{const b=$('[data-quick="expiry"]');if(b&&!b.hidden&&b.getAttribute('aria-pressed')!=='true')b.click();navigate('#nodes');}},
 {title:'清除全部筛选',meta:'恢复全部节点',keywords:'reset clear',icon:svg.filter,run:clearFilters}
];}
function nodeCommands(){return $$('.node-row').map(row=>{
 const name=$('[data-field="name"]',row)?.textContent.trim()||'未命名节点',meta=$('[data-field="meta"]',row)?.textContent.trim()||'',region=$('[data-field="region"]',row)?.textContent.trim()||'',status=$('[data-field="status"]',row)?.textContent.trim()||'',id=row.dataset.id||'';
 return{title:name,meta:[region,status,meta].filter(Boolean).join(' · '),icon:svg.server,keywords:(name+' '+region+' '+meta+' '+status+' '+id).toLowerCase(),run:()=>{
  clearFilters();setSearch(name);setTimeout(()=>{const target=$$('.node-row').find(r=>(r.dataset.id||'')===id)||$$('.node-row').find(r=>$('[data-field="name"]',r)?.textContent.trim()===name);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.querySelector('[data-detail-toggle]')?.focus();},100);
 }};
});}
function renderCommands(){
 const q=commandInput.value.trim().toLowerCase();const items=[...staticCommands(),...nodeCommands()].filter(item=>!q||(item.title+' '+item.meta+' '+(item.keywords||'')).toLowerCase().includes(q)).slice(0,32);
 commandItems=items;commandIndex=Math.min(commandIndex,Math.max(0,items.length-1));commandResults.replaceChildren();
 if(!items.length){const empty=document.createElement('p');empty.className='command-empty';empty.textContent='没有匹配的节点或命令';commandResults.append(empty);return;}
 items.forEach((item,i)=>{const button=document.createElement('button');button.type='button';button.className='command-item';button.setAttribute('role','option');button.setAttribute('aria-selected',String(i===commandIndex));button.innerHTML=`<span class="command-item-icon">${item.icon}</span><span><strong></strong><small></small></span>`;button.querySelector('strong').textContent=item.title;button.querySelector('small').textContent=item.meta;button.addEventListener('pointerenter',()=>{commandIndex=i;syncCommandSelection();});button.addEventListener('click',()=>executeCommand(i));commandResults.append(button);});syncCommandSelection();
}
function syncCommandSelection(){for(const [i,b] of $$('.command-item',commandResults).entries())b.setAttribute('aria-selected',String(i===commandIndex));$('.command-item[aria-selected="true"]',commandResults)?.scrollIntoView({block:'nearest'});}
function executeCommand(i=commandIndex){const item=commandItems[i];if(!item)return;closePalette();item.run();}
function openPalette(){if(!palette.open){if(typeof palette.showModal==='function')palette.showModal();else palette.setAttribute('open','');}commandInput.value='';commandIndex=0;renderCommands();requestAnimationFrame(()=>commandInput.focus());}
function closePalette(){if(!palette.open)return;if(typeof palette.close==='function')palette.close();else palette.removeAttribute('open');}
commandInput.addEventListener('input',()=>{commandIndex=0;renderCommands();});
commandInput.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();commandIndex=Math.min(commandItems.length-1,commandIndex+1);syncCommandSelection();}else if(e.key==='ArrowUp'){e.preventDefault();commandIndex=Math.max(0,commandIndex-1);syncCommandSelection();}else if(e.key==='Enter'){e.preventDefault();executeCommand();}});
palette.addEventListener('click',e=>{if(e.target===palette)closePalette();});
palette.addEventListener('cancel',()=>setTimeout(()=>commandInput.blur(),0));
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.open?closePalette():openPalette();return;}
 if(e.key==='/'&&!palette.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();openPalette();}
});

/* ---------- Live node drawer ---------- */
const drawer=document.createElement('div');drawer.id='node-drawer-layer';drawer.className='node-drawer-layer';drawer.hidden=true;
drawer.innerHTML=`<button class="drawer-backdrop" type="button" aria-label="关闭节点详情"></button><aside class="node-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><header><div><span class="eyebrow">NODE INSPECT</span><h2 id="drawer-title">节点详情</h2><small id="drawer-meta"></small></div><button id="drawer-close" class="icon-button" type="button" aria-label="关闭节点详情">${svg.close}</button></header><div class="drawer-actions"><button id="drawer-network" type="button">${svg.chart}<span>网络分析</span></button><button id="drawer-copy" type="button">${svg.copy}<span>复制详情</span></button></div><div id="drawer-body" class="drawer-body"></div></aside>`;
document.body.append(drawer);
const drawerFields=[['状态','status'],['地区','region'],['实时下行','download'],['实时上行','upload'],['CPU','cpu'],['内存','ram'],['磁盘','disk'],['本月流量','month'],['联通','cu'],['电信','ct'],['移动','cm'],['运行时间','uptime'],['CPU 型号','cpu_info'],['系统','os'],['负载 / 进程','load'],['TCP / UDP','connections'],['价格','price'],['到期','expire'],['流量配额','traffic-limit'],['数据状态','net-note']];
const drawerValueEls=new Map();let drawerRow=null,drawerTrigger=null,drawerName='',drawerMeta='';
function buildDrawer(){
 const body=$('#drawer-body');body.replaceChildren();drawerValueEls.clear();
 const top=document.createElement('div');top.className='drawer-snapshot';for(const key of ['download','upload','cpu','ram','disk']){const card=document.createElement('div'),label={download:'↓ 下行',upload:'↑ 上行',cpu:'CPU',ram:'RAM',disk:'DISK'}[key];card.innerHTML='<small></small><strong></strong>';card.querySelector('small').textContent=label;drawerValueEls.set('snapshot:'+key,card.querySelector('strong'));top.append(card);}body.append(top);
 const dl=document.createElement('dl');dl.className='drawer-details';for(const [label,key] of drawerFields){const wrap=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;wrap.append(dt,dd);dl.append(wrap);drawerValueEls.set(key,dd);drawerValueEls.set('wrap:'+key,wrap);}body.append(dl);
}
function syncDrawer(){
 if(!drawerRow||drawer.hidden||!document.documentElement.contains(drawerRow))return;
 drawerName=$('[data-field="name"]',drawerRow)?.textContent.trim()||'节点详情';drawerMeta=$('[data-field="meta"]',drawerRow)?.textContent.trim()||'';$('#drawer-title').textContent=drawerName;$('#drawer-meta').textContent=drawerMeta;
 for(const key of ['download','upload','cpu','ram','disk']){const value=$(`[data-field="${key}"]`,drawerRow)?.textContent.trim()||'—';const el=drawerValueEls.get('snapshot:'+key);if(el&&el.textContent!==value)el.textContent=value;}
 for(const [,key] of drawerFields){const value=$(`[data-field="${key}"]`,drawerRow)?.textContent.trim()||'';const dd=drawerValueEls.get(key),wrap=drawerValueEls.get('wrap:'+key);if(dd&&dd.textContent!==value)dd.textContent=value||'—';if(wrap)wrap.hidden=!value;}
}
function openDrawer(row,trigger){
 drawerRow=row;drawerTrigger=trigger||document.activeElement;buildDrawer();syncDrawer();drawer.hidden=false;document.documentElement.classList.add('drawer-open');requestAnimationFrame(()=>drawer.classList.add('is-open'));$('#drawer-close').focus();
}
function closeDrawer(){
 if(drawer.hidden)return;drawer.classList.remove('is-open');document.documentElement.classList.remove('drawer-open');const restore=drawerTrigger;drawerRow=null;setTimeout(()=>{drawer.hidden=true;restore?.focus?.({preventScroll:true});},180);
}
$('#drawer-close').addEventListener('click',closeDrawer);$('.drawer-backdrop',drawer).addEventListener('click',closeDrawer);
$('#drawer-network').addEventListener('click',()=>{const name=drawerName;closeDrawer();navigate('#network');setTimeout(()=>{const target=$$('.network-server').find(el=>$('h3',el)?.textContent.trim()===name);target?.scrollIntoView({behavior:'smooth',block:'start'});target?.querySelector('svg[tabindex="0"]')?.focus({preventScroll:true});},180);});
async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch{return false;}}
$('#drawer-copy').addEventListener('click',async()=>{
 if(!drawerRow)return;const lines=[drawerName,drawerMeta];for(const [label,key] of drawerFields){const value=$(`[data-field="${key}"]`,drawerRow)?.textContent.trim();if(value)lines.push(`${label}: ${value}`);}const ok=await copyText(lines.filter(Boolean).join('\n'));toast(ok?`已复制 ${drawerName} 详情`:'复制失败，请手动选择文本',ok?'recovery':'warning');
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden&&!palette.open){e.preventDefault();closeDrawer();}});
drawer.addEventListener('keydown',e=>{if(e.key!=='Tab'||drawer.hidden)return;const focusable=$$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',$('.node-drawer',drawer)).filter(el=>!el.disabled&&!el.hidden);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
document.addEventListener('click',e=>{const target=e.target instanceof Element?e.target.closest('[data-detail-toggle]'):null;if(!target)return;const row=target.closest('.node-row');if(!row)return;e.preventDefault();e.stopImmediatePropagation();openDrawer(row,target);},true);
let drawerSyncQueued=false;const nodeList=$('#node-list');if(nodeList)new MutationObserver(()=>{if(drawer.hidden||drawerSyncQueued)return;drawerSyncQueued=true;requestAnimationFrame(()=>{drawerSyncQueued=false;syncDrawer();});}).observe(nodeList,{subtree:true,childList:true,characterData:true});
let touchStart=null;$('.node-drawer header',drawer)?.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});$('.node-drawer header',drawer)?.addEventListener('touchend',e=>{if(!touchStart||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(innerWidth<=800&&dy>70&&Math.abs(dx)<60)closeDrawer();},{passive:true});

/* ---------- Relative last-updated ---------- */
const updateEl=$('#last-update');let lastUpdatedAt=0;
function captureUpdate(){
 if(!updateEl)return false;const text=updateEl.textContent.trim();if(!text.startsWith('更新于'))return false;lastUpdatedAt=Date.now();updateEl.dataset.exact=text.replace(/^更新于\s*/, '');return true;
}
function renderRelativeTime(){
 if(!updateEl||!lastUpdatedAt)return;const sec=Math.max(0,Math.floor((Date.now()-lastUpdatedAt)/1000));let text='刚刚更新';if(sec>=10&&sec<60)text=`${sec} 秒前更新`;else if(sec>=60&&sec<3600)text=`${Math.floor(sec/60)} 分钟前更新`;else if(sec>=3600)text=`${Math.floor(sec/3600)} 小时前更新`;
 if(updateEl.textContent!==text)updateEl.textContent=text;updateEl.title=updateEl.dataset.exact?`最近更新：${updateEl.dataset.exact}`:'';updateEl.setAttribute('aria-label',updateEl.title||text);
}
if(updateEl){new MutationObserver(()=>{if(captureUpdate())renderRelativeTime();}).observe(updateEl,{childList:true,characterData:true,subtree:true});if(captureUpdate())renderRelativeTime();setInterval(renderRelativeTime,5000);}

/* ---------- Region clear fallback ---------- */
function syncClearRegion(){const clear=$('#clear-region');if(!clear)return;const active=$('.region[aria-pressed="true"]');const shouldHide=!active;if(clear.hidden!==shouldHide)clear.hidden=shouldHide;}
const regionList=$('#region-list'),allRegions=$('#all-regions'),clearRegion=$('#clear-region');
if(regionList&&clearRegion){const observer=new MutationObserver(()=>queueMicrotask(syncClearRegion));observer.observe(regionList,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});observer.observe(clearRegion,{attributes:true,attributeFilter:['hidden']});if(allRegions)observer.observe(allRegions,{attributes:true,attributeFilter:['aria-pressed']});syncClearRegion();}

installHeaderSearch();window.addEventListener('pageshow',installHeaderSearch);
