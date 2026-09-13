import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('assets/atlas.css','utf8');

test('quota keeps the rounded dotted track and compact final spacing',()=>{
  assert.match(css,/radial-gradient\(ellipse at center/);
  assert.match(css,/background-color:transparent!important/);
  assert.match(css,/border-radius:999px!important/);
  assert.match(css,/background-size:8px 5px!important/);
  assert.match(css,/width:min\(100%,194px\)!important/);
});
