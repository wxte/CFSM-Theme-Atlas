import {numeric,n} from './data.js?v=0.3.1';
const resources=new Map(),keys=['cpu','net_in_speed','net_out_speed'];
export function recordResources(id,ts,metrics){
 if(!numeric(ts)||!metrics||!keys.some(k=>Object.hasOwn(metrics,k)))return;
 const points=resources.get(id)||[];
 if(points.length&&ts<points.at(-1).ts)return;
 const point={ts:Number(ts)};
 for(const k of keys)if(Object.hasOwn(metrics,k))point[k]=numeric(metrics[k])&&n(metrics[k])>=0?n(metrics[k]):null;
 if(points.at(-1)?.ts===point.ts)Object.assign(points.at(-1),point);else points.push(point);
 resources.set(id,points.slice(-60));
}
export function sparkPath(points,key){
 const valid=points.filter(p=>numeric(p[key])&&n(p[key])>=0);if(valid.length<2)return '';
 const max=key==='cpu'?Math.max(100,...valid.map(p=>n(p[key]))):Math.max(1,...valid.map(p=>n(p[key])));
 const start=points[0].ts,span=Math.max(1,points.at(-1).ts-start);let previous=null;
 return points.map(p=>{if(!numeric(p[key])||n(p[key])<0){previous=null;return '';}
 const command=previous&&p.ts-previous.ts<=300000?'L':'M';previous=p;
 return `${command}${(2+(p.ts-start)/span*116).toFixed(2)},${(30-n(p[key])/max*28).toFixed(2)}`;}).join(' ');
}
export function recentSamples(history){return [...history].sort((a,b)=>a.ts-b.ts).slice(-60);}
export function sampleState(p){
 const pairs=['cu','ct','cm'].map(k=>[p[k],p.loss?.[k]]);
 if(pairs.some(([,l])=>numeric(l)&&n(l)>=100))return 'failed';
 if(pairs.some(([v,l])=>numeric(v)&&n(v)>=200||numeric(l)&&n(l)>0))return 'warning';
 return pairs.every(([v,l])=>numeric(v)&&n(v)>=0&&numeric(l)&&n(l)===0)?'healthy':'unknown';
}
export function renderNodeTrends(row,s,history,enabled){
 let box=row.querySelector('.node-trends');if(!box){box=document.createElement('div');box.className='node-trends';row.querySelector('.node-main').append(box);}
 const points=resources.get(s.id)||[],samples=enabled?recentSamples(history):[];
 const signature=JSON.stringify([points,samples,enabled]);if(box.dataset.signature===signature)return;box.dataset.signature=signature;box.replaceChildren();
 for(const [key,label] of [['cpu','CPU'],['net_in_speed','↓'],['net_out_speed','↑']]){
  const item=document.createElement('span');item.className='node-spark';const path=sparkPath(points,key);
  item.innerHTML=`<small></small><svg viewBox="0 0 120 34" role="img" preserveAspectRatio="none"><path fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
  item.firstChild.textContent=label;item.querySelector('path').setAttribute('d',path);item.querySelector('svg').setAttribute('aria-label',label+(path?' · 当前会话真实上报趋势':' · 等待两次真实上报'));item.title=label+' · 当前会话最近60次资源上报';box.append(item);
 }
 const tracker=document.createElement('div');tracker.className='node-sample-track';tracker.tabIndex=0;tracker.setAttribute('role','slider');tracker.setAttribute('aria-valuemin','1');tracker.setAttribute('aria-valuemax','60');tracker.setAttribute('aria-valuenow','60');tracker.setAttribute('aria-label','最近60次真实网络采样，方向键或点按查看，空格为无数据');
 for(let i=0;i<60;i++){const p=samples[i-(60-samples.length)],cell=document.createElement('span');cell.className=p?sampleState(p):'unknown';cell.title=p?new Date(p.ts).toLocaleString('zh-CN')+' · '+['cu','ct','cm'].map((k,i)=>`${['联通','电信','移动'][i]} ${numeric(p[k])?p[k]+' ms':'—'} / Loss ${numeric(p.loss?.[k])?p.loss[k]+'%':'—'}`).join(' · '):'无数据';tracker.append(cell);}box.append(tracker);
 const note=document.createElement('small');note.className='node-sample-note';note.textContent=enabled?`${samples.length}/60 次网络采样 · 点按或方向键查看`:'网络历史未公开';box.append(note);
}
if(typeof document!=='undefined'){
 const inspect=(track,index)=>{index=Math.max(0,Math.min(59,index));track.setAttribute('aria-valuenow',index+1);const text=track.children[index].title;track.setAttribute('aria-valuetext',text);track.parentElement.querySelector('.node-sample-note').textContent=text;};
 document.addEventListener('pointerdown',event=>{const track=event.target.closest('.node-sample-track');if(!track)return;const rect=track.getBoundingClientRect();inspect(track,Math.floor((event.clientX-rect.left)/rect.width*60));});
 document.addEventListener('keydown',event=>{const track=event.target.closest('.node-sample-track');if(!track||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();inspect(track,event.key==='Home'?0:event.key==='End'?59:Number(track.getAttribute('aria-valuenow'))-1+(event.key==='ArrowLeft'?-1:1));});
}
