import {numeric,n} from './data.js?v=0.3.6';
import {nodeObservations,scheduleSave} from './trend-store.js?v=0.3.6';
const keys=['cpu','net_in_speed','net_out_speed'];
export function recordResources(id,ts,metrics){
 if(!numeric(ts)||!metrics||!keys.some(k=>Object.hasOwn(metrics,k)))return;
 const state=nodeObservations(id),points=state.resources;
 if(points.length&&ts<points.at(-1).ts)return;
 const point={ts:Number(ts)};
 for(const k of keys)if(Object.hasOwn(metrics,k))point[k]=numeric(metrics[k])&&n(metrics[k])>=0?n(metrics[k]):null;
 if(points.at(-1)?.ts===point.ts&&Object.keys(point).every(k=>points.at(-1)[k]===point[k]))return;
 if(points.at(-1)?.ts===point.ts)Object.assign(points.at(-1),point);else points.push(point);
 state.resources=points.slice(-60);state.resourceVersion=(state.resourceVersion||0)+1;scheduleSave();
}
