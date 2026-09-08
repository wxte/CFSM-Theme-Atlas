import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');

test('v0.2.8 uses same-origin fonts only', () => {
  assert.doesNotMatch(html, /cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic/);
  assert.match(html, /assets\/vendor\/fonts\/atlas-ui-core\.woff2/);
  assert.match(html, /assets\/vendor\/fonts\/atlas-pixel-display\.woff2/);
  assert.match(css, /font-family:"Atlas UI"/);
  assert.match(css, /font-family:"Atlas Pixel Display"/);
  assert.match(css, /font-display:swap/);
});

test('font files referenced by CSS are present', () => {
  const files = [...css.matchAll(/url\("\.\/vendor\/fonts\/([^"?]+)"\)/g)].map(match => match[1]);
  assert.ok(files.length >= 3);
  for (const file of new Set(files)) assert.ok(fs.existsSync(path.join(root, 'assets/vendor/fonts', file)), file);
});
