import {numeric,n} from './data.js?v=0.4.1';
export const historyRanges=[1,2,6,24,168];
export function parseHistory(rows,now=Date.now(),hours=24){
 if(!Array.isArray(rows))throw Error('历史数据格式不正确');
 const exact=new Map();
 for(const row of rows){
  if(!numeric(row?.timestamp)||n(row.timestamp)<now-hours*3600000||n(row.timestamp)>now+5000)continue;
  const point={ts:n(row.timestamp),loss:{}};
  for(const key of ['cu','ct','cm','bd']){point[key]=row['ping_'+key];point.loss[key]=row['loss_'+key];}
  exact.set(point.ts,point);
 }
 return [...exact.values()].sort((a,b)=>a.ts-b.ts);
}
// Fetch only a visible network page, at most three requests at once. No disk cache of authenticated history.
export class HistoryAPI{
 constructor(fetcher=(...args)=>globalThis.fetch(...args)){this.fetcher=fetcher;this.cache=new Map();this.pending=new Map();this.active=0;this.queue=[];this.auth=null;}
 async get(id,hours){
  if(!historyRanges.includes(hours))throw Error('不支持的历史范围');
  let token='';try{token=localStorage.getItem('jwt_token')||'';}catch{}
  if(token!==this.auth){this.cache.clear();this.auth=token;}
  const key=id+':'+hours+':'+token,old=this.cache.get(key);
  if(old&&Date.now()-old.at<300000)return old;
  if(this.pending.has(key))return this.pending.get(key);
  const task=new Promise((resolve)=>{this.queue.push(async()=>{
   let result;
   try{
    const headers={Accept:'application/json'};if(token)headers.Authorization='Bearer '+token;
    const response=await this.fetcher(`/api/history/all?id=${encodeURIComponent(id)}&hours=${hours===2?6:hours}`,{headers,credentials:'same-origin',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(response.status===401||response.status===403?(hours>24?'7 天历史需要登录 CFSM 后台':'历史访问需要登录'): `历史读取失败（${response.status}），稍后重试`);
    result={points:parseHistory(await response.json(),Date.now(),hours),error:'',at:Date.now()};
   }catch(error){result={points:[],error:error.message||'历史读取失败',at:Date.now()};}
   this.cache.set(key,result);if(this.cache.size>200)this.cache.delete(this.cache.keys().next().value);
   resolve(result);
  });this.pump();}).finally(()=>this.pending.delete(key));
  this.pending.set(key,task);return task;
 }
 pump(){while(this.active<3&&this.queue.length){this.active++;this.queue.shift()().finally(()=>{this.active--;this.pump();});}}
}

