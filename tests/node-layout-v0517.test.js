import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.17 refines desktop columns and mobile density',()=>{
  assert.match(html,/class="node-os-emblem"/);
  assert.match(css,/Atlas v0\.5\.17 desktop \+ mobile refinement/);
  assert.match(css,/minmax\(166px,1\.04fr\)/);
  assert.match(css,/\n      116px\n      50px\n/);
  assert.match(css,/grid-template-columns:28px minmax\(88px,1fr\) 34px/);
  assert.match(css,/\.node-pings>span\{\n    white-space:nowrap!important/);
  assert.match(css,/\.map-panel\{\n    min-height:310px!important/);
  assert.match(css,/grid-template-columns:auto minmax\(0,1fr\)!important/);
  assert.doesNotMatch(css,/Atlas v0\.5\.16 node alignment \+ spacing polish/);
});
