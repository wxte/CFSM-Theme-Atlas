import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/style.css',import.meta.url),'utf8');
const luminance=hex=>hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
test('small text palette meets 4.5:1 on both theme surfaces',()=>{
 for(const selector of [':root','html[data-theme=dark]']){
  const block=css.slice(css.indexOf(selector)).split('}')[0];
  const vars=Object.fromEntries([...block.matchAll(/--([\w-]+):#([0-9a-f]{3,6})/g)].map(([,k,v])=>[k,v.length===3?v.split('').map(c=>c+c).join(''):v]));
  for(const foreground of ['text','muted','accent','down','purple','bad','warn'])for(const surface of ['bg','panel','soft','tint']){
   const values=[luminance(vars[foreground]),luminance(vars[surface])].sort((a,b)=>a-b);
   assert.ok((values[1]+.05)/(values[0]+.05)>=4.5,`${foreground} on ${surface}`);
  }
 }
});
