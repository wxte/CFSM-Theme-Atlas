import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

for(const dir of ['assets','tools']){
  for(const file of fs.readdirSync(dir)){
    if(/\.(m?js)$/.test(file))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
  }
}

// The release cleanup vendor is temporary and removed after this patch.
// Runtime checks therefore use a dependency-free structural scanner.
const css=fs.readFileSync('assets/atlas.css','utf8');
let depth=0,quote='',comment=false;
for(let i=0;i<css.length;i++){
  const ch=css[i],next=css[i+1];
  if(comment){if(ch==='*'&&next==='/'){comment=false;i++;}continue;}
  if(quote){if(ch==='\\'){i++;continue;}if(ch===quote)quote='';continue;}
  if(ch==='/'&&next==='*'){comment=true;i++;continue;}
  if(ch==='"'||ch==="'"){quote=ch;continue;}
  if(ch==='{')depth++;
  else if(ch==='}'){depth--;if(depth<0)throw new Error('atlas.css has an unexpected closing brace');}
}
if(comment||quote||depth!==0)throw new Error('atlas.css has an unbalanced block, string or comment');

console.log('All runtime/tool JavaScript syntax checks and CSS structure checks passed.');
