import test from 'node:test';
import assert from 'node:assert/strict';
import {highLoad,expiring,expiryDays,sampleGroups,ActivityObserver} from '../assets/insights.js';

test('quick filters use real online resource data and calendar dates',()=>{
 const now=new Date(2026,8,8,23,59).getTime();
 const s={id:'a',last_updated:now,cpu:1,ram_used:85,ram_total:100};
 assert.equal(highLoad(s,now),true);assert.equal(highLoad({...s,is_online:false},now),false);
 assert.equal(highLoad({last_updated:now},now),false);
 assert.equal(expiryDays('2026-09-22',now),14);assert.equal(expiring({expire_date:'2026-09-22'},now),true);
 assert.equal(expiring({expire_date:'2026-09-23'},now),false);assert.equal(expiring({expire_date:'2026-09-01'},now),true);
 assert.equal(expiryDays('2026-02-30',now),null);assert.equal(expiring({expire_date:'never'},now),false);
});

test('sample status distinguishes missing metrics without inventing missing time slots',()=>{
 const now=1800000000000,ts=now-1000;
 const group=samples=>sampleGroups(samples,'cu',now)[0];
 assert.deepEqual(sampleGroups([],'cu',now),[]);
 assert.equal(group([{ts,cu:0,loss:{cu:0}}]).state,'healthy');
 assert.equal(group([{ts,cu:80}]).state,'unknown');
 assert.equal(group([{ts,cu:-1,loss:{cu:0}}]).state,'unknown');
 assert.equal(group([{ts,cu:240,loss:{cu:0}}]).state,'warning');
 assert.equal(group([{ts,cu:null,loss:{cu:100}}]).state,'failed');
 const sparse=Array.from({length:20},(_,i)=>({ts:now-6840000+i*360000,cu:80,loss:{cu:0}}));
 assert.equal(sampleGroups(sparse,'cu',now).length,20);
 assert.ok(sampleGroups(sparse,'cu',now).every(b=>b.state==='healthy'&&b.samples.length===1));
 const dense=Array.from({length:240},(_,i)=>({ts:now-7200000+i*30000,cu:80,loss:{cu:0}}));
 dense[4]={...dense[4],cu:null,loss:{cu:100}};dense[14]={...dense[14],loss:{cu:null}};
 const grouped=sampleGroups(dense,'cu',now);
 assert.equal(grouped.length,24);assert.equal(grouped[0].state,'failed');assert.equal(grouped[1].state,'unknown');
 assert.equal(grouped.flatMap(b=>b.samples).length,240);
 assert.deepEqual(sampleGroups([{ts:now+1000,cu:80},{ts:now-8000000,cu:80}],'cu',now),[]);
});

test('events establish a baseline, report transitions once, and require measured recovery',()=>{
 const now=Date.now(),observer=new ActivityObserver();
 let s={id:'a',name:'Node',last_updated:now,cpu:30,ping_cu:100,loss_cu:0};
 assert.deepEqual(observer.scan([s],now),[]);
 s={...s,cpu:90,ping_cu:220};assert.equal(observer.scan([s],now).filter(e=>e.kind==='warning').length,2);
 assert.equal(observer.scan([s],now).length,0);
 s={...s,cpu:82,ping_cu:null,loss_cu:null};assert.equal(observer.scan([s],now).length,0);
 s={...s,cpu:79,ping_cu:170,loss_cu:0};assert.equal(observer.scan([s],now).filter(e=>e.kind==='recovery').length,2);
 assert.equal(observer.scan([{...s,is_online:false}],now)[0].kind,'offline');
 assert.equal(observer.scan([s],now)[0].kind,'recovery');
 observer.scan([],now);assert.deepEqual(observer.scan([s],now),[]);
});
