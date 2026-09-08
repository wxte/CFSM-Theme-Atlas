import {numeric,n,online,percent} from './data.js?v=0.2.6';

export function resourceLevels(server){
 return {CPU:numeric(server.cpu)&&n(server.cpu)>=0?n(server.cpu):null,RAM:percent(server.ram_used,server.ram_total),DISK:percent(server.disk_used,server.disk_total)};
}
export function highLoad(server,now=Date.now()){
 return online(server,now)&&Object.values(resourceLevels(server)).some(v=>numeric(v)&&v>=85);
}
export function expiryDays(value,now=Date.now()){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d),today=new Date(now);
 if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)return null;
 return Math.round((Date.UTC(y,m-1,d)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
}
export function expiring(server,now=Date.now()){
 const days=expiryDays(server.expire_date,now);return days!==null&&days<=14;
}

// Each cell contains actual observations, not a promise of continuous uptime.
// Dense live histories group adjacent samples; the worst observed state survives.
export function sampleGroups(samples,key,now=Date.now()){
 const points=samples.filter(p=>numeric(p.ts)&&p.ts>=now-7200000&&p.ts<=now&&(p[key]!==undefined||p.loss?.[key]!==undefined)).sort((a,b)=>a.ts-b.ts);
 const count=Math.min(24,points.length),buckets=Array.from({length:count},()=>({state:'unknown',samples:[],maxPing:null,maxLoss:null,partial:false}));
 points.forEach((p,i)=>buckets[Math.floor(i*count/points.length)].samples.push(p));
 for(const b of buckets){
  b.start=b.samples[0].ts;b.end=b.samples.at(-1).ts;
  let rank=0;
  for(const p of b.samples){
   const latency=numeric(p[key])&&n(p[key])>=0?n(p[key]):null,packetLoss=numeric(p.loss?.[key])&&n(p.loss[key])>=0?n(p.loss[key]):null;
   if(latency!==null&&latency>=0)b.maxPing=Math.max(b.maxPing??0,latency);
   if(packetLoss!==null)b.maxLoss=Math.max(b.maxLoss??0,packetLoss);
   const severity=packetLoss>=100?3:latency>=200||packetLoss>0?2:latency!==null&&packetLoss!==null?1:0;
   if(severity===0)b.partial=true;
   rank=Math.max(rank,severity);
  }
  b.state=rank===3?'failed':rank===2?'warning':rank===1&&!b.partial?'healthy':'unknown';
 }
 return buckets;
}

export class ActivityObserver{
 constructor(){this.previous=new Map();}
 scan(servers,now=Date.now()){
  const events=[],keep=new Set();
  for(const s of servers){
   keep.add(s.id);const live=online(s,now),prev=this.previous.get(s.id),health={};
   const emit=(kind,message)=>events.push({kind,message,node:s.name||'未命名节点',ts:now});
   if(prev&&prev.live!==live)emit(live?'recovery':'offline',live?'恢复在线':'已离线');
   if(live){
    for(const [name,value] of Object.entries(resourceLevels(s))){
     const before=prev?.live?prev.health[name]:undefined;
     health[name]=numeric(value)?value>=85?true:value<80?false:before:before;
     if(before===false&&health[name]===true)emit('warning',`${name} 占用升至 ${value.toFixed(1)}%（≥85%）`);
     if(before===true&&health[name]===false)emit('recovery',`${name} 占用恢复至 ${value.toFixed(1)}%（<80%）`);
    }
    for(const [key,name] of [['cu','联通'],['ct','电信'],['cm','移动']]){
     const latency=s['ping_'+key],packetLoss=s['loss_'+key],before=prev?.live?prev.health[key]:undefined;
     const bad=(numeric(latency)&&n(latency)>=200)||(numeric(packetLoss)&&n(packetLoss)>0);
     const good=numeric(latency)&&n(latency)>=0&&n(latency)<180&&numeric(packetLoss)&&n(packetLoss)===0;
     health[key]=bad?true:good?false:before;
     if(before===false&&health[key]===true)emit('warning',`${name} 网络异常（延迟 ${numeric(latency)&&n(latency)>=0?Math.round(n(latency))+' ms':'未知'} / 丢包 ${numeric(packetLoss)&&n(packetLoss)>=0?n(packetLoss)+'%':'未知'}）`);
     if(before===true&&health[key]===false)emit('recovery',`${name} 网络恢复（${Math.round(n(latency))} ms / 丢包 0%）`);
    }
   }
   this.previous.set(s.id,{live,health});
  }
  for(const id of this.previous.keys())if(!keep.has(id))this.previous.delete(id);
  return events;
 }
}
