import {numeric,n,ping,loss,online,region} from './data.js?v=0.3.6';
export const lines=['cu','ct','cm'];
const historyLines=[...lines,'bd'],windowMs=7200000;
const valid=v=>numeric(v)&&n(v)>=0;
// Only identical report times can share metrics; partial reports retain other carriers.
export function windowSamples(samples,now=Date.now(),duration=windowMs){
 const exact=new Map();
 for(const p of samples){
  if(!numeric(p?.ts)||p.ts<now-duration||p.ts>now+5000)continue;
  const ts=n(p.ts),old=exact.get(ts);if(!old){exact.set(ts,p);continue;}
  const merged={...old,ts};
  for(const key of historyLines){if(p[key]!==undefined)merged[key]=p[key];if(p.loss?.[key]!==undefined)merged.loss={...merged.loss,[key]:p.loss[key]};}
  exact.set(ts,merged);
 }
 const buckets=new Map();
 for(const p of [...exact.values()].sort((a,b)=>a.ts-b.ts)){
  const bucket=Math.floor(p.ts/30000);if(!buckets.has(bucket))buckets.set(bucket,new Map());
  for(const key of historyLines){
   if(p[key]!==undefined)buckets.get(bucket).set(key,p);
   if(p.loss?.[key]!==undefined)buckets.get(bucket).set('loss.'+key,p);
  }
 }
 const projected=new Map();
 for(const bucket of buckets.values())for(const [field,p] of bucket){
  const ts=n(p.ts),point=projected.get(ts)||{ts};
  if(field.startsWith('loss.')){const key=field.slice(5);point.loss={...point.loss,[key]:p.loss[key]};}
  else point[field]=p[field];
  projected.set(ts,point);
 }
 return [...projected.values()].sort((a,b)=>a.ts-b.ts);
}
export function historyFromArrays(pings=[],losses=[]){
 const merged=new Map();
 for(const p of pings)if(numeric(p?.ts))merged.set(n(p.ts),{...p,ts:n(p.ts)});
 for(const p of losses)if(numeric(p?.ts)){const ts=n(p.ts);merged.set(ts,{...(merged.get(ts)||{ts}),loss:p});}
 return [...merged.values()];
}
export function aggregateHistory(ids,histories,key,now=Date.now()){
 const buckets=new Map(),sources=new Set(),start=now-windowMs;
 for(const id of ids)for(const p of histories.get(id)||[]){
  if(p.ts<start||p.ts>now||!valid(p[key]))continue;
  const bucket=Math.floor((p.ts-start)/360000);if(!buckets.has(bucket))buckets.set(bucket,new Map());
  const byNode=buckets.get(bucket),values=byNode.get(id)||[];values.push(p);byNode.set(id,values);sources.add(id);
 }
 const points=[...buckets].sort((a,b)=>a[0]-b[0]).map(([bucket,byNode])=>{
  const nodes=[...byNode.values()];
  return {bucket,ts:nodes.reduce((sum,ps)=>sum+ps.reduce((v,p)=>v+n(p.ts),0)/ps.length,0)/nodes.length,value:nodes.reduce((sum,ps)=>sum+ps.reduce((v,p)=>v+n(p[key]),0)/ps.length,0)/nodes.length,count:nodes.length};
 });
 return {points,sources:sources.size};
}
export function nearestPoint(points,ts){return points.reduce((best,p)=>!best||Math.abs(p.ts-ts)<Math.abs(best.ts-ts)?p:best,null);}
const set=(el,value)=>{const text=String(value??'—');if(el.textContent!==text)el.textContent=text;};
const attr=(el,key,value)=>{value=String(value);if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
const timeFormatter=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const time=ts=>timeFormatter.format(ts);
const statusNames={healthy:'正常',warning:'高延迟或丢包',failed:'完全丢包',unknown:'指标缺失'};
const svgNS='http://www.w3.org/2000/svg';
export class NetworkCharts{
 constructor(){this.rangeMs=7200000;this.rows=new Map();this.now=Date.now();}
 createCard(key){
  const el=document.createElement('article');el.className='analysis-card';el.dataset.chart=key;
  el.innerHTML='<div class="analysis-top"><span></span><strong>—</strong></div><svg class="chart" viewBox="0 0 360 112" preserveAspectRatio="none" role="img" tabindex="0"><path class="gridline" d="M30 12H354 M30 46H354 M30 80H354"/><text class="axis-text axis-max" x="0" y="15"></text><text class="axis-text" x="10" y="83">0</text><path class="series"/><g class="samples"></g><g class="losses"></g><path class="cursor" hidden/><text class="axis-text axis-start" x="30" y="108"></text><text class="axis-text axis-end" x="354" y="108" text-anchor="end"></text></svg><div class="network-tracker" role="group" aria-label="真实采样状态，点选查看"></div><div class="chart-note"><span></span><span></span></div><div class="chart-tooltip">点选查看 · 方向键切换</div>';
  const c={el,key,points:[],samples:[],groups:[],inspecting:null,selectedStart:null,signature:null,buttons:[]};
  c.svg=el.querySelector('svg');c.path=el.querySelector('.series');c.tracker=el.querySelector('.network-tracker');c.tip=el.querySelector('.chart-tooltip');
  c.svg.addEventListener('pointermove',e=>{const r=c.svg.getBoundingClientRect();this.inspect(c,this.now-this.rangeMs+Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*360-30)/324))*this.rangeMs);});
  c.svg.addEventListener('pointerleave',()=>{c.inspecting=null;this.restoreInspection(c);});
  c.tracker.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=c.buttons.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?c.buttons.length-1:Math.max(0,Math.min(c.buttons.length-1,i+(e.key==='ArrowLeft'?-1:1)));c.buttons[next]?.focus();c.buttons[next]?.click();});
  c.svg.addEventListener('click',e=>{const r=c.svg.getBoundingClientRect();this.inspect(c,this.now-this.rangeMs+Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*360-30)/324))*this.rangeMs,true);});
  const resume=document.createElement('button');resume.className='chart-resume';resume.type='button';resume.textContent='返回实时';resume.hidden=true;el.append(resume);resume.addEventListener('click',()=>this.clearPin(c));
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();this.clearPin(c);}});
  c.svg.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const points=c.points;if(!points.length)return;
   let i=points.findIndex(p=>p.ts===(c.pin?.ts??c.inspecting));i=e.key==='Home'?0:e.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,(i<0?points.length-1:i)+(e.key==='ArrowLeft'?-1:1)));this.inspect(c,points[i].ts,true);
  });
  return c;
 }
 update(list,histories,names,enabled){
  this.now=Date.now();this.enabled=enabled;const keep=new Set(),root=document.querySelector('#network-grid');let cursor=root.firstElementChild;
  for(const s of list){
   keep.add(s.id);let row=this.rows.get(s.id);
   if(!row){
    const el=document.createElement('section');el.className='network-server';el.innerHTML='<header class="network-server-heading"><i class="status-dot" aria-hidden="true"></i><h3></h3><small></small><span class="network-server-status"></span></header><div class="analytics-grid"></div>';
    row={el,cards:lines.map(key=>this.createCard(key))};row.cards.forEach(c=>el.querySelector('.analytics-grid').append(c.el));this.rows.set(s.id,row);root.append(el);
   }
   if(row.el!==cursor)root.insertBefore(row.el,cursor);cursor=row.el.nextElementSibling;
   const live=online(s);row.el.classList.toggle('offline',!live);set(row.el.querySelector('h3'),s.name||'未命名节点');set(row.el.querySelector('header small'),region(s.region).name);set(row.el.querySelector('.network-server-status'),live?'在线':'离线 · 保留历史');
   const source=histories.get(s.id)||[];const sourceKey=JSON.stringify([enabled,this.rangeMs,Math.floor(this.now/30000),source]);if(row.sourceKey!==sourceKey){row.sourceKey=sourceKey;row.history=enabled?windowSamples(source,this.now,this.rangeMs):[];}const history=row.history;
   for(const c of row.cards){
    set(c.el.querySelector('.analysis-top span'),names[c.key]);set(c.el.querySelector('.analysis-top strong'),live?ping(s['ping_'+c.key]):'—');set(c.el.querySelector('.chart-note span:last-child'),'当前丢包 '+(live?loss(s['loss_'+c.key]):'—'));
    const samples=history.filter(p=>p[c.key]!==undefined||p.loss?.[c.key]!==undefined);
    // CPU-only updates do not rebuild the other charts.
    const signature=JSON.stringify([enabled,this.rangeMs,Math.floor(this.now/30000),samples.map(p=>[p.ts,p[c.key],p.loss?.[c.key]])]);
    const selectionKey=s.id+':'+c.key+':'+this.rangeMs;if(c.selectionKey!==selectionKey){c.selectionKey=selectionKey;c.pin=null;try{const saved=JSON.parse(sessionStorage.getItem('atlas-chart-v2:'+selectionKey)||'null');if(saved&&numeric(saved.ts)&&typeof saved.text==='string')c.pin=saved;}catch{}}
    if(!enabled){c.pin=null;try{sessionStorage.removeItem('atlas-chart-v2:'+c.selectionKey);}catch{}}
    if(c.signature===signature)continue;c.signature=signature;c.samples=samples;c.points=samples.filter(p=>valid(p[c.key]));c.groups=timeGroups(samples,c.key,this.now,this.rangeMs);this.draw(c,s.name||'未命名节点',names[c.key]);
   }
  }
  for(const [id,row] of this.rows)if(!keep.has(id)){row.el.remove();this.rows.delete(id);}
  document.querySelector('#network-empty').hidden=list.length>0;set(document.querySelector('#network-count'),list.length+' 台节点');
 }
 x(ts){return 30+Math.max(0,Math.min(1,(ts-(this.now-this.rangeMs))/this.rangeMs))*324;}
 draw(c,serverName,name){
  c.inspecting=null;
  if(!c.points.length){c.inspecting=null;c.el.querySelector('.cursor').setAttribute('hidden','');}
  const {el,key}=c,max=Math.max(50,Math.ceil(Math.max(0,...c.points.map(p=>n(p[key])))/50)*50);
  let previous=null;const path=[];for(const p of c.samples){if(!valid(p[key])){previous=null;continue;}path.push(`${previous&&p.ts-previous.ts<Math.max(900000,this.rangeMs/40)?'L':'M'}${this.x(p.ts).toFixed(1)},${(80-n(p[key])/max*68).toFixed(1)}`);previous=p;}attr(c.path,'d',path.join(' '));
  // Reuse a single path for all loss marks instead of recreating a rect per sample.
  const dots=el.querySelector('.samples');dots.replaceChildren();
  if(c.points.length===1){const p=c.points[0],dot=document.createElementNS(svgNS,'circle');attr(dot,'cx',this.x(p.ts));attr(dot,'cy',80-n(p[key])/max*68);attr(dot,'r',2);attr(dot,'class','sample-dot');dots.append(dot);}
  if(!c.lossPath){c.lossPath=document.createElementNS(svgNS,'path');attr(c.lossPath,'class','loss-mark');el.querySelector('.losses').append(c.lossPath);}
  attr(c.lossPath,'d',c.samples.filter(p=>valid(p.loss?.[key])&&n(p.loss[key])>0).map(p=>'M'+this.x(p.ts).toFixed(1)+' 85h2v5h-2z').join(' '));
  set(el.querySelector('.axis-max'),max);set(el.querySelector('.axis-start'),time(this.now-this.rangeMs));set(el.querySelector('.axis-end'),time(this.now));attr(c.svg,'aria-label',`${serverName} · ${name}延迟，单位毫秒，${c.points.length}个采样；方向键查看`);
  c.tracker.style.gridTemplateColumns=`repeat(${Math.max(1,c.groups.length)},minmax(0,1fr))`;
  while(c.buttons.length>c.groups.length)c.buttons.pop().remove();
  while(c.buttons.length<c.groups.length){const b=document.createElement('button'),i=c.buttons.length;b.type='button';b.addEventListener('click',()=>{const group=c.groups[i];const p=group?.samples.reduce((best,p)=>!best||n(p.loss?.[c.key])>n(best.loss?.[c.key])||(n(p.loss?.[c.key])===n(best.loss?.[c.key])&&n(p[c.key])>n(best[c.key]))?p:best,null);if(p&&valid(p[c.key]))this.inspect(c,p.ts,true);else if(group){c.pin={ts:(group.start+group.end)/2,value:null,text:time(group.start)+' · '+(group.samples.length?'仅丢包数据 · '+loss(group.maxLoss):'无数据')};try{sessionStorage.setItem('atlas-chart-v2:'+c.selectionKey,JSON.stringify(c.pin));}catch{}this.restoreInspection(c);}});c.buttons.push(b);c.tracker.append(b);}
  c.groups.forEach((group,i)=>{const b=c.buttons[i];b.className=group.state;const title=time(group.start)+(group.end!==group.start?'–'+time(group.end):'')+' · '+group.samples.length+' 次采样 · '+statusNames[group.state];attr(b,'title',title);attr(b,'aria-label',title);});
  set(el.querySelector('.chart-note span'),!this.enabled?'历史未公开':!c.samples.length?'暂无历史采样':c.samples.length+' 次采样 · '+c.groups.length+' 段'+(c.samples.length>24?'（保留异常）':''));
  this.restoreInspection(c);
 }
 inspectGroup(c){
  const group=c.groups.find(g=>g.start===c.selectedStart);c.groups.forEach((g,i)=>attr(c.buttons[i],'aria-pressed',g===group));
  set(c.tip,!this.enabled?'后台未开启三网详情':!c.samples.length?'暂无历史采样':!group?'点选查看 · 方向键切换':time(group.start)+(group.end!==group.start?'–'+time(group.end):'')+' · '+(group.samples.length>1?'最高 ':'')+ping(group.maxPing)+' · 丢包 '+loss(group.maxLoss)+(group.state==='unknown'?' · 指标缺失':''));
 }
 clearPin(c){c.pin=null;c.inspecting=null;try{sessionStorage.removeItem('atlas-chart-v2:'+c.selectionKey);}catch{}this.restoreInspection(c);}
 restoreInspection(c){
  c.el.querySelector('.chart-resume').hidden=!c.pin;
  if(c.pin){const cursor=c.el.querySelector('.cursor');if(c.pin.ts>=this.now-this.rangeMs&&c.pin.ts<=this.now){cursor.removeAttribute('hidden');attr(cursor,'d',`M${this.x(c.pin.ts)} 12V83`);}else cursor.setAttribute('hidden','');set(c.tip,'已锁定 · '+c.pin.text);c.groups.forEach((g,i)=>attr(c.buttons[i],'aria-pressed',c.pin.ts>=g.start&&c.pin.ts<=g.end));}
  else{c.el.querySelector('.cursor').setAttribute('hidden','');this.inspectGroup(c);}
 }
 inspect(c,ts,lock=false){
  const p=nearestPoint(c.points,ts);if(!p||(!lock&&c.inspecting===p.ts))return;c.inspecting=p.ts;
  const text=`${time(p.ts)} · ${ping(p[c.key])} · 丢包 ${loss(p.loss?.[c.key])}`;
  if(lock){c.pin={ts:p.ts,value:p[c.key],text};try{sessionStorage.setItem('atlas-chart-v2:'+c.selectionKey,JSON.stringify(c.pin));}catch{}this.restoreInspection(c);return;}
  const cursor=c.el.querySelector('.cursor');cursor.removeAttribute('hidden');attr(cursor,'d',`M${this.x(p.ts)} 12V83`);set(c.tip,text);
 }
}

// Each cell contains actual observations, never an artificially empty time slot.
export function timeGroups(samples,key,now,range){
 const points=samples.filter(p=>numeric(p.ts)&&p.ts>=now-range&&p.ts<=now&&(p[key]!==undefined||p.loss?.[key]!==undefined)).sort((a,b)=>a.ts-b.ts);
 const count=Math.min(24,points.length),groups=Array.from({length:count},()=>({samples:[],state:'unknown',maxPing:null,maxLoss:null}));
 points.forEach((p,i)=>groups[Math.floor(i*count/points.length)].samples.push(p));
 for(const g of groups){g.start=g.samples[0].ts;g.end=g.samples.at(-1).ts;for(const p of g.samples){if(valid(p[key]))g.maxPing=Math.max(g.maxPing??0,n(p[key]));if(valid(p.loss?.[key]))g.maxLoss=Math.max(g.maxLoss??0,n(p.loss[key]));}g.state=g.maxLoss>=100?'failed':g.maxPing>=200||g.maxLoss>0?'warning':g.samples.every(p=>valid(p[key])&&valid(p.loss?.[key]))?'healthy':'unknown';}
 return groups;
}
