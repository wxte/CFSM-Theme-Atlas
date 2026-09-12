import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.11 removes the desktop two-column node mode',()=>{
  assert.doesNotMatch(html,/node-view-switch/);
  assert.doesNotMatch(html,/data-node-view=/);
  assert.doesNotMatch(app,/atlas-node-view-v056/);
  assert.doesNotMatch(app,/localStorage\.setItem\('atlas-node-view'/);
  assert.doesNotMatch(css,/#node-list\[data-view=cards\]\{/);
});

test('v0.5.11 avoids the unused Geist font and keeps the light list path',()=>{
  assert.doesNotMatch(css,/geist-sans\.woff2/);
  assert.doesNotMatch(css,/font-family:"Atlas Latin"/);
  assert.match(css,/Atlas v0\.5\.11 list-only performance polish/);
  assert.match(app,/function scheduleOverviewSummary\(\)/);
  assert.match(app,/state\.page!=='overview'/);
});
