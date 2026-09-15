import test from 'node:test';
import assert from 'node:assert/strict';
import {globeProfile,flightLinks} from '../assets/globe.js';

test('mobile globe drops expensive arcs, DPR and sample count',()=>{
 const mobile=globeProfile({mobile:true,width:390,devicePixelRatio:3,deviceMemory:8,hardwareConcurrency:8});
 assert.equal(mobile.devicePixelRatio,1);
 assert.equal(mobile.mapSamples,4800);
 assert.equal(mobile.arcLimit,0);
 assert.equal(mobile.labelLimit,6);
 assert.equal(mobile.autoRotate,false);

 const desktop=globeProfile({mobile:false,width:1440,devicePixelRatio:2,deviceMemory:16,hardwareConcurrency:12});
 assert.equal(desktop.devicePixelRatio,1.8);
 assert.equal(desktop.mapSamples,16000);
 assert.equal(desktop.arcLimit,16);
 assert.equal(desktop.autoRotate,true);
});

test('save-data profile stays static and conservative',()=>{
 const profile=globeProfile({mobile:false,width:1200,devicePixelRatio:2,deviceMemory:8,hardwareConcurrency:8,saveData:true});
 assert.equal(profile.devicePixelRatio,1);
 assert.equal(profile.arcLimit,0);
 assert.equal(profile.autoRotate,false);
 assert.ok(profile.mapSamples<=9000);
});

test('flight lines prefer explicit topology and otherwise build a bounded visual hub',()=>{
 const now=Date.now();
 const servers=[
  {id:'a',region:'US',last_updated:now,is_online:true},
  {id:'b',region:'SG',last_updated:now,is_online:true},
  {id:'c',region:'DE',last_updated:now,is_online:true}
 ];
 const groups=[
  {key:'us',location:[37.1,-95.7],code:'US',members:[servers[0]]},
  {key:'sg',location:[1.35,103.82],code:'SG',members:[servers[1]]},
  {key:'de',location:[51.1,10.4],code:'DE',members:[servers[2]]}
 ];
 const explicit=flightLinks(groups,servers,{connections:[{from:'a',to:'b'}]},16);
 assert.deepEqual(explicit.map(x=>[x.from,x.to]),[[[37.1,-95.7],[1.35,103.82]]]);

 const derived=flightLinks(groups,servers,{},1);
 assert.equal(derived.length,1);
 assert.ok(groups.some(g=>JSON.stringify(g.location)===JSON.stringify(derived[0].from)));
 assert.notDeepEqual(derived[0].from,derived[0].to);
 assert.ok(Array.isArray(derived[0].color));
 assert.deepEqual(flightLinks(groups,servers,{},0),[]);
});
