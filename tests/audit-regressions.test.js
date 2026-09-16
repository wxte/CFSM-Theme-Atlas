import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {numeric,ping,coordinate} from '../assets/data.js';
import {destroyNodeTrends} from '../assets/node-trends.js';
import {windowSamples} from '../assets/network-core.js';
const app=fs.readFileSync('assets/app.js','utf8');
const section=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));

test('malformed metrics cannot become zero or one',()=>{
 for(const value of [true,false,[],[1],{},'   ',null,undefined,Infinity]){assert.equal(numeric(value),false);assert.equal(ping(value),value===false?'关闭':'—')}
 for(const value of [0,'0',1,' 2.5 '])assert.equal(numeric(value),true);
 assert.equal(coordinate({id:'a',region:'XX'},{locations:{a:[[],true]}}),null);
});

test('deferred globe rejects a failed load and permits a successful retry',async()=>{
 let attempts=0,inits=0;const source=fs.readFileSync('assets/lazy-map.js','utf8').replace('export class','class').replace(/import\('[^']+'\)/,'loadModule()');
 const context=vm.createContext({document:{readyState:'complete'},requestIdleCallback:fn=>fn(),loadModule:async()=>{if(++attempts===1)throw Error('offline');return {NodeMap:class{init(){inits++}}}}});
 const map=vm.runInContext(source+';new DeferredNodeMap(()=>{})',context);
 await assert.rejects(map.init(),/offline/);assert.equal(map.promise,null);assert.equal(map._initPromise,null);
 await map.init();assert.equal(attempts,2);assert.equal(inits,1);
});

test('failed network module import resets its promise for retry',async()=>{
 let attempts=0;
 const source=section('function ensureNetworkCharts(){','function renderNodeTrendsDeferred').replace(/import\('[^']+'\)/,'loadModule()');
 const ctx=vm.createContext({loadModule:async()=>{if(++attempts===1)throw Error('offline');return {NetworkCharts:class{}}}});
 vm.runInContext('let charts=null,networkChartsPromise=null;const chartState={live:true,rangeMs:300000};'+source,ctx);
 await assert.rejects(vm.runInContext('ensureNetworkCharts()',ctx),/offline/);
 const chart=await vm.runInContext('ensureNetworkCharts()',ctx);assert.equal(chart.live,true);assert.equal(attempts,2);
});

test('history failures preserve live data and equal timestamps merge partial fields',()=>{
 const now=Date.now(),server={id:'a'},historyResults=new Map(),state={page:'network',history:new Map([['a',[{ts:now,loss:{cu:10}}]]])};let histories;
 const ctx=vm.createContext({state,historyResults,chartState:{live:true,rangeMs:300000},charts:{update:(list,h)=>histories=h},all:()=>[server],allowed:()=>true,carriers:[],label:()=>'',set(){},$:()=>({}),loadNetworkHistory(){}});
 vm.runInContext(section('function renderNetwork(){','function renderAggregates()'),ctx);
 historyResults.set('a',{error:'offline',points:[]});vm.runInContext('renderNetwork()',ctx);assert.equal(histories.get('a')[0].loss.cu,10);
 historyResults.set('a',{points:[{ts:now,cu:42}]});vm.runInContext('renderNetwork()',ctx);
 const merged=windowSamples(histories.get('a'),now);assert.equal(merged[0].cu,42);assert.equal(merged[0].loss.cu,10);
});

test('removing node trends destroys every plot observer',()=>{
 let destroyed=0;destroyNodeTrends({querySelectorAll:()=>[{plot:{destroy(){destroyed++}}},{plot:{destroy(){destroyed++}}},{}]},'removed');assert.equal(destroyed,2);
});

test('age refresh skips hidden node tables but refreshes network aggregates',()=>{
 let tick,rows=0,updates=0,regions=0,aggregates=0;
 const state={ready:true,page:'network',status:'all',quick:'',sort:'default'};
 const ctx=vm.createContext({state,document:{hidden:false},setInterval:fn=>tick=fn,renderRows:()=>rows++,all:()=>[{}],updateRow:()=>updates++,renderRegions:()=>regions++,renderAggregates:()=>aggregates++});
 vm.runInContext(section('const age=setInterval','const watchdog='),ctx);tick();assert.deepEqual([rows,updates,regions,aggregates],[0,0,0,1]);
 state.page='nodes';tick();assert.deepEqual([rows,updates,regions,aggregates],[0,1,1,2]);state.sort='cpu';tick();assert.equal(rows,1);
});
