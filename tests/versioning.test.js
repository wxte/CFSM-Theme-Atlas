import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const version=pkg.version;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('release version and runtime cache keys stay in sync',()=>{
  assert.ok(html.includes('theme-version" content="Atlas v'+version+'"'));
  assert.ok(html.includes('/assets/atlas.css?v='+version));
  assert.ok(html.includes('/assets/app.js?v='+version));

  const files=fs.readdirSync(path.join(root,'assets'))
    .filter(name=>name.endsWith('.js'))
    .map(name=>path.join(root,'assets',name));

  const seen=[];
  for(const file of files){
    const source=fs.readFileSync(file,'utf8');
    for(const match of source.matchAll(/[\'"](?:\.\/|\/assets\/)[^\'"]+\?v=(\d+\.\d+\.\d+)[\'"]/g)){
      seen.push([path.basename(file),match[1]]);
    }
  }
  assert.ok(seen.length>0,'expected versioned local module imports');
  for(const [file,value] of seen)assert.equal(value,pkg.version,file+' has stale ?v='+value);
});
