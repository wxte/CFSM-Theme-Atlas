import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.10 uses one compact alignment layer and dotted quota progress',()=>{
  assert.match(css,/Atlas v0\.5\.10 canonical compact alignment/);
  assert.doesNotMatch(css,/Atlas v0\.5\.8 alignment polish/);
  assert.doesNotMatch(css,/Atlas v0\.5\.9 compact hotfix/);
  assert.match(css,/--atlas-quota-dot-empty:/);
  assert.match(css,/radial-gradient\(circle at 3px 50%/);
  assert.match(css,/minmax\(116px,\.95fr\)/);
});
