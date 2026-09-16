import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const globe=fs.readFileSync('assets/globe.js','utf8');

test('globe keeps flight lines disabled',()=>{
  assert.doesNotMatch(globe,/arcs:this\.links\(\)/);
  assert.match(globe,/arcs:\[\]/);
});

test('globe performance profile stays conservative when present',()=>{
  if(/mapSamples:compact\?/.test(globe)){
    assert.match(globe,/mapSamples:compact\?3200:mobile\?4200:constrained\?6000:9000/);
    assert.match(globe,/Math\.min\(1\.35/);
  }else{
    assert.match(globe,/mapSamples:this\.mobile\?4200:9000/);
  }
});
