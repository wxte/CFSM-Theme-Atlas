import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.18 refines quota spacing and desktop/mobile density',()=>{
  assert.match(html,/v0\.5\.18/);
  assert.match(css,/Atlas v0\.5\.18 quota spacing \+ desktop\/mobile polish/);
  assert.match(css,/minmax\(198px,1\.16fr\)/);
  assert.match(css,/padding-left:10px!important/);
  assert.match(css,/width:min\(100%,236px\)!important/);
  assert.match(css,/text-align:center!important/);
  assert.match(css,/height:5px!important/);
  assert.doesNotMatch(css,/Atlas v0\.5\.17 desktop \+ mobile refinement/);
});
