import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('assets/atlas.css','utf8');
test('v0.5.9 compact hotfix is present',()=>{
  assert.match(css,/Atlas v0\.5\.9 compact hotfix/);
  assert.match(css,/\.node-meta \.os-logo\{/);
  assert.match(css,/\.node-region\{/);
});
