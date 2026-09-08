// Small local SVG renderer. Curves pass through observations without overshoot.
export function plotPaths(points,baseline=30,smooth=true){
 const segments=[];let segment=[];
 for(const p of points){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){if(segment.length)segments.push(segment);segment=[];}else segment.push(p);}if(segment.length)segments.push(segment);
 const fmt=v=>Number(v.toFixed(2));let line='',area='';
 for(const ps of segments){let d=`M${fmt(ps[0].x)},${fmt(ps[0].y)}`;if(ps.length===1){const mid=fmt(ps[0].x+1.25),end=fmt(ps[0].x+2.5);d+=` C${mid},${fmt(ps[0].y)} ${mid},${fmt(ps[0].y)} ${end},${fmt(ps[0].y)}`;}else for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],mid=fmt((a.x+b.x)/2);d+=smooth?` C${mid},${fmt(a.y)} ${mid},${fmt(b.y)} ${fmt(b.x)},${fmt(b.y)}`:` L${fmt(b.x)},${fmt(b.y)}`;}line+=d+' ';if(ps.length>1)area+=d+` L${fmt(ps.at(-1).x)},${baseline} L${fmt(ps[0].x)},${baseline} Z `;}
 return {line:line.trim(),area:area.trim(),last:points.at(-1)||null};
}

// v0.3.13 mobile-density polish. Kept here so this remains a one-file overlay.
function installMobilePolish(){
 if(typeof document==='undefined'||document.getElementById('atlas-v0313-polish'))return;
 const style=document.createElement('style');style.id='atlas-v0313-polish';
 style.textContent=`
/* v0.3.13 — video-like microchart motion + denser mobile layout. */
.plot-end,.carrier-line svg circle{animation:none!important}
.kpi>strong,.resource-card>strong,.spark-value,.rate-cell strong,.meters strong,.node-pings,.transfer-cell,.uptime-cell{font-variant-numeric:tabular-nums}

@media(max-width:800px){
  .page-heading{padding:11px 0 8px}.page-heading h1{font-size:17px}
  .kpis{gap:6px;margin-bottom:8px}.kpi{padding:8px 9px 9px;border-radius:8px}.kpi-label{font-size:10px}.kpi>strong{font-size:20px!important;line-height:1.18;margin:3px 0 1px}.kpi #stat-in,.kpi #stat-out,.kpi #stat-month,.kpi #stat-cost{font-size:18px!important}.kpi small{font-size:9px;line-height:1.25}.kpi-track{left:9px;right:9px;bottom:4px}.kpi-live-traffic .kpi-spark{left:46%;right:5px;bottom:5px;height:30px;opacity:.82}
  .resource-overview{gap:6px}.resource-card{padding:8px 9px;border-radius:8px}.resource-card>strong{font-size:20px;line-height:1.18;margin:3px 0}.resource-card .eyebrow{font-size:10px}.resource-card small{font-size:9px}.resource-track{height:2px;margin:5px 0}

  #node-list{gap:7px}.node-row{gap:7px 10px;padding:10px 11px!important;border-radius:8px}.node-row>.status-cell{top:14px;left:11px}.node-row>.detail-cell{right:8px;top:7px;width:36px;height:28px}.detail-cell .detail-button{min-height:28px;padding:3px 1px;font-size:11px}
  .node-main{padding-left:22px;padding-right:38px;min-height:25px}.node-name h3{font-size:13px;line-height:1.3}.node-main>small{margin-top:1px;font-size:10px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.node-row>.node-region{padding-left:22px;margin-top:-3px;font-size:10px;line-height:1.2;white-space:nowrap;overflow:hidden}
  .node-row>.rate-cell{padding-top:4px}.rate-cell>small,.transfer-cell>small{font-size:9px;line-height:1.05;margin-bottom:1px}.rate-cell strong{font-size:15px;line-height:1.15}
  .meters{gap:6px}.meters>div{gap:2px 4px}.meters span,.meters strong{font-size:10px;line-height:1.1}.meters i{height:3px}.meters b::after{width:4px;height:4px;box-shadow:0 0 0 1px var(--panel),0 0 4px currentColor}
  .node-pings{gap:4px;font-size:10px;line-height:1.2}.node-row>.transfer-cell,.node-row>.uptime-cell{font-size:10px;line-height:1.2}.quota-track{height:3px;margin-top:2px}.quota-remaining{font-size:9px!important;line-height:1.1;margin-top:2px!important;white-space:nowrap!important}
  .node-detail{margin-top:-5px}.node-detail .inline-trends{margin-top:7px;padding-top:7px}.node-sparks{gap:5px}.node-spark{padding:6px 6px 1px;border-radius:7px}.node-spark small{font-size:9px;line-height:12px}.node-spark .spark-value{font-size:12px;line-height:17px}.node-detail .node-spark svg{height:26px}.node-sample-track{margin-top:5px;height:12px}.node-sample-track>span{height:5px}.node-sample-track>.selected{height:10px}.node-detail .node-sample-note{font-size:9px;line-height:1.25}.node-detail .details{grid-template-columns:1fr 1fr;gap:6px 10px;padding-top:7px;margin-top:7px}.details dt{font-size:9px}.details dd{font-size:10px;line-height:1.25;margin-top:2px}

  .section-heading{margin:14px 0 8px}.section-heading h2{font-size:16px}.table-toolbar{margin-bottom:8px}.quick-filters,.active-filters{margin-bottom:8px;gap:5px}.quick-filters button,.active-filters button{padding:4px 7px;font-size:10px}.quick-filters small{font-size:9px}
}

@media(max-width:700px){
  #network{min-height:0}.network-explainer{margin-bottom:7px;gap:5px 8px;font-size:10px}.network-explainer button{padding:4px 7px;font-size:10px}.network-explainer>small{font-size:9px;line-height:1.35}.history-note{font-size:10px;padding-bottom:6px}
  .network-server{margin-bottom:8px;border-radius:8px;contain-intrinsic-size:auto 205px}.network-server-heading{min-height:38px;padding:7px 9px;gap:6px;flex-wrap:nowrap}.network-server-heading h3{font-size:12px;line-height:1.25;max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.network-server-heading small{font-size:9px;margin-left:0}.network-server-status{font-size:9px}
  .network-server .analytics-grid{display:grid!important;grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:88%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;overscroll-behavior-x:contain;scrollbar-width:none}.network-server .analytics-grid::-webkit-scrollbar{display:none}
  .network-server .analysis-card{scroll-snap-align:start;border-right:1px solid var(--line)!important;border-bottom:0!important;padding:7px 9px!important}.network-server .analysis-card:last-child{border-right:0!important}.network-server .analysis-top{font-size:10px}.network-server .analysis-top strong{font-size:17px}.network-server .chart{height:54px;margin-top:2px}.network-server .network-tracker{min-height:16px;margin-top:1px;gap:2px!important}.network-server .network-tracker button{height:18px}.network-tracker button::before{inset-block:6px}.network-tracker button:hover::before,.network-tracker button[aria-pressed=true]::before{inset-block:5px}.network-server .chart-tooltip{min-height:22px;margin-top:3px;padding:3px 5px;font-size:9px;line-height:1.35}.network-server .chart-note{font-size:9px;line-height:1.2;margin-top:0;gap:4px}.tracker-caption,.tracker-tooltip{font-size:9px}
}

@media(max-width:430px){
  .shell{width:calc(100% - 18px)}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi{padding:7px 8px 8px}.kpi>strong{font-size:19px!important}.kpi #stat-in,.kpi #stat-out,.kpi #stat-month,.kpi #stat-cost{font-size:17px!important}.kpi small{font-size:8.5px}
  .node-row{padding:9px 9px!important;gap:6px 8px}.node-row>.status-cell{left:9px;top:13px}.node-row>.detail-cell{right:6px;top:6px}.node-main{padding-left:21px;padding-right:36px}.node-row>.node-region{padding-left:21px}.rate-cell strong{font-size:14px}.meters{gap:5px}.node-pings{font-size:9px}.node-row>.transfer-cell,.node-row>.uptime-cell{font-size:9px}
  .network-server .analytics-grid{grid-auto-columns:92%}.network-server .chart{height:50px}
}

@media(prefers-reduced-motion:reduce){.plot-end,.carrier-line svg circle{animation:none!important}}
`;
 document.head.append(style);
}
installMobilePolish();

const ns='http://www.w3.org/2000/svg',running=new Set();let frame=0,serial=0;
const attr=(el,k,v)=>{v=String(v);if(el.getAttribute(k)!==v)el.setAttribute(k,v);};
function visible(svg){if(document.hidden||!svg.isConnected||svg.closest('[hidden]')||svg.closest('details:not([open])'))return false;const r=svg.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function tick(now){frame=0;for(const plot of running){if(!visible(plot.svg)){plot.finish();continue;}const t=Math.min(1,(now-plot.started)/360),e=1-(1-t)**3;plot.paint(plot.target.map((p,i)=>p?{...p,x:plot.from[i].x+(p.x-plot.from[i].x)*e,y:plot.from[i].y+(p.y-plot.from[i].y)*e}:null));if(t===1){running.delete(plot);plot.svg.removeAttribute('data-animating');}}if(running.size)frame=requestAnimationFrame(tick);}
export class Plot{
 constructor(svg,line,{baseline=30,smooth=true}={}){
  this.svg=svg;this.line=line;this.baseline=baseline;this.smooth=smooth;this.target=[];this.current=[];
  const id='atlas-wash-'+ ++serial,defs=document.createElementNS(ns,'defs');defs.innerHTML=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>`;svg.prepend(defs);
  this.area=document.createElementNS(ns,'path');attr(this.area,'fill',`url(#${id})`);attr(this.area,'class','plot-area');line.before(this.area);
  this.dot=document.createElementNS(ns,'circle');attr(this.dot,'class','plot-end');attr(this.dot,'r',2.3);svg.append(this.dot);
 }
 paint(points){this.current=points;const p=plotPaths(points,this.baseline,this.smooth);attr(this.line,'d',p.line);attr(this.area,'d',p.area);if(p.last){this.dot.removeAttribute('hidden');attr(this.dot,'cx',p.last.x);attr(this.dot,'cy',p.last.y);}else this.dot.setAttribute('hidden','');}
 update(points,{animate=true}={}){
  if(JSON.stringify(points)===JSON.stringify(this.target))return;
  const old=new Map(this.current.filter(Boolean).map(p=>[p.ts,p]));
  const previousLast=[...this.current].reverse().find(Boolean)||null;
  this.target=points;
  // Existing samples glide to their new x/y. A brand-new tail grows out of the previous tail instead of popping in.
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
 destroy(){running.delete(this);this.svg.removeAttribute('data-animating');}
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const plot of [...running])plot.finish();});
