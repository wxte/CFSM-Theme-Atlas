import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.19 refines table headers and shortens desktop quota bars',()=>{
  assert.match(html,/v0\.5\.19/);
  assert.match(css,/Atlas v0\.5\.19 quota\/title micro polish/);
  assert.match(css,/display:none!important;\n  }\n  \.transfer-cell>strong/);
  assert.match(css,/width:min\(100%,194px\)!important/);
  assert.match(css,/font-size:10\.35px!important/);
  assert.doesNotMatch(css,/Atlas v0\.5\.18 quota spacing \+ desktop\/mobile polish/);
});
