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

document.documentElement.dataset.atlasEnhanced='0.3.5';

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
function executeCommand(i=commandIndex){const item=commandItems[i];if(!item)return;closePalette();setTimeout(()=>item.run(),0);}
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

/* Node details use the native inline disclosure in app.js. */

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
