import test from 'node:test';
import assert from 'node:assert/strict';
import {highLoad,expiring,expiryDays,networkBuckets,ActivityObserver} from '../assets/insights.js';

test('quick filters use real online resource data and calendar dates',()=>{
 const now=new Date(2026,8,8,23,59).getTime();
 const s={id:'a',last_updated:now,cpu:1,ram_used:85,ram_total:100};
 assert.equal(highLoad(s,now),true);assert.equal(highLoad({...s,is_online:false},now),false);
 assert.equal(highLoad({last_updated:now},now),false);
 assert.equal(expiryDays('2026-09-22',now),14);assert.equal(expiring({expire_date:'2026-09-22'},now),true);
 assert.equal(expiring({expire_date:'2026-09-23'},now),false);assert.equal(expiring({expire_date:'2026-09-01'},now),true);
 assert.equal(expiryDays('2026-02-30',now),null);assert.equal(expiring({expire_date:'never'},now),false);
});

test('network buckets distinguish missing, zero, partial and failed observations',()=>{
 const now=1800000000000,ts=now-1000;
 const bucket=samples=>networkBuckets(samples,'cu',now).find(b=>ts>=b.start&&ts<b.end);
 assert.equal(bucket([]).state,'unknown');
 assert.equal(bucket([{ts,cu:0,loss:{cu:0}}]).state,'healthy');
 assert.equal(bucket([{ts,cu:80}]).state,'unknown');
 assert.equal(bucket([{ts,cu:-1,loss:{cu:0}}]).state,'unknown');
 assert.equal(bucket([{ts,cu:240,loss:{cu:0}}]).state,'warning');
 assert.equal(bucket([{ts,cu:null,loss:{cu:100}}]).state,'failed');
 assert.equal(bucket([{ts:ts-1000,cu:250,loss:{cu:2}},{ts,cu:80,loss:{cu:0}}]).maxPing,250);
 assert.equal(bucket([{ts:ts-1000,cu:80,loss:{cu:0}},{ts,cu:null}]).state,'unknown');
 assert.equal(networkBuckets([{ts:now+1000,cu:80,loss:{cu:0}},{ts:now-8000000,cu:80,loss:{cu:0}}],'cu',now).every(b=>b.samples.length===0),true);
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
