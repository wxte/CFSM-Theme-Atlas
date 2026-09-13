import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.16 centers the OS emblem and reallocates desktop node columns',()=>{
  assert.match(html,/class="node-os-emblem"/);
  assert.match(css,/Atlas v0\.5\.16 node alignment \+ spacing polish/);
  assert.match(css,/grid-row:1 \/ 3!important/);
  assert.match(css,/align-self:center!important/);
  assert.match(css,/minmax\(158px,1\.02fr\)/);
  assert.match(css,/\n      96px\n      58px\n/);
  assert.match(css,/grid-template-columns:28px minmax\(84px,1fr\) 34px/);
  assert.doesNotMatch(css,/Atlas v0\.5\.15 node density \+ authentic OS marks/);
});
