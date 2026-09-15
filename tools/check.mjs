import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

for(const dir of ['assets','tools']){
  if(!fs.existsSync(dir))continue;
  for(const file of fs.readdirSync(dir)){
    if(/\.(m?js)$/.test(file))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
  }
}

function checkCss(file){
  const css=fs.readFileSync(file,'utf8');
  let depth=0,quote='',comment=false;
  for(let i=0;i<css.length;i++){
    const ch=css[i],next=css[i+1];
    if(comment){if(ch==='*'&&next==='/'){comment=false;i++;}continue;}
    if(quote){if(ch==='\\'){i++;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&next==='*'){comment=true;i++;continue;}
    if(ch==='"'||ch==="'"){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth<0)throw new Error(file+' has an unexpected closing brace');}
  }
  if(comment||quote||depth!==0)throw new Error(file+' has an unbalanced block, string or comment');
}
for(const file of fs.readdirSync('assets').filter(name=>name.endsWith('.css')))checkCss(`assets/${file}`);

console.log('All runtime/tool JavaScript syntax checks and CSS structure checks passed.');
