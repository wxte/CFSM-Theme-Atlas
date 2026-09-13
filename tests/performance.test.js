import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('removes the desktop two-column node mode',()=>{
  assert.doesNotMatch(html,/node-view-switch/);
  assert.doesNotMatch(html,/data-node-view=/);
  assert.doesNotMatch(app,/atlas-node-view-v056/);
  assert.doesNotMatch(app,/localStorage\.setItem\('atlas-node-view'/);
  assert.doesNotMatch(css,/#node-list\[data-view=cards\]\{/);
});

test('avoids the unused Geist font and keeps the lightweight overview path',()=>{
  assert.doesNotMatch(css,/geist-sans\.woff2/);
  assert.doesNotMatch(css,/font-family:"Atlas Latin"/);
  assert.match(css,/JetBrainsMono-Regular\.woff2/);
  assert.match(app,/function scheduleOverviewSummary\(\)/);
  assert.match(app,/state\.page!=='overview'/);
});


test('removes hidden overview quality work and dead activity controls',()=>{
  const enhancements=fs.readFileSync('assets/enhancements.js','utf8');
  assert.doesNotMatch(html,/quality-panel|carrier-summary|availability-track|activity-kind/);
  assert.doesNotMatch(app,/carrier-summary|availability-track|activity-kind/);
  assert.doesNotMatch(app,/aggregateHistory/);
  assert.doesNotMatch(css,/\.quality-panel|#carrier-summary|#availability-track|\.carrier-line/);
  assert.match(enhancements,/dataset\.atlasEnhanced='true'/);
});
