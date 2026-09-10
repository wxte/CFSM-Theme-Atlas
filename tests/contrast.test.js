import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/atlas.css',import.meta.url),'utf8');

function matchingBrace(text,open){
  let depth=1,quote=null;
  for(let i=open+1;i<text.length;i++){
    const c=text[i];
    if(quote){
      if(c==='\\')i++;
      else if(c===quote)quote=null;
      continue;
    }
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&!--depth)return i;
  }
  return -1;
}

function topLevelBlocks(text){
  const blocks=[];
  let i=0;
  while(i<text.length){
    while(i<text.length&&/\s/.test(text[i]))i++;
    if(i>=text.length)break;

    let quote=null,paren=0,bracket=0,open=-1,semicolon=-1;
    for(let j=i;j<text.length;j++){
      const c=text[j];
      if(quote){
        if(c==='\\')j++;
        else if(c===quote)quote=null;
        continue;
      }
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='(')paren++;
      else if(c===')')paren=Math.max(0,paren-1);
      else if(c==='[')bracket++;
      else if(c===']')bracket=Math.max(0,bracket-1);
      else if(!paren&&!bracket&&c==='{'){open=j;break;}
      else if(!paren&&!bracket&&c===';'){semicolon=j;break;}
    }

    if(semicolon>=0&&(open<0||semicolon<open)){
      i=semicolon+1;
      continue;
    }
    if(open<0)break;

    const close=matchingBrace(text,open);
    if(close<0)throw new Error('Unbalanced CSS block');
    blocks.push({selector:text.slice(i,open).trim(),body:text.slice(open+1,close)});
    i=close+1;
  }
  return blocks;
}

const blocks=topLevelBlocks(css);

function selectorVars(selector){
  const vars={};
  for(const block of blocks){
    if(block.selector!==selector)continue;
    for(const match of block.body.matchAll(/--([\w-]+)\s*:\s*([^;}{]+)/g)){
      vars[match[1]]=match[2].trim();
    }
  }
  return vars;
}

function resolve(value,vars,depth=0){
  if(depth>16)throw new Error('CSS variable recursion is too deep');
  if(typeof value!=='string')throw new TypeError('Missing CSS variable');
  const trimmed=value.trim();
  const match=trimmed.match(/^var\(\s*--([\w-]+)(?:\s*,\s*([^)]+))?\s*\)$/);
  if(!match)return trimmed;
  const next=vars[match[1]]??match[2];
  return resolve(next,vars,depth+1);
}

function rgb(value,vars,base=[255,255,255]){
  value=resolve(value,vars);

  let match=value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if(match){
    let hex=match[1];
    if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
    return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
  }

  match=value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if(match){
    const fg=[Number(match[1]),Number(match[2]),Number(match[3])];
    const alpha=match[4]===undefined?1:Number(match[4]);
    return fg.map((v,i)=>v*alpha+base[i]*(1-alpha));
  }

  throw new TypeError('Unsupported CSS color: '+value);
}

function luminance(color){
  return color.map(v=>v/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
    .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
}

function contrast(a,b){
  const values=[luminance(a),luminance(b)].sort((x,y)=>x-y);
  return (values[1]+.05)/(values[0]+.05);
}

test('small text palette meets 4.5:1 on both theme surfaces',()=>{
  const light=selectorVars(':root');
  const dark={...light,...selectorVars('html[data-theme=dark]')};

  for(const [theme,vars] of [['light',light],['dark',dark]]){
    const surfaces={
      bg:rgb(vars.bg,vars),
      panel:rgb(vars.panel,vars),
      soft:rgb(vars.soft,vars)
    };
    surfaces.tint=rgb(vars.tint,vars,surfaces.panel);

    for(const foreground of ['text','muted','accent','down','purple','bad','warn']){
      const fg=rgb(vars[foreground],vars);
      for(const [surfaceName,bg] of Object.entries(surfaces)){
        assert.ok(
          contrast(fg,bg)>=4.5,
          `${theme}: ${foreground} on ${surfaceName}`
        );
      }
    }
  }
});
