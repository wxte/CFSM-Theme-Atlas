import {numeric,n,bytes} from './data.js?v=0.3.5';
import {nodeObservations,selections,scheduleSave,observations} from './trend-store.js?v=0.3.5';
const keys=['cpu','net_in_speed','net_out_speed'],models=new Map();
export function recordResources(id,ts,metrics){
 if(!numeric(ts)||!metrics||!keys.some(k=>Object.hasOwn(metrics,k)))return;
 const state=nodeObservations(id),points=state.resources;
 if(points.length&&ts<points.at(-1).ts)return;
 const point={ts:Number(ts)};
 for(const k of keys)if(Object.hasOwn(metrics,k))point[k]=numeric(metrics[k])&&n(metrics[k])>=0?n(metrics[k]):null;
 if(points.at(-1)?.ts===point.ts&&Object.keys(point).every(k=>points.at(-1)[k]===point[k]))return;
 if(points.at(-1)?.ts===point.ts)Object.assign(points.at(-1),point);else points.push(point);
 state.resources=points.slice(-60);state.resourceVersion=(state.resourceVersion||0)+1;scheduleSave();
}
export function sparkPath(points,key,scale){
 const valid=points.filter(p=>numeric(p[key])&&n(p[key])>=0);if(valid.length<2)return '';
 const max=scale||(key==='cpu'?Math.max(100,...valid.map(p=>n(p[key]))):Math.max(1024,...valid.map(p=>n(p[key]))));let previous=null;
 return points.map((p,i)=>{if(!numeric(p[key])||n(p[key])<0){previous=null;return '';}
 const command=previous&&p.ts-previous.ts<=300000?'L':'M';previous=p;
 return `${command}${(2+(60-points.length+i)/59*116).toFixed(2)},${(30-Math.min(max,n(p[key]))/max*26).toFixed(2)}`;}).join(' ');
}
export function recentSamples(history){const exact=new Map();for(const p of history)if(Number.isFinite(p?.ts)){const old=exact.get(p.ts)||{};const point={...old,ts:p.ts,loss:{...old.loss}};for(const k of ['cu','ct','cm','bd']){if(p[k]!==undefined)point[k]=p[k];if(p.loss?.[k]!==undefined)point.loss[k]=p.loss[k];}exact.set(p.ts,point);}return [...exact.values()].sort((a,b)=>a.ts-b.ts).slice(-60);}
export function sampleState(p){
 const pairs=['cu','ct','cm'].map(k=>[p[k],p.loss?.[k]]);
 if(pairs.some(([,l])=>numeric(l)&&n(l)>=100))return 'failed';
 if(pairs.some(([v,l])=>numeric(v)&&n(v)>=200||numeric(l)&&n(l)>0))return 'warning';
 return pairs.every(([v,l])=>numeric(v)&&n(v)>=0&&numeric(l)&&n(l)===0)?'healthy':'unknown';
}
const sampleTime=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const describe=p=>sampleTime.format(p.ts)+' · '+['cu','ct','cm'].map((k,i)=>`${['联通','电信','移动'][i]} ${numeric(p[k])?p[k]+' ms':'—'} / 丢包 ${numeric(p.loss?.[k])?p.loss[k]+'%':'—'}`).join(' · ');
export function renderNodeTrends(row,s,history,enabled){
 const detail=row.querySelector('.node-detail');
 const store=nodeObservations(s.id);
 const model=models.get(s.id);
 if(!model||model.history!==history||model.enabled!==enabled||store.network[0]?.ts<Date.now()-7200000){
  const network=enabled?recentSamples([...store.network,...history].filter(p=>p.ts>=Date.now()-7200000)):[];
  const signature=JSON.stringify(network);if(signature!==store.networkSignature){store.network=network;store.networkSignature=signature;store.networkVersion=(store.networkVersion||0)+1;scheduleSave();}
 }
 if(!enabled)selections.delete(s.id);
 models.set(s.id,{enabled,history});if(!detail?.open)return;let box=detail.querySelector('.node-trends');if(!box){box=document.createElement('div');box.className='node-trends inline-trends';detail.prepend(box);}renderTrendBox(box,s.id);
}
export function renderTrendBox(box,id){
 const store=nodeObservations(id),enabled=models.get(id)?.enabled!==false;
 const points=store.resources,samples=enabled?store.network:[];
 if(box.dataset.node!==id)box.dataset.node=id;
 if(!box.querySelector('.node-sample-track')){
  box.innerHTML='<div class="node-sparks"></div><div class="node-sample-track" role="slider" tabindex="0" aria-label="最近60次网络采样；方向键查看，Esc返回实时" aria-valuemin="1" aria-valuemax="60" aria-valuenow="60"></div><small class="node-sample-note"></small><button class="trend-live" type="button" hidden>返回实时</button>';
  const row=box.querySelector('.node-sparks');
  for(const [key,label] of [['cpu','CPU'],['net_in_speed','↓ 下行'],['net_out_speed','↑ 上行']]){const el=document.createElement('span');el.className='node-spark';el.dataset.metric=key;el.innerHTML='<small></small><svg viewBox="0 0 120 34" role="img" preserveAspectRatio="none"><path class="spark-baseline" d="M2 30H118"/><path class="spark-series"/></svg>';el.firstChild.textContent=label;row.append(el);}
  const track=box.querySelector('.node-sample-track');for(let i=0;i<60;i++)track.append(document.createElement('span'));
 }
 const resourceKey=String(store.resourceVersion||0);if(box.dataset.resourceVersion!==resourceKey){box.dataset.resourceVersion=resourceKey;
 const rateMax=Math.max(1024,...points.flatMap(p=>[n(p.net_in_speed),n(p.net_out_speed)]));
 for(const key of keys){const el=box.querySelector(`[data-metric="${key}"]`),path=sparkPath(points,key,key==='cpu'?100:rateMax);el.querySelector('.spark-series').setAttribute('d',path);const label=(key==='cpu'?'CPU 0–100%':(key==='net_in_speed'?'下行':'上行')+' 0–'+bytes(rateMax,true))+' · 最近60次资源上报'+(path?'':' · 等待两次有效上报');el.title=label;el.querySelector('svg').setAttribute('aria-label',label);}
 }
 const selected=selections.get(id),networkKey=[store.networkVersion||0,enabled,selected?.ts??''].join(':');if(box.dataset.networkVersion===networkKey)return;box.dataset.networkVersion=networkKey;
 const track=box.querySelector('.node-sample-track');
 let selectedIndex=-1;
 for(let i=0;i<60;i++){const p=samples[i-(60-samples.length)],cell=track.children[i];cell.className=p?sampleState(p):'unknown';cell.title=p?describe(p):'无数据';cell.dataset.ts=p?.ts??'';if(p&&selected?.ts===p.ts){cell.classList.add('selected');selectedIndex=i;}}
 track.setAttribute('aria-valuenow',String(selectedIndex<0?60:selectedIndex+1));track.setAttribute('aria-valuetext',selected?describe(selected):'实时 · '+samples.length+'次网络采样');
 box.querySelector('.node-sample-note').textContent=selected?'已锁定 · '+describe(selected)+(selectedIndex<0?' · 已移出最近60格':''):enabled?`${samples.length}/60 次网络采样 · 点按 / 方向键查看`:'网络历史未公开';
 box.querySelector('.trend-live').hidden=!selected;
}
if(typeof document!=='undefined'){
 const repaint=id=>document.querySelectorAll('.node-trends').forEach(box=>{if(box.dataset.node===id)renderTrendBox(box,id);});
 const inspect=(track,index)=>{const id=track.closest('.node-trends').dataset.node,points=nodeObservations(id).network;index=Math.max(60-points.length,Math.min(59,index));const p=points[index-(60-points.length)];if(p){selections.set(id,structuredClone(p));scheduleSave();repaint(id);}};
 document.addEventListener('pointerdown',event=>{const track=event.target.closest('.node-sample-track');if(!track)return;track.focus({preventScroll:true});const rect=track.getBoundingClientRect();inspect(track,Math.floor((event.clientX-rect.left)/rect.width*60));});
 document.addEventListener('click',event=>{const button=event.target.closest('.trend-live');if(!button)return;const box=button.closest('.node-trends');selections.delete(box.dataset.node);scheduleSave();repaint(box.dataset.node);box.querySelector('.node-sample-track').focus({preventScroll:true});});
 document.addEventListener('keydown',event=>{const track=event.target.closest('.node-sample-track');if(!track)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();const id=track.closest('.node-trends').dataset.node;selections.delete(id);scheduleSave();repaint(id);return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();inspect(track,event.key==='Home'?0:event.key==='End'?59:Number(track.getAttribute('aria-valuenow'))-1+(event.key==='ArrowLeft'?-1:1));});
}
