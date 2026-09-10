import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/atlas.css'),'utf8');

test('v0.4.9 keeps fonts same-origin and old CJK subsets off the runtime path',()=>{
  assert.doesNotMatch(html,/cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic/);
  assert.match(html,/rel="preload" href="\/assets\/vendor\/geist-sans\.woff2"/);
  assert.doesNotMatch(html,/atlas-ui-(?:core|semibold)\.woff2/);
  assert.doesNotMatch(css,/atlas-ui-(?:core|semibold)\.woff2/);
  assert.match(css,/"JetBrains Mono"/);
  assert.match(css,/font-family:"Atlas Latin"/);
  assert.match(css,/font-display:swap/);
});

test('font files referenced by CSS are present',()=>{
  const files=[...css.matchAll(/url\("\.\/vendor\/([^"?]+)"\)/g)].map(match=>match[1]);
  assert.ok(files.length>=1);
  for(const file of new Set(files))assert.ok(fs.existsSync(path.join(root,'assets/vendor',file)),file);
});
