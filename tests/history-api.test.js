import test from 'node:test';
import assert from 'node:assert/strict';
import {HistoryAPI,parseHistory} from '../assets/history-api.js';
import {timeGroups,windowSamples} from '../assets/network.js';
test('24h and 7d history retain old actual points and absent metrics',()=>{
 const now=Date.now(),rows=[{timestamp:now-6*86400000,ping_cu:0,loss_cu:0},{timestamp:now-80000000,ping_cu:150},{timestamp:now+99999,ping_cu:10}];
 assert.equal(parseHistory(rows,now,24).length,1);const week=parseHistory(rows,now,168);assert.equal(week.length,2);assert.equal(week[1].loss.cu,undefined);
 assert.equal(windowSamples(week,now,604800000).length,2);assert.equal(windowSamples(week,now).length,0);
});
test('observation groups do not invent empty slots and expose loss-only failures',()=>{
 const now=Date.now(),points=[{ts:now-1000,cu:0,loss:{cu:0}},{ts:now-3600000,loss:{cu:100}}];
 const groups=timeGroups(points,'cu',now,86400000);assert.equal(groups.length,2);assert.equal(groups.filter(g=>g.samples.length).length,2);assert.equal(groups.at(-1).state,'healthy');assert.ok(groups.some(g=>g.state==='failed'));assert.equal(groups.filter(g=>g.state==='unknown').length,0);
});
test('history loader deduplicates, limits concurrency, caches and reports 7d auth failure',async()=>{
 let active=0,max=0,calls=0;
 const api=new HistoryAPI(async url=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;return url.endsWith('hours=168')?{ok:false,status:401}:{ok:true,json:async()=>[]};});
 await Promise.all(Array.from({length:8},(_,i)=>api.get('node'+i,24)));assert.ok(max<=3);
 await api.get('node0',24);assert.equal(calls,8);const [a,b]=await Promise.all([api.get('private',168),api.get('private',168)]);assert.equal(a,b);assert.match(a.error,/需要登录/);assert.deepEqual(a.points,[]);
});

test('compact groups retain every real sample and preserve loss and missing metrics',()=>{
 const now=Date.now(),points=Array.from({length:41},(_,i)=>({ts:now-7200000+i*175000,cu:150,loss:{cu:0}}));
 const groups=timeGroups(points,'cu',now,7200000);assert.equal(groups.length,24);assert.ok(groups.every(g=>g.samples.length>0&&g.state==='healthy'));assert.deepEqual(groups.flatMap(g=>g.samples),points);
 points[5].cu=null;assert.ok(timeGroups(points,'cu',now,7200000).some(g=>g.state==='unknown'));
 const dense=timeGroups(Array.from({length:120},(_,i)=>({ts:now-120000+i*1000,cu:80,loss:{cu:i===1?100:0}})),'cu',now,7200000);assert.equal(dense.length,24);assert.ok(dense.every(g=>g.samples.length===5));assert.equal(dense[0].state,'failed');
});
