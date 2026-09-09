import test from 'node:test';
import assert from 'node:assert/strict';
import {sparkPath,recentSamples,sampleState} from '../assets/node-trends.js';
test('sparkline breaks across missing reports and long gaps without invalid coordinates',()=>{
 assert.equal(sparkPath([{ts:1,cpu:4}],'cpu'),'');
 const path=sparkPath([{ts:1,cpu:0},{ts:2,cpu:null},{ts:3,cpu:100},{ts:900000,cpu:50}],'cpu');
 assert.equal((path.match(/M/g)||[]).length,3);assert.ok(!/NaN|Infinity|L/.test(path));
});
test('tracker preserves last 60 actual timestamps and marks incomplete metrics unknown',()=>{
 const input=Array.from({length:80},(_,ts)=>({ts,cu:20,ct:30,cm:40,loss:{cu:0,ct:0,cm:0}}));
 assert.equal(recentSamples(input).length,60);assert.equal(recentSamples(input)[0].ts,20);
 assert.equal(sampleState(input[0]),'healthy');assert.equal(sampleState({cu:12}),'unknown');
 assert.equal(sampleState({loss:{cu:100}}),'failed');assert.equal(sampleState({cu:250}),'warning');
});
