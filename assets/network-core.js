import {numeric,n} from './data.js?v=0.5.24';
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
 // Keep charts bounded to roughly 240 real samples at every range while
 // preserving the original timestamp/value of the newest report in each bucket.
 const bucketMs=Math.max(5000,Math.ceil(duration/240/5000)*5000),buckets=new Map();
 for(const p of [...exact.values()].sort((a,b)=>a.ts-b.ts)){
  const bucket=Math.floor(p.ts/bucketMs);if(!buckets.has(bucket))buckets.set(bucket,new Map());
  for(const key of historyLines){if(p[key]!==undefined)buckets.get(bucket).set(key,p);if(p.loss?.[key]!==undefined)buckets.get(bucket).set('loss.'+key,p);}
 }
 const projected=new Map();
 for(const bucket of buckets.values())for(const [field,p] of bucket){const ts=n(p.ts),point=projected.get(ts)||{ts};if(field.startsWith('loss.')){const key=field.slice(5);point.loss={...point.loss,[key]:p.loss[key]};}else point[field]=p[field];projected.set(ts,point);}
 return [...projected.values()].sort((a,b)=>a.ts-b.ts);
}
export function historyFromArrays(pings=[],losses=[]){const merged=new Map();for(const p of pings)if(numeric(p?.ts))merged.set(n(p.ts),{...p,ts:n(p.ts)});for(const p of losses)if(numeric(p?.ts)){const ts=n(p.ts);merged.set(ts,{...(merged.get(ts)||{ts}),loss:p});}return [...merged.values()];}
