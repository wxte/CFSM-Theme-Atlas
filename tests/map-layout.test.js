import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabel} from '../assets/map-layout.js';
test('co-located phone labels stay disjoint and within map bounds',()=>{
 const boxes=[];
 for(let i=0;i<7;i++)assert.ok(placeLabel(170,115,130,24,340,240,boxes));
 for(const a of boxes){assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=340&&a.y+a.h<=240);for(const b of boxes)if(a!==b)assert.ok(a.y+a.h<=b.y||b.y+b.h<=a.y||a.x+a.w<=b.x||b.x+b.w<=a.x);}
 assert.equal(placeLabel(0,0,130,24,100,240,[]),null);
});
