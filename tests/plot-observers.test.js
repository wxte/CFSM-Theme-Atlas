import test from 'node:test';
import assert from 'node:assert/strict';
import {Plot} from '../assets/plot.js';

test('observer caches preserve round endpoints, animation and cleanup without layout reads',()=>{
 const names=['document','ResizeObserver','IntersectionObserver','matchMedia','requestAnimationFrame','cancelAnimationFrame'];
 const saved=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let resize,intersection,reduced=false,hidden=false,next=0;const frames=new Map();
 class Element{
  attrs=new Map();isConnected=true;viewBox={baseVal:{width:120,height:34}};classList={contains:()=>true};
  getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}
  hasAttribute(k){return this.attrs.has(k);}removeAttribute(k){this.attrs.delete(k);}
  prepend(){}append(){}before(){}closest(){return hidden?{}:null;}
  getBoundingClientRect(){throw Error('Unexpected synchronous layout read');}
 }
 const svg=new Element(),line=new Element();let plot;
 try{
  globalThis.document={hidden:false,createElementNS:()=>new Element()};
  globalThis.ResizeObserver=class{constructor(cb){this.cb=cb;resize=this;}observe(){}disconnect(){this.disconnected=true;}};
  globalThis.IntersectionObserver=class{constructor(cb){this.cb=cb;intersection=this;}observe(){}disconnect(){this.disconnected=true;}};
  globalThis.matchMedia=()=>({matches:reduced});
  globalThis.requestAnimationFrame=cb=>{frames.set(++next,cb);return next;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  plot=new Plot(svg,line);
  const point=(ts,y)=>[{ts,x:118,y}];
  plot.update(point(1,20));assert.equal(frames.size,0); // Before observer delivery, paint immediately.
  resize.cb([{target:svg,contentRect:{width:240,height:68}}]);
  intersection.cb([{target:svg,isIntersecting:true,intersectionRect:{width:240,height:68}}]);
  assert.equal(Number(plot.dot.getAttribute('rx'))*240/120,3);
  assert.equal(Number(plot.dot.getAttribute('ry'))*68/34,3);
  plot.update(point(2,10));assert.equal(frames.size,1);assert.ok(svg.hasAttribute('data-animating'));
  let [id,cb]=frames.entries().next().value;frames.delete(id);cb(plot.started+160);
  assert.ok(Number(plot.dot.getAttribute('cy'))>10&&Number(plot.dot.getAttribute('cy'))<20);
  [id,cb]=frames.entries().next().value;frames.delete(id);cb(plot.started+320);
  assert.equal(plot.dot.getAttribute('cy'),'10');assert.equal(frames.size,0);
  resize.cb([{target:svg,contentRect:{width:120,height:102}}]);
  assert.equal(Number(plot.dot.getAttribute('rx')),3);
  assert.equal(Number(plot.dot.getAttribute('ry'))*102/34,3);
  plot.update(point(3,5));intersection.cb([{target:svg,isIntersecting:false,intersectionRect:{width:0,height:0}}]);
  assert.equal(frames.size,0);assert.equal(plot.dot.getAttribute('cy'),'5');
  intersection.cb([{target:svg,isIntersecting:true,intersectionRect:{width:120,height:102}}]);
  reduced=true;plot.update(point(4,15));assert.equal(frames.size,0);
  reduced=false;hidden=true;plot.update(point(5,25));assert.equal(frames.size,0);
  hidden=false;plot.update(point(6,12));resize.cb([{target:svg,contentRect:{width:0,height:0}}]);assert.equal(frames.size,0);
  resize.cb([{target:svg,contentRect:{width:120,height:34}}]);plot.update(point(7,6));
  plot.destroy();assert.ok(resize.disconnected&&intersection.disconnected);assert.equal(frames.size,0);
 }finally{
  plot?.destroy();for(const [k,d] of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];
 }
});
