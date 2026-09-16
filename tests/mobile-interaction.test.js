import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bindSampleDrag} from '../assets/sample-drag.js';
test('sample dragging captures one pointer and stops on cancellation',()=>{
 const handlers={},samples=[];let reads=0,captured;
 const el={addEventListener:(k,f)=>handlers[k]=f,getBoundingClientRect:()=>{reads++;return {left:10,width:100}},focus(){},setPointerCapture:id=>captured=id};
 bindSampleDrag(el,(x,r)=>samples.push((x-r.left)/r.width));
 handlers.pointerdown({pointerId:1,clientX:20,button:0});handlers.pointermove({pointerId:2,clientX:90});handlers.pointermove({pointerId:1,clientX:60});
 assert.deepEqual(samples,[.1,.5]);assert.equal(reads,1);assert.equal(captured,1);
 handlers.pointercancel({pointerId:1});handlers.pointermove({pointerId:1,clientX:90});assert.equal(samples.length,2);
});
test('mobile header follows scroll direction and restores desktop controls',()=>{
 const handlers={},classes=new Set(),controls=[{},{}];const mobile={matches:true,addEventListener(){}};let y=0;
 const masthead={querySelector:()=>({offsetTop:57}),querySelectorAll:()=>controls,addEventListener(){}};
 const ctx=vm.createContext({document:{documentElement:{style:{setProperty(){}},classList:{toggle:(k,v)=>v?classes.add(k):classes.delete(k)}},querySelector:s=>s==='.masthead'?masthead:{hidden:true},activeElement:{closest:()=>null}},window:{get scrollY(){return y}},matchMedia:()=>mobile,addEventListener:(k,f)=>handlers[k]=f,requestAnimationFrame:f=>f()});
 vm.runInContext(fs.readFileSync('assets/mobile-polish.js','utf8'),ctx);
 y=220;handlers.scroll();assert.ok(classes.has('atlas-mobile-compact'));assert.ok(controls.every(x=>x.inert));
 y=180;handlers.scroll();assert.equal(classes.size,0);assert.ok(controls.every(x=>!x.inert));
 y=300;handlers.scroll();mobile.matches=false;handlers.scroll();assert.equal(classes.size,0);
});
