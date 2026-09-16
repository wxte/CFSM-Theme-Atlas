import {coordinate,region,online,bytes,ping} from './data.js?v=0.5.25';
import {placeLabel} from './map-layout.js?v=0.5.25';
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
 const constrained=mobile||saveData||reducedMotion||deviceMemory<=4||hardwareConcurrency<=4;
 const compact=mobile&&width<=520;
 return {
  compact,
  constrained,
  devicePixelRatio:constrained?1:Math.min(1.35,Math.max(1,Number(devicePixelRatio)||1)),
  mapSamples:compact?3200:mobile?4200:constrained?6000:9000,
  labelLimit:compact?5:mobile?8:constrained?12:18
 };
}

export class NodeMap{
 constructor(onRegion){
  this.onRegion=onRegion;this.servers=[];this.options={};this.groups=[];this.labels=new Map();this.phi=0;this.theta=.2;this.pending=0;this.signature='';this.dirty=true;this.hoverKey=null;this._active=true;this._mode='auto';this.inView=typeof IntersectionObserver==='undefined';this.readyToInit=false;
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

  this.canvas=$('#globe');
  this.stage=$('#map-stage');
  this.holder=$('#globe-holder');
  this.labelsRoot=$('#map-labels');
  const canvas=this.canvas;

  canvas.addEventListener('pointerdown',e=>{
   this.drag={x:e.clientX,y:e.clientY};
   this.stopRotation();
   this.labelsRoot.style.visibility='hidden';
   try{canvas.setPointerCapture?.(e.pointerId);}catch{}
  });
  canvas.addEventListener('pointermove',e=>{
   if(!this.drag)return;
   this.phi+=(e.clientX-this.drag.x)*.008;
   this.theta=Math.max(-1.2,Math.min(1.2,this.theta+(e.clientY-this.drag.y)*.005));
   this.drag={x:e.clientX,y:e.clientY};
   this.requestDraw();
  },{passive:true});
  const endDrag=()=>{
   if(!this.drag)return;
   this.drag=null;
   this.labelsRoot.style.visibility='';
   this.requestDraw();
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endDrag);
  canvas.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
   e.preventDefault();
   this.phi+=e.key==='ArrowRight'?.15:e.key==='ArrowLeft'?-.15:0;
   this.theta=Math.max(-1.2,Math.min(1.2,this.theta+(e.key==='ArrowDown'?.1:e.key==='ArrowUp'?-.1:0)));
   this.requestDraw();
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.unavailable();});

  this.measure=()=>{
   this.stageWidth=this.stage?.clientWidth||0;
   this.stageHeight=this.stage?.clientHeight||0;
   this.globeSize=this.holder?.clientWidth||(this.mobile?265:355);
   for(const button of this.labels.values()){button._width=0;button._height=0;}
  };
  this.measure();

  if(typeof ResizeObserver!=='undefined'){
   this.resizeObserver=new ResizeObserver(()=>{this.measure();this.requestDraw();});
   this.resizeObserver.observe(this.stage);
  }
  if(typeof IntersectionObserver!=='undefined'){
   this.intersectionObserver=new IntersectionObserver(entries=>{
    this.inView=Boolean(entries[0]?.isIntersecting);
    if(this.inView)this.requestDraw();else this.stopRotation();
   },{threshold:0});
   this.intersectionObserver.observe(this.stage);
  }

  this.onVisibility=()=>{if(!document.hidden)this.requestDraw();else this.stopRotation();};
  this.onMotion=()=>{this.stopRotation();this.requestDraw();};
  this.reduced.addEventListener?.('change',this.onMotion);
  document.addEventListener('visibilitychange',this.onVisibility);
  addEventListener('pagehide',()=>{
   this.disposed=true;this.stopRotation();
   this.reduced.removeEventListener?.('change',this.onMotion);
   if(this.pending&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.pending);
   this.resizeObserver?.disconnect();
   this.intersectionObserver?.disconnect();
   document.removeEventListener('visibilitychange',this.onVisibility);
   this.globe?.destroy();
  },{once:true});
 }
 get active(){return this._active} set active(value){this._active=!!value;this.stopRotation();if(this._active)this.requestDraw();}
 get mode(){return this._mode} set mode(value){this._mode=value||'auto';this.stopRotation();if(this._mode!=='off')this.requestDraw();}
 canRotate(){return Boolean(this.globe&&!this.failed&&!this.disposed&&this.active&&this.inView&&this.mode!=='off'&&!document.hidden&&!this.reduced.matches&&!this.drag&&!this.hoverKey);}
 stopRotation(){
  if(this.rotationTimer)clearTimeout(this.rotationTimer);
  this.rotationTimer=0;this.rotationTime=null;
 }
 scheduleRotation(){
  if(!this.canRotate()){this.stopRotation();return;}
  if(this.rotationTimer)return;
  // COBE's phi increment, driven by elapsed time at at most 20 / 12 fps.
  // The bundled update-only renderer does not implement onRender.
  this.rotationTime??=performance.now();
  this.rotationTimer=setTimeout(()=>{
   this.rotationTimer=0;
   if(!this.canRotate()){this.stopRotation();return;}
   const now=performance.now(),elapsed=Math.min(100,Math.max(0,now-this.rotationTime));
   this.rotationTime=now;
   this.phi=(this.phi+elapsed*.00018)%(Math.PI*2);
   this.requestDraw();
  },1000/(this.profile.constrained?12:20));
 }
 async init(){
  this.readyToInit=true;
  if(this.globe||this.initializing||this.failed||this.disposed||!this.active||!this.inView||this.mode==='off'||document.hidden)return;
  this.initializing=true;
  try{
   const {default:createGlobe}=await import('./vendor/cobe.js?v=0.5.25');
   if(this.failed||this.disposed||!this.active||!this.inView||this.mode==='off'||document.hidden)return;
   const canvas=this.canvas;
   if(!canvas.getContext('webgl2',{alpha:true,antialias:true})&&!canvas.getContext('webgl',{alpha:true,antialias:true}))throw Error();
   this.measure();
   const size=this.globeSize||(this.mobile?265:355);
   this.globe=createGlobe(canvas,{
    width:size,height:size,devicePixelRatio:this.profile.devicePixelRatio,
    phi:this.phi,theta:this.theta,dark:0,diffuse:1.2,mapSamples:this.profile.mapSamples,mapBrightness:6,mapBaseBrightness:0,
    baseColor:[1,1,1],markerColor:[.1,.65,.4],glowColor:[1,1,1],scale:1,markers:[],arcs:[],
    onTextureError:()=>this.unavailable()
   });
   this.syncHint();
   this.draw();
  }catch{this.unavailable();}finally{this.initializing=false;}
 }
 unavailable(){
  this.failed=true;this.stopRotation();
  this.holder.hidden=true;
  this.labelsRoot.hidden=true;
  $('#globe-error').hidden=false;
  $('#map-hint').textContent='地球暂不可用';
 }
 update(servers,options){
  this.servers=servers;this.options=options||{};
  const groups=new Map();
  for(const s of servers){
   const c=coordinate(s,this.options);if(!c)continue;
   const key=c.join(','),group=groups.get(key)||{key,location:c,code:region(s.region).code,members:[]};
   group.members.push(s);groups.set(key,group);
  }
  this.groups=[...groups.values()];
  const sig=JSON.stringify(this.groups.map(g=>[g.key,g.code,g.members.map(s=>[s.id,s.name,online(s)])]));
  if(sig!==this.signature){this.signature=sig;this.dirty=true;this.requestDraw();this.syncHint();}
  if(this.hoverKey)this.showTip(this.hoverKey);
 }
 focus(code){
  this.focusCode=code||'';
  const s=this.servers.find(s=>region(s.region).code===code),c=s&&coordinate(s,this.options);
  if(c){this.phi=-c[1]*Math.PI/180-Math.PI/2;this.theta=c[0]*Math.PI/180;}
  this.requestDraw();
 }
 requestDraw(){
  if(this.disposed||this.failed||this.mode==='off'||!this.active||!this.inView||this.pending||document.hidden)return;
  if(!this.globe){if(this.readyToInit)this.init();return;}
  this.pending=requestAnimationFrame(()=>{this.pending=0;this.draw();});
 }
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
  hint.textContent=this.profile.constrained?'轻量地球 · 点选地区':'拖动旋转 · 点选地区';
 }
 showTip(key){
  const group=this.groups.find(g=>g.key===key);if(!group){this.clearTip();return;}
  this.hoverKey=key;this.stopRotation();const tip=$('#map-tip');
  tip.textContent=group.members.map(s=>`${s.name} · ${region(s.region).name} · ${online(s)?'在线':'离线'}\n联通 ${ping(s.ping_cu)}\n↓ ${online(s)?bytes(s.net_in_speed,true):'—'}  ↑ ${online(s)?bytes(s.net_out_speed,true):'—'}`).join('\n');
  tip.hidden=false;const ids=new Set(group.members.map(s=>s.id));document.querySelectorAll('.node-row').forEach(row=>row.classList.toggle('map-selected',ids.has(row.dataset.id)));
 }
 clearTip(){this.hoverKey=null;this.requestDraw();$('#map-tip').hidden=true;document.querySelectorAll('.map-selected').forEach(row=>row.classList.remove('map-selected'));}
 draw(){
  if(!this.active||!this.inView||this.mode==='off'||document.hidden)return;
  const dark=document.documentElement.dataset.theme==='dark';
  if(this.globe&&!this.failed){
   const appearance=this.dirty||dark!==this.dark?{
    dark:dark?1:0,baseColor:dark?[.78,.86,.9]:[1,1,1],glowColor:dark?[.102,.125,.145]:[1,1,1],mapBrightness:dark?4:6,
    markers:this.groups.map(g=>({location:g.location,size:.025,color:g.members.some(s=>online(s))?[.15,.72,.46]:[.65,.4,.4]})),
    arcs:[]
   }:{};
   const size=this.globeSize||(this.mobile?265:355),dimensions=size!==this.renderSize?{width:size,height:size}:{};
   this.globe.update({phi:this.phi,theta:this.theta,...dimensions,...appearance});this.renderSize=size;this.dirty=false;this.dark=dark;
  }
  this.scheduleRotation();
  if(this.drag)return;

  const width=this.stageWidth||this.stage?.clientWidth||0,height=this.stageHeight||this.stage?.clientHeight||0,radius=(this.globeSize||this.holder?.clientWidth||0)*.4,occupied=[],keep=new Set();
  const visibleGroups=this.labelGroups();
  for(const g of visibleGroups){
   keep.add(g.key);let button=this.labels.get(g.key);
   if(!button){
    button=document.createElement('button');button.className='map-label';button.innerHTML='<i class="status-dot" aria-hidden="true"></i><span></span>';
    button.addEventListener('mouseenter',()=>this.showTip(g.key));button.addEventListener('focus',()=>this.showTip(g.key));button.addEventListener('mouseleave',()=>this.clearTip());button.addEventListener('blur',()=>this.clearTip());
    button.addEventListener('click',()=>{this.onRegion(g.code);this.showTip(g.key);});
    this.labelsRoot.append(button);this.labels.set(g.key,button);
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
