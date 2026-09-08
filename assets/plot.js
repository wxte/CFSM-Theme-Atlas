// Small local SVG renderer. Curves pass through observations without overshoot.
export function plotPaths(points,baseline=30,smooth=true){
 const segments=[];let segment=[];
 for(const p of points){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){if(segment.length)segments.push(segment);segment=[];}else segment.push(p);}if(segment.length)segments.push(segment);
 const fmt=v=>Number(v.toFixed(2));let line='',area='';
 for(const ps of segments){let d=`M${fmt(ps[0].x)},${fmt(ps[0].y)}`;if(ps.length===1){const mid=fmt(ps[0].x+1.25),end=fmt(ps[0].x+2.5);d+=` C${mid},${fmt(ps[0].y)} ${mid},${fmt(ps[0].y)} ${end},${fmt(ps[0].y)}`;}else for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],mid=fmt((a.x+b.x)/2);d+=smooth?` C${mid},${fmt(a.y)} ${mid},${fmt(b.y)} ${fmt(b.x)},${fmt(b.y)}`:` L${fmt(b.x)},${fmt(b.y)}`;}line+=d+' ';if(ps.length>1)area+=d+` L${fmt(ps.at(-1).x)},${baseline} L${fmt(ps[0].x)},${baseline} Z `;}
 return {line:line.trim(),area:area.trim(),last:points.at(-1)||null};
}

const ns='http://www.w3.org/2000/svg',running=new Set();let frame=0,serial=0;
const duration=320;
const attr=(el,k,v)=>{v=String(v);if(el.getAttribute(k)!==v)el.setAttribute(k,v);};
function visible(svg){if(document.hidden||!svg.isConnected||svg.closest('[hidden]')||svg.closest('details:not([open])'))return false;const r=svg.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function tick(now){
 frame=0;
 for(const plot of [...running]){
  // Avoid a layout read on every animation frame. Visibility is checked once in update().
  if(document.hidden||!plot.svg.isConnected||plot.svg.closest('[hidden]')||plot.svg.closest('details:not([open])')){plot.finish();continue;}
  const t=Math.min(1,(now-plot.started)/duration),e=1-(1-t)**3;
  plot.paint(plot.target.map((p,i)=>p?{...p,x:plot.from[i].x+(p.x-plot.from[i].x)*e,y:plot.from[i].y+(p.y-plot.from[i].y)*e}:null));
  if(t===1){running.delete(plot);plot.svg.removeAttribute('data-animating');}
 }
 if(running.size)frame=requestAnimationFrame(tick);
}
export class Plot{
 constructor(svg,line,{baseline=30,smooth=true}={}){
  this.svg=svg;this.line=line;this.baseline=baseline;this.smooth=smooth;this.target=[];this.current=[];this.signature='';
  this.fullSingle=svg.classList.contains('kpi-spark');
  const id='atlas-wash-'+ ++serial,defs=document.createElementNS(ns,'defs');defs.innerHTML=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>`;svg.prepend(defs);
  this.area=document.createElementNS(ns,'path');attr(this.area,'fill',`url(#${id})`);attr(this.area,'class','plot-area');line.before(this.area);

  // v0.3.17: preserveAspectRatio="none" stretches ordinary SVG circles into tiny ellipses.
  // Use an ellipse whose radii are compensated from the rendered SVG size so every chart
  // gets the same ~6 px round endpoint on desktop and mobile.
  this.dot=document.createElementNS(ns,'ellipse');attr(this.dot,'class','plot-end');attr(this.dot,'vector-effect','non-scaling-stroke');svg.append(this.dot);
  this.dotRadiusPx=3;
  this.syncDotShape=()=>{
   const vb=this.svg.viewBox?.baseVal,rect=this.svg.getBoundingClientRect();
   if(!vb||vb.width<=0||vb.height<=0||rect.width<=0||rect.height<=0)return;
   attr(this.dot,'rx',this.dotRadiusPx*vb.width/rect.width);
   attr(this.dot,'ry',this.dotRadiusPx*vb.height/rect.height);
  };
  if(typeof ResizeObserver!=='undefined'){
   this.dotObserver=new ResizeObserver(()=>this.syncDotShape());
   this.dotObserver.observe(svg);
  }
  queueMicrotask(()=>this.syncDotShape());
 }
 paint(points){
  this.current=points;
  let draw=points;
  if(this.fullSingle){
   const valid=points.filter(Boolean);
   if(valid.length===1){const p=valid[0];draw=[{...p,x:2},p];}
  }
  const p=plotPaths(draw,this.baseline,this.smooth);attr(this.line,'d',p.line);attr(this.area,'d',p.area);
  const last=[...points].reverse().find(Boolean)||null;
  if(last){
   if(!this.dot.hasAttribute('rx'))this.syncDotShape();
   this.dot.removeAttribute('hidden');attr(this.dot,'cx',last.x);attr(this.dot,'cy',last.y);
  }else this.dot.setAttribute('hidden','');
 }
 update(points,{animate=true}={}){
  const signature=points.map(p=>p?`${p.ts}:${Number(p.x).toFixed(2)}:${Number(p.y).toFixed(2)}`:'_').join('|');
  if(signature===this.signature)return;this.signature=signature;
  const old=new Map(this.current.filter(Boolean).map(p=>[p.ts,p])),previousLast=[...this.current].reverse().find(Boolean)||null;
  this.target=points;
  if(!animate||points.length>240||!visible(this.svg)||matchMedia('(prefers-reduced-motion: reduce)').matches){this.finish();return;}
  this.from=points.map((p,i)=>{
   if(!p)return null;
   const same=old.get(p.ts);if(same)return same;
   if(i===points.length-1&&previousLast)return {...p,x:previousLast.x,y:previousLast.y};
   return p;
  });
  this.started=performance.now();running.add(this);this.svg.setAttribute('data-animating','');if(!frame)frame=requestAnimationFrame(tick);
 }
 finish(){running.delete(this);this.svg.removeAttribute('data-animating');this.paint(this.target);if(!running.size&&frame){cancelAnimationFrame(frame);frame=0;}}
 destroy(){running.delete(this);this.svg.removeAttribute('data-animating');this.dotObserver?.disconnect();}
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const plot of [...running])plot.finish();});
