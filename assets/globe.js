import {coordinate,region,online,bytes,ping} from './data.js?v=0.5.23';
import {placeLabel} from './map-layout.js?v=0.5.23';
const $=s=>document.querySelector(s);

export function globeProfile({
 mobile=false,
 width=1024,
 devicePixelRatio=1,
 deviceMemory=8,
 hardwareConcurrency=8,
 saveData=false,
 reducedMotion=false
}={}){
 const constrained=mobile||saveData||deviceMemory<=4||hardwareConcurrency<=4;
 const compact=mobile&&width<=520;
 return {
  compact,
  constrained,
  devicePixelRatio:constrained?1:Math.min(1.8,Math.max(1,Number(devicePixelRatio)||1)),
  mapSamples:compact?4800:mobile?6500:constrained?9000:16000,
  arcLimit:mobile||saveData?0:constrained?8:16,
  labelLimit:compact?6:mobile?9:24,
  autoRotate:!mobile&&!saveData&&!reducedMotion,
  rotationMs:constrained?140:80
 };
}

const distance=(a,b)=>{
 const lat=(a[0]-b[0])*Math.PI/180,lon=(a[1]-b[1])*Math.PI/180;
 return lat*lat+lon*lon;
};

export function flightLinks(groups,servers,options={},limit=16){
 if(limit<=0)return [];
 const byId=new Map((servers||[]).map(s=>[String(s.id),s]));
 const explicit=(Array.isArray(options.connections)?options.connections:[]).flatMap(link=>{
  const a=byId.get(String(link?.from)),b=byId.get(String(link?.to));
  const from=a&&coordinate(a,options),to=b&&coordinate(b,options);
  return from&&to&&String(link.from)!==String(link.to)?[{from,to}]:[];
 }).slice(0,limit);
 if(explicit.length)return explicit;

 const active=(groups||[])
  .filter(g=>Array.isArray(g.location)&&g.members?.some(s=>online(s)))
  .sort((a,b)=>b.members.length-a.members.length||String(a.key).localeCompare(String(b.key)));
 if(active.length<2)return [];
 const hub=active[0];
 return active.slice(1)
  .sort((a,b)=>distance(hub.location,b.location)-distance(hub.location,a.location))
  .slice(0,limit)
  .map((g,i)=>({
   from:hub.location,
   to:g.location,
   color:i%3===0?[.12,.66,.56]:i%3===1?[.22,.58,.72]:[.34,.68,.54]
  }));
}

export class NodeMap{
 constructor(onRegion){
  this.onRegion=onRegion;this.servers=[];this.options={};this.groups=[];this.labels=new Map();this.phi=0;this.theta=.2;this.pending=0;this.signature='';this.dirty=true;this.hoverKey=null;this.active=true;this.mode='auto';this.inView=typeof IntersectionObserver==='undefined';this.readyToInit=false;
  this.mobile=matchMedia('(max-width:800px)').matches;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const nav=globalThis.navigator||{};
  const connection=nav.connection||nav.mozConnection||nav.webkitConnection;
  this.profile=globeProfile({
   mobile:this.mobile,
   width:globalThis.innerWidth||1024,
   devicePixelRatio:globalThis.devicePixelRatio||1,
   deviceMemory:nav.deviceMemory||8,
   hardwareConcurrency:nav.hardwareConcurrency||8,
   saveData:Boolean(connection?.saveData),
   reducedMotion:this.reduced.matches
  });
  const canvas=$('#globe');
  canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.phi+=(e.clientX-this.drag.x)*.008;this.theta=Math.max(-1.2,Math.min(1.2,this.theta+(e.clientY-this.drag.y)*.005));this.drag={x:e.clientX,y:e.clientY};this.requestDraw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{this.drag=null;});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.phi+=e.key==='ArrowRight'?.15:e.key==='ArrowLeft'?-.15:0;this.theta=Math.max(-1.2,Math.min(1.2,this.theta+(e.key==='ArrowDown'?.1:e.key==='ArrowUp'?-.1:0)));this.pauseUntil=Date.now()+2000;this.requestDraw();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.unavailable();});
  new ResizeObserver(()=>{for(const button of this.labels.values()){button._width=0;button._height=0;}this.requestDraw();}).observe($('#map-stage'));
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{this.inView=entries[0].isIntersecting;if(this.inView)this.requestDraw();},{threshold:0}).observe($('#map-stage'));
  this.rotation=setInterval(()=>{if(!this.profile.autoRotate||this.mode!=='auto'||!this.active||!this.inView||document.hidden||this.drag||this.hoverKey||this.failed||!this.globe||Date.now()<this.pauseUntil)return;this.phi+=.0048;this.requestDraw();},this.profile.rotationMs);
  addEventListener('pagehide',()=>{clearInterval(this.rotation);this.globe?.destroy();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.requestDraw();});
 }
 async init(){
  this.readyToInit=true;
  if(this.globe||this.initializing||this.failed||!this.active||!this.inView||this.mode==='off'||document.hidden)return;
  this.initializing=true;
  try{
   const {default:createGlobe}=await import('./vendor/cobe.js?v=0.5.23');
   if(!this.active||!this.inView||this.mode==='off'||document.hidden)return;
   const canvas=$('#globe');
   if(!canvas.getContext('webgl2',{alpha:true,antialias:true})&&!canvas.getContext('webgl',{alpha:true,antialias:true}))throw Error();
   const size=$('#globe-holder').clientWidth||(this.mobile?265:355);
   this.globe=createGlobe(canvas,{
    width:size,height:size,devicePixelRatio:this.profile.devicePixelRatio,
    phi:this.phi,theta:this.theta,dark:0,diffuse:1.2,mapSamples:this.profile.mapSamples,mapBrightness:6,mapBaseBrightness:0,
    baseColor:[1,1,1],markerColor:[.1,.65,.4],glowColor:[1,1,1],scale:1,markers:[],arcs:[],
    arcColor:[.1,.5,.4],arcWidth:.5,arcHeight:.18,onTextureError:()=>this.unavailable()
   });
   this.syncHint();
   this.draw();
  }catch{this.unavailable();}finally{this.initializing=false;}
 }
 unavailable(){this.failed=true;$('#globe-holder').hidden=true;$('#map-labels').hidden=true;$('#globe-error').hidden=false;$('#map-hint').textContent='地球暂不可用';}
 update(servers,options){
  this.servers=servers;this.options=options||{};
  const groups=new Map();
  for(const s of servers){
   const c=coordinate(s,this.options);if(!c)continue;
   const key=c.join(','),group=groups.get(key)||{key,location:c,code:region(s.region).code,members:[]};
   group.members.push(s);groups.set(key,group);
  }
  this.groups=[...groups.values()];
  const sig=JSON.stringify([this.groups.map(g=>[g.key,g.members.map(s=>[s.id,s.name,online(s)])]),this.options.connections]);
  if(sig!==this.signature){this.signature=sig;this.dirty=true;this.requestDraw();this.syncHint();}
  if(this.hoverKey)this.showTip(this.hoverKey);
 }
 focus(code){
  this.focusCode=code||'';
  const s=this.servers.find(s=>region(s.region).code===code),c=s&&coordinate(s,this.options);
  if(c){this.phi=-c[1]*Math.PI/180-Math.PI/2;this.theta=c[0]*Math.PI/180;}
  this.pauseUntil=Date.now()+1500;this.requestDraw();
 }
 requestDraw(){if(this.mode==='off'||!this.active||!this.inView||this.pending||document.hidden)return;if(!this.globe){if(this.readyToInit)this.init();return;}this.pending=requestAnimationFrame(()=>{this.pending=0;this.draw();});}
 links(){return flightLinks(this.groups,this.servers,this.options,this.profile.arcLimit);}
 labelGroups(){
  if(this.groups.length<=this.profile.labelLimit)return this.groups;
  const ranked=[...this.groups].sort((a,b)=>{
   const af=a.code===this.focusCode?1:0,bf=b.code===this.focusCode?1:0;
   if(af!==bf)return bf-af;
   const ao=a.members.some(s=>online(s))?1:0,bo=b.members.some(s=>online(s))?1:0;
   return bo-ao||b.members.length-a.members.length||String(a.code).localeCompare(String(b.code));
  });
  return ranked.slice(0,this.profile.labelLimit);
 }
 syncHint(){
  const hint=$('#map-hint');if(!hint)return;
  if(this.profile.arcLimit<=0)hint.textContent='轻量地球 · 点选地区';
  else if(Array.isArray(this.options.connections)&&this.options.connections.length)hint.textContent='拖动旋转 · 拓扑飞线';
  else if(this.groups.length>1)hint.textContent='拖动旋转 · 飞线为分布示意';
  else hint.textContent='拖动旋转 · 点选地区';
 }
 showTip(key){
  const group=this.groups.find(g=>g.key===key);if(!group){this.clearTip();return;}
  this.hoverKey=key;const tip=$('#map-tip');
  tip.textContent=group.members.map(s=>`${s.name} · ${region(s.region).name} · ${online(s)?'在线':'离线'}\n联通 ${ping(s.ping_cu)}\n↓ ${online(s)?bytes(s.net_in_speed,true):'—'}  ↑ ${online(s)?bytes(s.net_out_speed,true):'—'}`).join('\n');
  tip.hidden=false;const ids=new Set(group.members.map(s=>s.id));document.querySelectorAll('.node-row').forEach(row=>row.classList.toggle('map-selected',ids.has(row.dataset.id)));
 }
 clearTip(){this.hoverKey=null;$('#map-tip').hidden=true;document.querySelectorAll('.map-selected').forEach(row=>row.classList.remove('map-selected'));}
 draw(){
  if(!this.active||!this.inView||this.mode==='off'||document.hidden)return;
  const dark=document.documentElement.dataset.theme==='dark';
  if(this.globe&&!this.failed){
   const appearance=this.dirty||dark!==this.dark?{
    dark:dark?1:0,baseColor:dark?[.78,.86,.9]:[1,1,1],glowColor:dark?[.102,.125,.145]:[1,1,1],mapBrightness:dark?4:6,
    markers:this.groups.map(g=>({location:g.location,size:.025,color:g.members.some(s=>online(s))?[.15,.72,.46]:[.65,.4,.4]})),
    arcs:this.links(),arcColor:dark?[.25,.8,.7]:[.1,.5,.4],arcWidth:this.profile.constrained?.38:.52,arcHeight:this.profile.constrained?.14:.2
   }:{};
   const size=$('#globe-holder').clientWidth||(this.mobile?265:355),dimensions=size!==this.renderSize?{width:size,height:size}:{};
   this.globe.update({phi:this.phi,theta:this.theta,...dimensions,...appearance});this.renderSize=size;this.dirty=false;this.dark=dark;
  }
  const stage=$('#map-stage'),width=stage.clientWidth,height=stage.clientHeight,radius=$('#globe-holder').clientWidth*.4,occupied=[],keep=new Set();
  const visibleGroups=this.labelGroups();
  for(const g of visibleGroups){
   keep.add(g.key);let button=this.labels.get(g.key);
   if(!button){
    button=document.createElement('button');button.className='map-label';button.innerHTML='<i class="status-dot" aria-hidden="true"></i><span></span>';
    button.addEventListener('mouseenter',()=>this.showTip(g.key));button.addEventListener('focus',()=>this.showTip(g.key));button.addEventListener('mouseleave',()=>this.clearTip());button.addEventListener('blur',()=>this.clearTip());
    button.addEventListener('click',()=>{this.onRegion(g.code);this.showTip(g.key);});
    $('#map-labels').append(button);this.labels.set(g.key,button);
   }
   const text=g.code+(g.members.length>1?' · '+g.members.length:'');
   if(button.lastElementChild.textContent!==text){button.lastElementChild.textContent=text;button._width=0;button._height=0;}
   const title=g.members.map(s=>s.name).join(' / ');
   if(button.title!==title){button.title=title;button.setAttribute('aria-label',`${region(g.code).name}，${g.members.length}个节点，点击筛选`);}
   button.classList.toggle('offline',!g.members.some(s=>online(s)));
   const a=g.location[0]*Math.PI/180,b=g.location[1]*Math.PI/180-Math.PI,p=[-Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b)];
   const rx=Math.cos(this.phi)*p[0]+Math.sin(this.phi)*p[2],ry=Math.sin(this.phi)*Math.sin(this.theta)*p[0]+Math.cos(this.theta)*p[1]-Math.cos(this.phi)*Math.sin(this.theta)*p[2],rz=-Math.sin(this.phi)*Math.cos(this.theta)*p[0]+Math.sin(this.theta)*p[1]+Math.cos(this.phi)*Math.cos(this.theta)*p[2];
   button.hidden=rz<=0;if(button.hidden)continue;
   const pos=placeLabel(width/2+rx*radius,height/2-ry*radius,button._width||(button._width=button.offsetWidth||48),button._height||(button._height=button.offsetHeight||26),width,height,occupied);
   button.hidden=!pos;if(pos){button.style.left=pos.x+'px';button.style.top=pos.y+'px';}
  }
  for(const [key,b]of this.labels)if(!keep.has(key)){b.remove();this.labels.delete(key);}
 }
}
