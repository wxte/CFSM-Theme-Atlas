import {numeric,n} from './data.js?v=0.3.6';
const historyLines=['cu','ct','cm','bd'],windowMs=7200000;
const valid=v=>numeric(v)&&n(v)>=0;
export function windowSamples(samples,now=Date.now(),duration=windowMs){
 const exact=new Map();
 for(const p of samples){
  if(!numeric(p?.ts)||p.ts<now-duration||p.ts>now+5000)continue;
  const ts=n(p.ts),old=exact.get(ts);if(!old){exact.set(ts,p);continue;}
  const merged={...old,ts};
  for(const key of historyLines){if(p[key]!==undefined)merged[key]=p[key];if(p.loss?.[key]!==undefined)merged.loss={...merged.loss,[key]:p.loss[key]};}
  exact.set(ts,merged);
 }
 const bucketMs=duration<=7200000?5000:30000,buckets=new Map();
 for(const p of [...exact.values()].sort((a,b)=>a.ts-b.ts)){
  const bucket=Math.floor(p.ts/bucketMs);if(!buckets.has(bucket))buckets.set(bucket,new Map());
  for(const key of historyLines){if(p[key]!==undefined)buckets.get(bucket).set(key,p);if(p.loss?.[key]!==undefined)buckets.get(bucket).set('loss.'+key,p);}
 }
 const projected=new Map();
 for(const bucket of buckets.values())for(const [field,p] of bucket){const ts=n(p.ts),point=projected.get(ts)||{ts};if(field.startsWith('loss.')){const key=field.slice(5);point.loss={...point.loss,[key]:p.loss[key]};}else point[field]=p[field];projected.set(ts,point);}
 return [...projected.values()].sort((a,b)=>a.ts-b.ts);
}
export function historyFromArrays(pings=[],losses=[]){const merged=new Map();for(const p of pings)if(numeric(p?.ts))merged.set(n(p.ts),{...p,ts:n(p.ts)});for(const p of losses)if(numeric(p?.ts)){const ts=n(p.ts);merged.set(ts,{...(merged.get(ts)||{ts}),loss:p});}return [...merged.values()];}
export function aggregateHistory(ids,histories,key,now=Date.now()){
 const buckets=new Map(),sources=new Set(),start=now-windowMs;
 for(const id of ids)for(const p of histories.get(id)||[]){if(p.ts<start||p.ts>now||!valid(p[key]))continue;const bucket=Math.floor((p.ts-start)/360000);if(!buckets.has(bucket))buckets.set(bucket,new Map());const byNode=buckets.get(bucket),values=byNode.get(id)||[];values.push(p);byNode.set(id,values);sources.add(id);}
 const points=[...buckets].sort((a,b)=>a[0]-b[0]).map(([bucket,byNode])=>{const nodes=[...byNode.values()];return {bucket,ts:nodes.reduce((sum,ps)=>sum+ps.reduce((v,p)=>v+n(p.ts),0)/ps.length,0)/nodes.length,value:nodes.reduce((sum,ps)=>sum+ps.reduce((v,p)=>v+n(p[key]),0)/ps.length,0)/nodes.length,count:nodes.length};});
 return {points,sources:sources.size};
}
