import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('table headers and desktop quota layout keep the compact final contract',()=>{
  assert.match(html,/Atlas <b>v0\.5\.21<\/b>/);
  assert.match(css,/\.transfer-cell>small\{[^}]*display:none!important/s);
  assert.match(css,/width:min\(100%,194px\)!important/);
  assert.match(css,/font-size:10\.35px!important/);
});
