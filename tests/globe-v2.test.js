import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {globeProfile} from '../assets/globe.js';

const source=fs.readFileSync('assets/globe.js','utf8');

test('globe uses a bounded static render profile without flight lines',()=>{
 const mobile=globeProfile({mobile:true,width:390,devicePixelRatio:3,deviceMemory:8,hardwareConcurrency:8});
 assert.equal(mobile.devicePixelRatio,1);
 assert.equal(mobile.mapSamples,4200);
 assert.equal(mobile.labelLimit,5);

 const desktop=globeProfile({mobile:false,width:1440,devicePixelRatio:2,deviceMemory:16,hardwareConcurrency:12});
 assert.equal(desktop.devicePixelRatio,1.5);
 assert.equal(desktop.mapSamples,12000);
 assert.equal(desktop.labelLimit,18);

 assert.doesNotMatch(source,/flightLinks|arcLimit|arcColor|arcWidth|arcHeight/);
 assert.doesNotMatch(source,/setInterval\(/);
 assert.match(source,/arcs:\[\]/);
});

test('save-data and reduced-motion profiles stay conservative',()=>{
 const save=globeProfile({mobile:false,width:1200,devicePixelRatio:2,deviceMemory:8,hardwareConcurrency:8,saveData:true});
 const reduced=globeProfile({mobile:false,width:1200,devicePixelRatio:2,deviceMemory:8,hardwareConcurrency:8,reducedMotion:true});
 for(const profile of [save,reduced]){
  assert.equal(profile.devicePixelRatio,1);
  assert.ok(profile.mapSamples<=8500);
  assert.ok(profile.labelLimit<=12);
 }
});

test('dragging updates WebGL without relaying out labels every frame',()=>{
 assert.match(source,/labelsRoot\.style\.visibility='hidden'/);
 assert.match(source,/if\(this\.drag\)return;/);
 assert.match(source,/this\.stageWidth/);
 assert.match(source,/this\.resizeObserver\?\.disconnect\(\)/);
});
