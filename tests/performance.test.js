import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

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

test('avoids duplicate history serialization and recorder logic',()=>{
  const network=fs.readFileSync('assets/network.js','utf8');
  const core=fs.readFileSync('assets/network-core.js','utf8');
  const trends=fs.readFileSync('assets/node-trends.js','utf8');
  const enhancements=fs.readFileSync('assets/enhancements.js','utf8');

  assert.doesNotMatch(network,/c\.signature|const signature=JSON\.stringify/);
  assert.match(network,/historyChanged=row\.sourceKey!==sourceKey/);
  assert.doesNotMatch(core,/aggregateHistory/);
  assert.doesNotMatch(trends,/export function recordResources|\bobservations\b/);
  assert.doesNotMatch(app,/\n\s*(?:spark|pulse|gear):'/);
  assert.doesNotMatch(enhancements,/\n\s*(?:close|copy|chart):'/);
});

test('first paint keeps non-critical motion and mobile helpers off the critical path',()=>{
  const post=fs.readFileSync('assets/post-paint.js','utf8');
  assert.doesNotMatch(html,/rel="stylesheet" href="\/assets\/motion\.css/);
  assert.doesNotMatch(html,/src="\/assets\/motion\.js/);
  assert.doesNotMatch(html,/src="\/assets\/mobile-polish\.js/);
  assert.match(html,new RegExp(`src="/assets/post-paint\\.js\\?v=${pkg.version}"`));
  assert.match(post,/requestIdleCallback/);
  assert.match(post,/mobile\.matches\|\|reduced\.matches/);
  assert.ok(post.includes(`import('./motion.js?v=${pkg.version}')`));
  assert.ok(post.includes(`import('./mobile-polish.js?v=${pkg.version}')`));
});

test('browser title stays aligned with Atlas and the configured site title',()=>{
  const post=fs.readFileSync('assets/post-paint.js','utf8');
  assert.match(html,/<title>Atlas · Cloudflare Server Monitor<\/title>/);
  assert.match(post,/`Atlas · \$\{site\}`/);
  assert.match(post,/MutationObserver\(syncTitle\)/);
});

test('desktop table headings align with their real content blocks',()=>{
  assert.match(css,/\.node-columns>span:nth-child\(2\),\s*\.node-columns>span:nth-child\(8\)\{[\s\S]*?text-align:center!important/);
  assert.match(css,/\.node-pings\{[\s\S]*?justify-self:center!important;[\s\S]*?width:max-content!important;[\s\S]*?text-align:left!important/);
});

test('runtime stays same-origin and config title remains text-safe',()=>{
  const runtimeTags=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
  assert.ok(runtimeTags.every(url=>url.startsWith('/')||url.startsWith('./')),runtimeTags.join(', '));
  assert.match(app,/set\(\$\('#site-title'\),title\)/);
  assert.doesNotMatch(app,/#site-title[^;\n]*innerHTML/);
});
