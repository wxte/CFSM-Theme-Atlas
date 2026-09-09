import test from 'node:test';import assert from 'node:assert/strict';
import {plotPaths} from '../assets/plot.js';
import {sparkPoints} from '../assets/node-trends.js';
test('resource curves pass through peaks with controls bounded by adjacent observations',()=>{
 const points=[{ts:1,x:2,y:30},{ts:2,x:60,y:4},{ts:3,x:118,y:30}];
 const {line,area,last}=plotPaths(points);
 assert.match(line,/C31,30 31,4 60,4/);assert.match(line,/C89,4 89,30 118,30/);assert.equal(last,points[2]);assert.match(area,/Z$/);
});
test('fill and line both break at unknown metrics; trailing unknown has no endpoint',()=>{
 const points=[{x:2,y:20},{x:10,y:15},null,{x:30,y:2},{x:40,y:8},null];
 const p=plotPaths(points);assert.equal((p.line.match(/M/g)||[]).length,2);assert.equal((p.area.match(/Z/g)||[]).length,2);assert.equal(p.last,null);assert.ok(!/NaN|Infinity/.test(p.line+p.area));
 assert.deepEqual(plotPaths([]),{line:'',area:'',last:null});assert.equal(plotPaths([{x:1,y:0}]).area,'');
});
test('latency plotting stays linear and resources retain long outages',()=>{
 assert.equal(plotPaths([{x:0,y:30},{x:1,y:0},{x:2,y:30}],80,false).line,'M0,30 L1,0 L2,30');
 const p=sparkPoints([{ts:1,cpu:0},{ts:2,cpu:100},{ts:900000,cpu:4}],'cpu',100);assert.equal(p[2],null);assert.equal(p[1].y,4);assert.equal(p[0].y,30);
});
