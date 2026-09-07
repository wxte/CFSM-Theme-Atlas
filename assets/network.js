import {numeric,n,ping,loss,online} from './data.js';
export const lines=['cu','ct','cm'];
export function windowSamples(samples,now=Date.now()){
  const buckets=new Map();
  for(const p of samples){if(!numeric(p.ts)||p.ts<now-7200000||p.ts>now+5000)continue;const bucket=Math.floor(p.ts/30000),old=buckets.get(bucket);if(!old||p.ts>=old.ts)buckets.set(bucket,p);}
  return [...buckets.values()].sort((a,b)=>a.ts-b.ts).slice(-241);
}
export function nearestPoint(points,ts){return points.reduce((best,p)=>!best||Math.abs(p.ts-ts)<Math.abs(best.ts-ts)?p:best,null);}
const set=(el,value)=>{const text=String(value??'—');if(el.textContent!==text)el.textContent=text;};
const time=ts=>new Date(ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
const svgNS='http://www.w3.org/2000/svg';
export class NetworkCharts{
  constructor(){this.selected='';this.buttons=new Map();this.cards=new Map();this.list=[];this.histories=new Map();this.names={};
    for(const key of lines){const card=document.createElement('article');card.className='analysis-card';card.dataset.chart=key;
      card.innerHTML='<div class="analysis-top"><span></span><strong>—</strong></div><svg class="chart" viewBox="0 0 360 130" preserveAspectRatio="none" role="img" tabindex="0"><path class="gridline" d="M30 12H354 M30 56H354 M30 100H354"/><text class="axis-text axis-max" x="0" y="15"></text><text class="axis-text" x="10" y="103">0</text><path class="series"/><g class="samples"></g><g class="losses"></g><path class="cursor" hidden/><text class="axis-text axis-start" x="30" y="125"></text><text class="axis-text axis-end" x="354" y="125" text-anchor="end"></text></svg><div class="chart-tooltip">悬停或触摸查看采样</div><div class="chart-note"><span>等待数据</span><span>丢包 —</span></div>';
      const svg=card.querySelector('svg');svg.addEventListener('pointermove',e=>{const bounds=svg.getBoundingClientRect();const x=(e.clientX-bounds.left)/bounds.width*360;this.inspect(key,this.now-7200000+Math.max(0,Math.min(1,(x-30)/324))*7200000);});
      svg.addEventListener('pointerleave',()=>{card.querySelector('.cursor').setAttribute('hidden','');set(card.querySelector('.chart-tooltip'),'悬停或触摸查看采样');this.cards.get(key).inspecting=null;});
      svg.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const c=this.cards.get(key),points=c.points;if(!points.length)return;let index=points.findIndex(p=>p.ts===c.inspecting);index=e.key==='Home'?0:e.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,(index<0?points.length-1:index)+(e.key==='ArrowLeft'?-1:1)));this.inspect(key,points[index].ts);});
      document.querySelector('#network-grid').append(card);this.cards.set(key,{el:card,points:[],inspecting:null});
    }
  }
  update(list,histories,names,enabled){this.list=list;this.histories=histories;this.names=names;this.enabled=enabled;this.now=Date.now();
    if(!list.some(s=>s.id===this.selected))this.selected=list[0]?.id||'';
    const keep=new Set();for(const s of list){keep.add(s.id);let b=this.buttons.get(s.id);if(!b){b=document.createElement('button');b.addEventListener('click',()=>{this.selected=s.id;this.update(this.list,this.histories,this.names,this.enabled);});this.buttons.set(s.id,b);document.querySelector('#network-nodes').append(b);}set(b,s.name||'未命名');b.setAttribute('aria-pressed',String(s.id===this.selected));}
    for(const [id,b] of this.buttons)if(!keep.has(id)){b.remove();this.buttons.delete(id);}
    const server=list.find(s=>s.id===this.selected);
    for(const key of lines){const c=this.cards.get(key),card=c.el;set(card.querySelector('.analysis-top span'),names[key]);set(card.querySelector('.analysis-top strong'),server&&online(server)?ping(server['ping_'+key]):'—');
      c.points=enabled?windowSamples(histories.get(this.selected)||[],this.now).filter(p=>numeric(p[key])&&n(p[key])>=0):[];
      if(!c.points.length){c.inspecting=null;card.querySelector('.cursor').setAttribute('hidden','');}
      const max=Math.max(50,Math.ceil(Math.max(0,...c.points.map(p=>n(p[key])))/50)*50);c.max=max;
      const x=p=>30+Math.max(0,Math.min(1,(p.ts-(this.now-7200000))/7200000))*324;
      const d=c.points.map((p,i)=>`${i&&p.ts-c.points[i-1].ts<900000?'L':'M'}${x(p).toFixed(1)},${(100-n(p[key])/max*88).toFixed(1)}`).join(' ');const path=card.querySelector('.series');if(path.getAttribute('d')!==d)path.setAttribute('d',d);
      const dots=card.querySelector('.samples');dots.replaceChildren();for(const p of c.points){if(c.points.length>30)break;const dot=document.createElementNS(svgNS,'circle');dot.setAttribute('cx',x(p));dot.setAttribute('cy',100-n(p[key])/max*88);dot.setAttribute('r','2');dot.setAttribute('class','sample-dot');dots.append(dot);}
      const losses=card.querySelector('.losses');losses.replaceChildren();for(const p of enabled?windowSamples(histories.get(this.selected)||[],this.now):[]){if(!numeric(p.loss?.[key])||n(p.loss[key])<=0)continue;const mark=document.createElementNS(svgNS,'rect');mark.setAttribute('x',x(p));mark.setAttribute('y','105');mark.setAttribute('width','3');mark.setAttribute('height','5');mark.setAttribute('class','loss-mark');losses.append(mark);}
      set(card.querySelector('.axis-max'),max);set(card.querySelector('.axis-start'),time(this.now-7200000));set(card.querySelector('.axis-end'),time(this.now));
      card.querySelector('svg').setAttribute('aria-label',`${server?.name||'无节点'} · ${names[key]}延迟，单位毫秒，${c.points.length}个采样；方向键查看`);
      set(card.querySelector('.chart-note span'),enabled?`${c.points.length} 个采样 · 红标为丢包`:'后台未开启三网详情');set(card.querySelector('.chart-note span:last-child'),`当前丢包 ${server&&online(server)?loss(server['loss_'+key]):'—'}`);
      if(c.inspecting)this.inspect(key,c.inspecting);else set(card.querySelector('.chart-tooltip'),!enabled?'开启三网详情后显示历史':c.points.length?'悬停或触摸查看采样':'暂无历史采样');
    }
  }
  inspect(key,ts){const c=this.cards.get(key),p=nearestPoint(c.points,ts);if(!p)return;c.inspecting=p.ts;const x=30+Math.max(0,Math.min(1,(p.ts-(this.now-7200000))/7200000))*324;const cursor=c.el.querySelector('.cursor');cursor.removeAttribute('hidden');cursor.setAttribute('d',`M${x} 12V103`);set(c.el.querySelector('.chart-tooltip'),`${time(p.ts)} · ${ping(p[key])} · 丢包 ${loss(p.loss?.[key])}`);}
}
