import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeMap} from '../assets/globe.js';

test('offscreen globe defers initialization and suppresses queued frames',async()=>{
 const names=['document','matchMedia','ResizeObserver','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','addEventListener','removeEventListener'];
 const saved=Object.fromEntries(names.map(k=>[k,globalThis[k]]));
 let intersect,frame,updates=0;
 const element={addEventListener(){},clientWidth:355,clientHeight:285,style:{},append(){},setPointerCapture(){}};
 Object.assign(globalThis,{
  document:{hidden:false,documentElement:{dataset:{}},querySelector:()=>element,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
  matchMedia:()=>({matches:false}),
  ResizeObserver:class{observe(){} disconnect(){}},
  IntersectionObserver:class{constructor(fn){intersect=fn;}observe(){} disconnect(){}},
  requestAnimationFrame:fn=>{frame=fn;return 1;},
  cancelAnimationFrame(){},
  addEventListener(){},
  removeEventListener(){}
 });
 try{
  const map=new NodeMap(()=>{});await map.init();
  assert.equal(map.readyToInit,true);assert.equal(map.initializing,undefined);
  map.globe={update(options){updates++;assert.ok(!options.width||options.width===355);}};
  map.requestDraw();assert.equal(frame,undefined);
  intersect([{isIntersecting:true}]);assert.equal(typeof frame,'function');
  intersect([{isIntersecting:false}]);frame();assert.equal(updates,0);
  frame=undefined;intersect([{isIntersecting:true}]);assert.equal(typeof frame,'function');frame();assert.equal(updates,1);
  map.active=false;map.draw();assert.equal(updates,1);
  map.active=true;document.hidden=true;map.draw();assert.equal(updates,1);
  document.hidden=false;map.mode='off';map.draw();assert.equal(updates,1);
 }finally{for(const k of names){if(saved[k]===undefined)delete globalThis[k];else globalThis[k]=saved[k];}}
});
