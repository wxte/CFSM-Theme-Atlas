import test from 'node:test';
import assert from 'node:assert/strict';
import {windowSamples,nearestPoint} from '../assets/network.js';
test('live downsampling retains a full two-hour window and actual timestamps',()=>{
 const now=9000000;
 const input=Array.from({length:3601},(_,i)=>({ts:now-7200000+i*2000,cu:i,loss:{cu:0}}));
 const result=windowSamples(input,now);
 assert.ok(result.length<=241);
 assert.ok(result[0].ts<now-7100000);
 assert.equal(result.at(-1).ts,now);
 assert.ok(result.every(p=>input.includes(p)));
});
test('unknown metrics and actual loss values survive without fabricated samples',()=>{
 const now=9000000,a={ts:now-60000,cu:null,loss:{cu:20}},b={ts:now,cu:0};
 const result=windowSamples([a,b,{ts:0,cu:5},{ts:now+10000,cu:5}],now);
 assert.deepEqual(result,[a,b]);
 assert.equal(nearestPoint(result,now-55000),a);
 assert.equal(nearestPoint([],now),null);
});
