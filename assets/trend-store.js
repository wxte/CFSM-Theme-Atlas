const storageKey='atlas-observations-v1';
export const observations=new Map(),selections=new Map();
const maxAge=86400000;
try{
 const data=JSON.parse(sessionStorage.getItem(storageKey)||'null');
 if(data?.version===1&&Date.now()-data.at<maxAge)for(const [id,value] of (data.nodes||[]).slice(-100)){
  if(typeof id!=='string'||!value||!Array.isArray(value.resources)||!Array.isArray(value.network))continue;
  observations.set(id,{resources:value.resources.filter(p=>Number.isFinite(p?.ts)&&p.ts>Date.now()-maxAge).slice(-60),network:value.network.filter(p=>Number.isFinite(p?.ts)&&p.ts>Date.now()-maxAge).slice(-60)});
 }
 const saved=JSON.parse(sessionStorage.getItem('atlas-selections-v1')||'[]');
 for(const [id,p] of saved.slice(-100))if(typeof id==='string'&&Number.isFinite(p?.ts))selections.set(id,p);
}catch{}
let timer;
export function flushObservations(){try{sessionStorage.setItem(storageKey,JSON.stringify({version:1,at:Date.now(),nodes:[...observations].slice(-100).map(([id,p])=>[id,{resources:p.resources,network:p.network}])}));sessionStorage.setItem('atlas-selections-v1',JSON.stringify([...selections].slice(-100)));}catch{}}
export function scheduleSave(){if(timer)return;timer=setTimeout(()=>{timer=null;flushObservations();},1000);}
export function nodeObservations(id){if(!observations.has(id))observations.set(id,{resources:[],network:[]});if(observations.size>100)observations.delete(observations.keys().next().value);return observations.get(id);}
if(typeof addEventListener!=='undefined')addEventListener('pagehide',flushObservations);
