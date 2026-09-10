import test from 'node:test';
import assert from 'node:assert/strict';
import {windowSamples,nearestPoint,historyFromArrays,aggregateHistory,NetworkCharts} from '../assets/network.js';

test('range changes map the full selected interval onto the chart',()=>{
 const chart=new NetworkCharts();chart.now=9000000;
 for(const range of [3600000,7200000]){
  chart.rangeMs=range;
  assert.equal(chart.x({},chart.now-range),30);
  assert.equal(chart.x({},chart.now-range/2),192);
  assert.equal(chart.x({},chart.now),354);
 }
});

test('live downsampling retains a full two-hour window and actual timestamps',()=>{
 const now=9000000;
 const input=Array.from({length:3601},(_,i)=>({ts:now-7200000+i*2000,cu:i,loss:{cu:0}}));
 const result=windowSamples(input,now);
 assert.ok(result.length<=241);
 assert.ok(result[0].ts<now-7100000);
 assert.equal(result.at(-1).ts,now);
 assert.ok(result.every(p=>input.some(actual=>actual.ts===p.ts&&actual.cu===p.cu&&actual.loss.cu===p.loss.cu)));
});

test('partial carrier reports and loss-only history preserve exact report times',()=>{
 const now=9000000,ts=now-10000;
 const points=windowSamples([{ts,cu:100,ct:150,loss:{cu:0,ct:2}},{ts:ts+1000,cm:80,loss:{cm:0}},{ts,bd:40}],now);
 assert.equal(points.length,2);
 assert.equal(points[0].ct,150);assert.equal(points[0].loss.ct,2);assert.equal(points[0].bd,40);
 assert.equal(points[1].ct,undefined);
 const merged=historyFromArrays([{ts:String(ts),cu:100}],[{ts,cu:0},{ts:ts+1000,cu:100}]);
 assert.equal(merged[0].loss.cu,0);assert.equal(merged[1].cu,undefined);assert.equal(merged[1].loss.cu,100);
});

test('overview uses existing history immediately and weights nodes equally',()=>{
 const now=9000000,ts=now-360000;
 const histories=new Map([['a',[{ts,cu:100},{ts:ts+1000,cu:100}]],['b',[{ts,cu:200}]],['missing',[{ts,cu:null}]]]);
 const result=aggregateHistory(['a','b','missing'],histories,'cu',now);
 assert.equal(result.sources,2);assert.equal(result.points.length,1);
 assert.equal(result.points[0].value,150);assert.equal(result.points[0].count,2);
 assert.equal(aggregateHistory(['a'],histories,'cu',now).points[0].value,100);
 assert.deepEqual(aggregateHistory(['a'],histories,'bd',now).points,[]);
});

test('unknown metrics and actual loss values survive without fabricated samples',()=>{
 const now=9000000,a={ts:now-60000,cu:null,loss:{cu:20}},b={ts:now,cu:0};
 const result=windowSamples([a,b,{ts:0,cu:5},{ts:now+10000,cu:5}],now);
 assert.deepEqual(result,[a,b]);
 assert.deepEqual(nearestPoint(result,now-55000),a);
 assert.equal(nearestPoint([],now),null);
});

test('independent metric downsampling keeps ping when only loss arrives later',()=>{
 const now=9000000,ts=now-10000;
 const points=windowSamples([{ts,cu:80},{ts:ts+1000,loss:{cu:100}}],now);
 assert.equal(points.length,2);assert.equal(points[0].cu,80);assert.equal(points[1].loss.cu,100);
 assert.equal(points[0].loss,undefined);assert.equal(points[1].cu,undefined);
 const mixed=windowSamples([{ts,cu:0,ct:30},{ts:ts+1000,cu:100}],now);
 assert.equal(mixed[0].cu,undefined);assert.equal(mixed[0].ct,30);
 assert.equal(aggregateHistory(['a'],new Map([['a',mixed]]),'cu',now).points[0].value,100);
});
