import {placeLabel} from './map-layout.js';
import {coordinate, region, online, bytes, ping} from './data.js';
const $ = s => document.querySelector(s);
export class NodeMap {
  constructor(onRegion) {
    this.onRegion = onRegion; this.servers = []; this.options = {}; this.phi = 0; this.theta = .2; this.labels = new Map(); this.signature = ''; this.pending = 0;
    const canvas = $('#globe');
    canvas.addEventListener('pointerdown', e => { this.drag = {x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (!this.drag) return; this.phi += (e.clientX-this.drag.x)*.008; this.theta = Math.max(-1.2,Math.min(1.2,this.theta+(e.clientY-this.drag.y)*.005)); this.drag = {x:e.clientX,y:e.clientY}; this.requestDraw(); });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => { this.drag = null; });
    canvas.addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); this.phi += e.key==='ArrowRight'?.15:e.key==='ArrowLeft'?-.15:0; this.theta = Math.max(-1.2,Math.min(1.2,this.theta+(e.key==='ArrowDown'?.1:e.key==='ArrowUp'?-.1:0))); this.requestDraw(); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.unavailable(); });
    new ResizeObserver(() => this.requestDraw()).observe($('#map-stage'));
    document.addEventListener('visibilitychange', () => { if(!document.hidden)this.requestDraw(); });
  }
  async init() {
    try {
      const {default:createGlobe} = await import('./vendor/cobe.js');
      const canvas = $('#globe');
      if (!canvas.getContext('webgl2', {alpha:true,antialias:true}) && !canvas.getContext('webgl', {alpha:true,antialias:true})) throw Error('WebGL unavailable');
      this.globe = createGlobe(canvas,{width:420,height:420,devicePixelRatio:1.5,phi:this.phi,theta:this.theta,dark:0,diffuse:1.2,mapSamples:14000,mapBrightness:6,mapBaseBrightness:0,baseColor:[1,1,1],markerColor:[.2,.6,.35],glowColor:[1,1,1],scale:1,markers:[],arcs:[],onTextureError:()=>{this.unavailable();}});
      this.draw();
    } catch { this.unavailable(); }
  }
  unavailable(){this.failed=true;$('#globe-holder').hidden=true;$('#map-labels').hidden=true;$('#globe-error').hidden=false;$('#map-hint').textContent='地球暂不可用';}
  update(servers, options, selected='') {
    this.servers=servers; this.options=options; this.selected=selected;
    const next=JSON.stringify([servers.map(s=>[s.id,coordinate(s,options),online(s),s.name]),options.connections,selected]);
    if(next!==this.signature){this.signature=next; this.requestDraw();}
    if(this.hoverId) this.showTip(this.hoverId);
  }
  focus(code) { const s=this.servers.find(s=>region(s.region).code===code); const c=s&&coordinate(s,this.options); if(c){this.phi=-c[1]*Math.PI/180-Math.PI/2;this.theta=c[0]*Math.PI/180;} this.requestDraw(); }
  requestDraw(){if(this.pending||document.hidden)return; this.pending=requestAnimationFrame(()=>{this.pending=0;this.draw();});}
  links(){ const byId=new Map(this.servers.map(s=>[s.id,s]));return (Array.isArray(this.options.connections)?this.options.connections:[]).slice(0,80).flatMap(link=>{const from=byId.get(link.from),to=byId.get(link.to);const a=from&&coordinate(from,this.options),b=to&&coordinate(to,this.options);return a&&b&&link.from!==link.to?[{from:a,to:b}]:[];}); }
  showTip(id){ const s=this.servers.find(s=>s.id===id); if(!s)return; const tip=$('#map-tip');tip.textContent=`${s.name} · ${online(s)?'在线':'离线'}\n↓ ${online(s)?bytes(s.net_in_speed,true):'—'} · 联通 ${ping(s.ping_cu)}`;tip.hidden=false;this.hoverId=id; }
  draw(){
    const points=this.servers.filter(s=>coordinate(s,this.options)&&(!this.selected||region(s.region).code===this.selected));
    const links=this.links();
    $('#link-note').textContent=links.length?`${links.length} 条连接 · 悬停查看节点`:'悬停节点查看详情';
    const dark=document.documentElement.dataset.theme==='dark';
    if(this.globe&&!this.failed)this.globe.update({phi:this.phi,theta:this.theta,dark:dark?1:0,baseColor:dark?[.8,.85,.8]:[1,1,1],glowColor:dark?[.055,.063,.071]:[1,1,1],mapBrightness:dark?4:6,mapBaseBrightness:0,markers:points.map(s=>({location:coordinate(s,this.options),size:.028,color:online(s)?[.25,.65,.4]:[.5,.5,.5]})),arcs:links,arcColor:dark?[.5,.75,.57]:[.2,.5,.3],arcWidth:.45,arcHeight:.18});
    const stage=$('#map-stage'),width=stage.clientWidth,height=stage.clientHeight;
    const occupied=[]; const keep=new Set();
    for(const s of points){
      keep.add(s.id);let label=this.labels.get(s.id);
      if(!label){label=document.createElement('button');label.className='map-label';label.addEventListener('mouseenter',()=>this.showTip(s.id));label.addEventListener('focus',()=>this.showTip(s.id));label.addEventListener('mouseleave',()=>{$('#map-tip').hidden=true;this.hoverId=null;});label.addEventListener('blur',()=>{$('#map-tip').hidden=true;this.hoverId=null;});label.addEventListener('click',()=>{this.onRegion(region(this.servers.find(x=>x.id===s.id)?.region).code);});$('#map-labels').append(label);this.labels.set(s.id,label);}
      label.textContent=s.name||'未命名';label.classList.toggle('offline',!online(s));label.title=`${s.name} · ${region(s.region).name}`;
      const [lat,lon]=coordinate(s,this.options);let x,y,visible=true;
      {const a=lat*Math.PI/180,b=lon*Math.PI/180-Math.PI;const p=[-Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b)];const rx=Math.cos(this.phi)*p[0]+Math.sin(this.phi)*p[2];const ry=Math.sin(this.phi)*Math.sin(this.theta)*p[0]+Math.cos(this.theta)*p[1]-Math.cos(this.phi)*Math.sin(this.theta)*p[2];const rz=-Math.sin(this.phi)*Math.cos(this.theta)*p[0]+Math.sin(this.theta)*p[1]+Math.cos(this.phi)*Math.cos(this.theta)*p[2];x=width/2+rx*112;y=height/2-ry*112;visible=rz>0;}
      label.hidden=!visible;
      if(!visible)continue;
      const pos=placeLabel(x,y,label.offsetWidth||130,label.offsetHeight||24,width,height,occupied);
      label.hidden=!pos;
      if(pos){label.style.left=pos.x+'px';label.style.top=pos.y+'px';}
    }
    for(const [id,label] of this.labels)if(!keep.has(id)){label.remove();this.labels.delete(id);}
  }
}

