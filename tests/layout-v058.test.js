import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.8 alignment polish markers are present',()=>{
  assert.match(css,/Atlas v0\.5\.8 alignment polish/);
  assert.match(css,/\.node-meta \.os-tag\{/);
  assert.match(css,/font-family:var\(--atlas-mono\)!important;/);
  assert.match(css,/\.rate-cell strong,/);
});
