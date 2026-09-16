import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeMap,globeProfile} from '../assets/globe.js';

test('rotation advances at a bounded rate and pauses across lifecycle and interaction changes',()=>{
 const names=['document','matchMedia','ResizeObserver','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','addEventListener','setTimeout','clearTimeout','performance'];
 const saved=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let now=0,id=0,intersect;const timers=new Map(),frames=new Map(),events={},canvasEvents={},motionEvents={},updates=[];
 const reduced={matches:false,addEventListener:(k,fn)=>motionEvents[k]=fn,removeEventListener:k=>delete motionEvents[k]};
 const element={addEventListener:(k,fn)=>canvasEvents[k]=fn,clientWidth:355,clientHeight:285,style:{},append(){},setPointerCapture(){}};
 const mocks={document:{hidden:false,documentElement:{dataset:{}},querySelector:()=>element,querySelectorAll:()=>[],addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]},matchMedia:q=>q.includes('reduced')?reduced:{matches:false},ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{constructor(fn){intersect=fn}observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(k,fn)=>events[k]=fn,setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),performance:{now:()=>now}};
 for(const [k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
 const flush=()=>{const queued=[...frames.values()];frames.clear();for(const fn of queued)fn()};
 const tick=ms=>{now+=ms;const [key,timer]=timers.entries().next().value;timers.delete(key);timer.fn();flush()};
 try{
  const map=new NodeMap(()=>{});map.globe={update:o=>updates.push(o),destroy(){}};
  intersect([{isIntersecting:true}]);flush();assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,50);
  tick(50);assert.ok(Math.abs(map.phi-.009)<1e-10);assert.equal(timers.size,1);
  assert.deepEqual(updates[0].arcs,[]);assert.equal(updates[1].markers,undefined);assert.equal(updates[1].width,undefined);
  for(let i=0;i<10;i++)map.requestDraw();assert.equal(frames.size,1);flush();assert.equal(timers.size,1);
  const pauseResume=(pause,resume)=>{const phi=map.phi;pause();assert.equal(timers.size,0);now+=60000;resume();flush();assert.equal(timers.size,1);assert.equal(map.phi,phi);tick(50);assert.ok(Math.abs(map.phi-phi-.009)<1e-10)};
  pauseResume(()=>{document.hidden=true;events.visibilitychange()},()=>{document.hidden=false;events.visibilitychange()});
  pauseResume(()=>intersect([{isIntersecting:false}]),()=>intersect([{isIntersecting:true}]));
  pauseResume(()=>map.active=false,()=>map.active=true);
  pauseResume(()=>map.mode='off',()=>map.mode='auto');
  pauseResume(()=>{reduced.matches=true;motionEvents.change()},()=>{reduced.matches=false;motionEvents.change()});
  pauseResume(()=>canvasEvents.pointerdown({clientX:0,clientY:0,pointerId:1}),()=>canvasEvents.pointerup());
  map.groups=[{key:'test',members:[]}];pauseResume(()=>map.showTip('test'),()=>{map.groups=[];map.clearTip()});
  map.profile.constrained=true;map.stopRotation();map.draw();assert.equal([...timers.values()][0].delay,1000/12);
  const phi=map.phi;tick(60000);assert.ok(Math.abs(map.phi-phi-.018)<1e-10);
  map.unavailable();assert.equal(timers.size,0);map.requestDraw();assert.equal(frames.size,0);
  map.failed=false;map.draw();assert.equal(timers.size,1);events.pagehide();assert.equal(timers.size,0);map.requestDraw();assert.equal(frames.size,0);
 }finally{for(const k of names){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k]}}
});

test('Performance quality limits remain unchanged for desktop and constrained devices',()=>{
 assert.equal(globeProfile({devicePixelRatio:3}).devicePixelRatio,1.35);
 assert.equal(globeProfile().mapSamples,9000);
 assert.equal(globeProfile({mobile:true,width:390}).mapSamples,3200);
 assert.equal(globeProfile({mobile:true,width:700}).mapSamples,4200);
 for(const options of [{saveData:true},{deviceMemory:4},{hardwareConcurrency:4},{reducedMotion:true}]){
  const p=globeProfile(options);assert.equal(p.mapSamples,6000);assert.equal(p.devicePixelRatio,1);
 }
});

